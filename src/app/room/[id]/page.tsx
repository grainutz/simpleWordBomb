"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidWord, getPromptByDifficulty } from '@/lib/gameUtils';
import { supabase } from '@/lib/supabase';

export default function GameRoom() {
  const { id: roomId } = useParams();
  const [myRole, setMyRole] = useState<number | null>(null);
  
  // Real-time states
  const [remoteInput, setRemoteInput] = useState(""); 
  const [presence, setPresence] = useState({ p1: false, p2: false });
  const channelRef = useRef<any>(null);
  const [isPaused, setIsPaused] = useState(false);

  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timer, setTimer] = useState(10);
  const [turn, setTurn] = useState(1);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'error' | null>(null);
  const [players, setPlayers] = useState([{ id: 1, lives: 3 }, { id: 2, lives: 3 }]);

  // Potato Theme Visuals
  const potatoColor = timer > 5 ? '#D7CCC8' : timer > 2 ? '#FFAB91' : '#FF5252';
  const potatoScale = timer > 5 ? 1 : timer > 2 ? 1.1 : 1.2;
  
  const [gameConfig, setGameConfig] = useState({
    maxLives: 3,
    duration: 10,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    isStarted: false
  });

  // Real-time Logic
  useEffect(() => {
    if (!roomId) return;

    const fetchInitial = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) syncState(data);
    };
    fetchInitial();

    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myRole?.toString() || 'spectator' } }
    });
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, 
        (payload) => syncState(payload.new))
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.role !== myRole) setRemoteInput(payload.text);
      })
      .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
        if (myRole !== turn) setTimer(payload.timer);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresence({ p1: !!state['1'], p2: !!state['2'] });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && myRole) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [roomId, myRole, turn]);

  const syncState = (data: any) => {
    setPrompt(data.prompt);
    setTurn(data.current_turn);
    setUsedWords(data.used_words || []);
    setPlayers([{ id: 1, lives: data.p1_lives }, { id: 2, lives: data.p2_lives }]);
    setIsPaused(data.is_paused);
    setGameConfig({
      maxLives: data.max_lives,
      duration: data.bomb_duration,
      difficulty: data.difficulty,
      isStarted: data.is_started
    });
    if (data.is_started) setTimer(data.bomb_duration);
    setRemoteInput(""); 
  };

  const togglePause = async () => {
  if (myRole !== 1) return;
  await supabase.from('rooms').update({ is_paused: !isPaused }).eq('id', roomId);
};

  // Timer logic
  useEffect(() => {
  // Add !isPaused to the guard clause
  if (!gameConfig.isStarted || isPaused || myRole !== turn || players[0].lives <= 0 || players[1].lives <= 0) return;

  if (timer > 0) {
    const t = setTimeout(() => {
      const nextTime = timer - 1;
      setTimer(nextTime);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: { timer: nextTime }
      });
    }, 1000);
    return () => clearTimeout(t);
  } else {
    handleTimeout();
  }
}, [timer, turn, myRole, gameConfig.isStarted, isPaused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { text: val, role: myRole }
    });
  };

  const handleTimeout = async () => {
    const isP1 = turn === 1;
    await supabase.from('rooms').update({
      p1_lives: isP1 ? players[0].lives - 1 : players[0].lives,
      p2_lives: !isP1 ? players[1].lives - 1 : players[1].lives,
      current_turn: turn === 1 ? 2 : 1,
      prompt: getPromptByDifficulty(gameConfig.difficulty),
    }).eq('id', roomId);
  };

  const updateConfig = async (key: string, value: any) => {
    if (myRole !== 1) return; 
    await supabase.from('rooms').update({ [key]: value }).eq('id', roomId);
  };

  const startGame = async () => {
    await supabase.from('rooms').update({ 
      is_started: true,
      p1_lives: gameConfig.maxLives,
      p2_lives: gameConfig.maxLives,
      prompt: getPromptByDifficulty(gameConfig.difficulty),
      used_words: []
    }).eq('id', roomId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myRole !== turn || !gameConfig.isStarted) return;

    const cleanInput = input.toUpperCase().trim();
    if (isValidWord(cleanInput, prompt) && !usedWords.includes(cleanInput)) {
      setFeedback('correct');
      await supabase.from('rooms').update({
        prompt: getPromptByDifficulty(gameConfig.difficulty),
        current_turn: turn === 1 ? 2 : 1,
        used_words: [cleanInput, ...usedWords],
      }).eq('id', roomId);
      setInput("");
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { text: "", role: myRole } });
    } else {
      setFeedback('error');
    }
    setTimeout(() => setFeedback(null), 400);
  };

  // --- UI RENDER BLOCKS ---

  if (!myRole) return (
    <div className="min-h-screen bg-[#FFF8E1] flex flex-col items-center justify-center gap-8">
      <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-9xl">🥔</motion.div>
      <h2 className="text-[#5D4037] text-4xl font-black italic tracking-tighter uppercase">Pick a Side!</h2>
      <div className="flex gap-6">
        <button onClick={() => setMyRole(1)} className="px-10 py-6 bg-white text-[#5D4037] border-4 border-[#5D4037] rounded-2xl font-black text-xl shadow-[0_8px_0_#5D4037] hover:translate-y-1 hover:shadow-[0_4px_0_#5D4037] active:translate-y-2 active:shadow-none transition-all">CHEF 1 (HOST)</button>
        <button onClick={() => setMyRole(2)} className="px-10 py-6 bg-white text-[#5D4037] border-4 border-[#5D4037] rounded-2xl font-black text-xl shadow-[0_8px_0_#5D4037] hover:translate-y-1 hover:shadow-[0_4px_0_#5D4037] active:translate-y-2 active:shadow-none transition-all">CHEF 2 (GUEST)</button>
      </div>
    </div>
  );

  if (!gameConfig.isStarted) {
    return (
      <div className="min-h-screen bg-[#FFF8E1] p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-[40px] border-8 border-[#5D4037] shadow-2xl relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-4">
            {[1, 2].map(n => (
              <div key={n} className={`w-6 h-6 rounded-full border-4 border-[#5D4037] ${presence[`p${n}` as keyof typeof presence] ? 'bg-green-400' : 'bg-zinc-200'}`} />
            ))}
          </div>

          <h2 className="text-4xl font-black mb-8 text-[#5D4037] italic tracking-tighter text-center">KITCHEN SETTINGS</h2>
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-xs text-[#8D6E63] font-black uppercase tracking-widest">Lives: {gameConfig.maxLives} Potatoes</label>
              <input type="range" min="1" max="5" value={gameConfig.maxLives} disabled={myRole !== 1} onChange={(e) => updateConfig('max_lives', parseInt(e.target.value))} className="w-full accent-[#FF7043]" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-[#8D6E63] font-black uppercase tracking-widest">Heat Timer: {gameConfig.duration}s</label>
              <input type="range" min="5" max="30" step="5" value={gameConfig.duration} disabled={myRole !== 1} onChange={(e) => updateConfig('bomb_duration', parseInt(e.target.value))} className="w-full accent-[#FF7043]" />
            </div>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} onClick={() => updateConfig('difficulty', d)} disabled={myRole !== 1} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-4 transition-all ${gameConfig.difficulty === d ? 'bg-[#5D4037] text-white border-[#5D4037]' : 'border-zinc-100 text-[#8D6E63]'}`}>{d}</button>
              ))}
            </div>
            
            <div className="pt-6 border-t-4 border-dashed border-zinc-100">
              <div className="flex bg-[#FFF8E1] p-4 rounded-2xl border-4 border-[#5D4037] items-center justify-between">
                <code className="text-[#FF7043] font-black text-2xl">{roomId}</code>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Copied!"); }} className="text-xs bg-[#5D4037] text-white px-4 py-2 rounded-lg font-black">COPY LINK</button>
              </div>
            </div>

            {myRole === 1 ? (
              <button onClick={startGame} className="w-full py-5 bg-[#FF7043] text-white rounded-2xl font-black text-2xl uppercase shadow-[0_8px_0_#BF360C] hover:translate-y-1 hover:shadow-[0_4px_0_#BF360C] active:translate-y-2 active:shadow-none transition-all">START COOKING!</button>
            ) : (
              <p className="text-center text-[#8D6E63] font-bold italic animate-pulse">Wait for Chef 1 to start...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isGameOver = players[0].lives <= 0 || players[1].lives <= 0;
  const winner = players[0].lives > 0 ? 1 : 2;

  return (
    <main className="min-h-screen bg-[#FFF8E1] text-[#5D4037] flex flex-col items-center justify-between py-12 px-4 overflow-hidden relative">
      
      {/* Player Stats */}
      <div className="w-full max-w-2xl flex justify-between items-start px-4">
        {[1, 2].map((num) => (
          <div key={num} className={`flex flex-col ${num === 2 ? 'items-end' : 'items-start'} ${turn === num ? 'scale-110' : 'opacity-40'} transition-all`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${presence[`p${num}` as keyof typeof presence] ? 'bg-green-500' : 'bg-red-400'}`} />
              <p className="font-black uppercase text-xs tracking-tighter">Chef {num} {myRole === num && "(YOU)"}</p>
            </div>
            <div className="flex gap-1">
              {[...Array(gameConfig.maxLives)].map((_, j) => (
                <span key={j} className={`text-2xl ${j < players[num-1].lives ? 'grayscale-0' : 'grayscale opacity-20'}`}>🥔</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
  {isPaused && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#FFF8E1]/80 backdrop-blur-md flex flex-col items-center justify-center"
    >
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white border-8 border-[#5D4037] p-10 rounded-[40px] shadow-2xl text-center"
      >
        <h2 className="text-5xl font-black text-[#5D4037] mb-6 italic uppercase">Kitchen Break!</h2>
        <p className="text-[#8D6E63] font-bold mb-8 uppercase tracking-widest">The potato is resting...</p>
        
        {myRole === 1 ? (
          <button 
            onClick={togglePause}
            className="px-10 py-4 bg-[#FF7043] text-white font-black rounded-2xl shadow-[0_6px_0_#BF360C] active:translate-y-1 active:shadow-none uppercase"
          >
            Resume Cooking
          </button>
        ) : (
          <div className="animate-pulse text-[#FF7043] font-black uppercase underline decoration-4">
            Waiting for Host to Resume
          </div>
        )}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>

{/* Floating Pause Button for Host */}
{gameConfig.isStarted && !isGameOver && myRole === 1 && (
  <button 
    onClick={togglePause}
    className="fixed top-8 right-8 w-14 h-14 bg-white border-4 border-[#5D4037] rounded-full flex items-center justify-center text-2xl shadow-[0_4px_0_#5D4037] active:translate-y-1 active:shadow-none z-40"
  >
    {isPaused ? "▶️" : "⏸️"}
  </button>
)}

      {/* Main Gameplay Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <AnimatePresence mode="wait">
          {isGameOver ? (
            <motion.div initial={{ y: -500 }} animate={{ y: 0 }} className="text-center bg-white p-12 rounded-[40px] shadow-2xl border-8 border-[#5D4037]">
              <h2 className="text-6xl font-black mb-4 uppercase italic">MASHED!</h2>
              <p className="text-xl font-bold text-[#8D6E63] mb-8 uppercase">Chef {winner} wins the round!</p>
              {myRole === 1 && (
                <button onClick={() => updateConfig('is_started', false)} className="px-10 py-5 bg-[#FF7043] text-white font-black rounded-2xl text-xl shadow-[0_6px_0_#BF360C] active:translate-y-1">PLAY AGAIN</button>
              )}
            </motion.div>
          ) : (
            <div className="relative flex flex-col items-center">
              {/* The Potato Physical Representation */}
              <motion.div
                animate={{ 
                  x: turn === 1 ? -120 : 120, 
                  rotate: timer <= 3 ? [0, -10, 10, -10, 10, 0] : [0, 5, -5, 0],
                  scale: potatoScale
                }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
                className="relative"
              >
                {timer <= 3 && (
                  <motion.div animate={{ y: -60, opacity: 0 }} transition={{ repeat: Infinity, duration: 0.6 }} className="absolute -top-10 left-1/2 text-4xl">💨</motion.div>
                )}
                
                <div style={{ backgroundColor: potatoColor }} className={`w-56 h-64 rounded-[110px_110px_90px_90px] border-8 border-[#5D4037] flex flex-col items-center justify-center transition-colors duration-500 shadow-2xl relative`}>
                   {/* Potato Face */}
                  <div className="flex gap-6 mb-4">
                    <div className="w-4 h-4 bg-[#5D4037] rounded-full" />
                    <div className="w-4 h-4 bg-[#5D4037] rounded-full" />
                  </div>
                  <div className={`w-12 h-6 border-b-8 border-[#5D4037] rounded-full ${timer <= 3 ? 'h-10 bg-[#5D4037] rounded-lg' : ''}`} />
                  
                  <h1 className="text-6xl font-black mt-6 tracking-tighter uppercase">{prompt}</h1>

                  {/* Timer Badge */}
                  <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#5D4037] text-white rounded-full flex items-center justify-center text-3xl font-black border-4 border-white shadow-xl">
                    {timer}
                  </div>
                </div>
              </motion.div>

              {/* Input Zone */}
              <div className="mt-24 flex flex-col items-center">
                <div className="h-10 mb-2 font-black text-[#FF7043] text-2xl italic uppercase">
                  {turn !== myRole && remoteInput}
                </div>
                <form onSubmit={handleSubmit}>
                  <input 
                    autoFocus value={input} 
                    onChange={handleInputChange}
                    disabled={myRole !== turn}
                    placeholder={myRole === turn ? "HURRY!" : "WATCHING..."}
                    className="bg-white border-8 border-[#5D4037] rounded-[30px] px-10 py-6 text-4xl font-black text-center uppercase focus:outline-none focus:ring-8 focus:ring-[#FF7043]/20 w-96 shadow-2xl placeholder:opacity-20 transition-all"
                  />
                </form>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Ticker for used words */}
      <div className="w-full flex justify-center gap-4 h-12">
        <AnimatePresence>
          {usedWords.slice(0, 4).map((w, i) => (
            <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} key={w} className="bg-white px-6 py-2 rounded-full text-xs font-black uppercase border-4 border-[#5D4037] h-fit">
              {w}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Disconnect Alert */}
      <AnimatePresence>
        {(!presence.p1 || !presence.p2) && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 bg-[#5D4037] text-white px-8 py-4 rounded-full font-black text-xs tracking-widest uppercase">
            Searching for Chef {!presence.p1 ? '1' : '2'}... 🧑‍🍳
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}