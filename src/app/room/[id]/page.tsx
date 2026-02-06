"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidWord, getPromptByDifficulty } from '@/lib/gameUtils';
import { supabase } from '@/lib/supabase';

export default function GameRoom() {
  const { id: roomId } = useParams();
  const [myRole, setMyRole] = useState<number | null>(null);
  
  // real time states
  const [remoteInput, setRemoteInput] = useState(""); 
  const [presence, setPresence] = useState({ p1: false, p2: false });
  const channelRef = useRef<any>(null);

  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timer, setTimer] = useState(10);
  const [turn, setTurn] = useState(1);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'error' | null>(null);
  const [players, setPlayers] = useState([{ id: 1, lives: 3 }, { id: 2, lives: 3 }]);
  
  const [gameConfig, setGameConfig] = useState({
    maxLives: 3,
    duration: 10,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    isStarted: false
  });

  // real time
  useEffect(() => {
    if (!roomId) return;

    // fetchInitial state from DB
    const fetchInitial = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) syncState(data);
    };
    fetchInitial();

    // channel for broadcast and presence
    const channel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: myRole?.toString() || 'spectator' } }
    });
    channelRef.current = channel;

    channel
      // DB updates (turn changes, prompt changes)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, 
        (payload) => syncState(payload.new))
      
      // live typing
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.role !== myRole) setRemoteInput(payload.text);
      })

      // timer sync
      .on('broadcast', { event: 'timer_sync' }, ({ payload }) => {
        
        if (myRole !== turn) setTimer(payload.timer);
      })

      // presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPresence({
          p1: !!state['1'],
          p2: !!state['2']
        });
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
    setGameConfig({
      maxLives: data.max_lives,
      duration: data.bomb_duration,
      difficulty: data.difficulty,
      isStarted: data.is_started
    });
    if (data.is_started) setTimer(data.bomb_duration);
    setRemoteInput(""); 
  };

  // timer authority: only the player whose turn it is will run the timer logic to prevent desync
  useEffect(() => {
    if (!gameConfig.isStarted || myRole !== turn || players[0].lives <= 0 || players[1].lives <= 0) return;

    if (timer > 0) {
      const t = setTimeout(() => {
        const nextTime = timer - 1;
        setTimer(nextTime);
        
        // broadcast my local timer to the opponent
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
  }, [timer, turn, myRole, gameConfig.isStarted]);

  
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


  if (!myRole) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <h2 className="text-white text-2xl font-bold tracking-tighter italic">CHOOSE YOUR SIDE</h2>
      <div className="flex gap-4">
        <button onClick={() => setMyRole(1)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black transition-all">Player 1 (Host)</button>
        <button onClick={() => setMyRole(2)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black transition-all">Player 2</button>
      </div>
    </div>
  );

  if (!gameConfig.isStarted) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl relative">
          {/* Presence Indicator in Lobby */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-2">
            {[1, 2].map(n => (
              <div key={n} className={`w-3 h-3 rounded-full border-2 border-black ${presence[`p${n}` as keyof typeof presence] ? 'bg-green-500 shadow-[0_0_10px_green]' : 'bg-zinc-800'}`} />
            ))}
          </div>

          <h2 className="text-3xl font-black mb-6 italic tracking-tighter">ROOM SETTINGS</h2>
          <div className="space-y-6">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Lives: {gameConfig.maxLives}</label>
              <input type="range" min="1" max="5" value={gameConfig.maxLives} disabled={myRole !== 1} onChange={(e) => updateConfig('max_lives', parseInt(e.target.value))} className="w-full accent-red-600 mt-2" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Bomb Timer: {gameConfig.duration}s</label>
              <input type="range" min="5" max="30" step="5" value={gameConfig.duration} disabled={myRole !== 1} onChange={(e) => updateConfig('bomb_duration', parseInt(e.target.value))} className="w-full accent-red-600 mt-2" />
            </div>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button key={d} onClick={() => updateConfig('difficulty', d)} disabled={myRole !== 1} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${gameConfig.difficulty === d ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}>{d}</button>
              ))}
            </div>
            <div className="pt-6 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2 italic">Waiting for Opponent...</p>
              <div className="flex bg-black p-3 rounded-xl border border-zinc-800 items-center justify-between">
                <code className="text-red-500 font-mono text-xl">{roomId}</code>
                <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Copied!"); }} className="text-[10px] bg-zinc-800 px-3 py-1 rounded-md uppercase font-bold">Copy Link</button>
              </div>
            </div>
            {myRole === 1 ? (
              <button onClick={startGame} className="w-full py-4 bg-red-600 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20">Start Game</button>
            ) : (
              <p className="text-center text-zinc-500 italic text-sm animate-pulse">Wait for host to begin...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isGameOver = players[0].lives <= 0 || players[1].lives <= 0;
  const winner = players[0].lives > 0 ? 1 : 2;

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between py-16 px-4">
      {/* HUD with Live Presence */}
      <div className="w-full max-w-xl flex justify-between px-8">
        {[1, 2].map(num => (
          <div key={num} className={turn === num ? "opacity-100" : "opacity-30 transition-opacity"}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${presence[`p${num}` as keyof typeof presence] ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-900'}`} />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">P{num} {myRole === num && "(YOU)"}</p>
            </div>
            <div className="flex gap-1">
              {[...Array(gameConfig.maxLives)].map((_, j) => (
                <div key={j} className={`w-6 h-2 rounded-full ${j < players[num-1].lives ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center w-full">
        {isGameOver ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <h2 className="text-6xl font-black italic tracking-tighter text-red-600 mb-6 drop-shadow-2xl">PLAYER {winner} WINS</h2>
            {myRole === 1 && (
              <button onClick={() => updateConfig('is_started', false)} className="px-10 py-4 bg-white text-black font-black rounded-full uppercase text-xs tracking-[0.2em] hover:scale-105 transition-transform">Reset Lobby</button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div 
              animate={timer <= 3 ? { x: [-2, 2, -2, 2, 0], scale: [1, 1.05, 1] } : {}}
              className={`w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-300
                ${feedback === 'correct' ? 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.3)]' : 
                  feedback === 'error' ? 'border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'border-zinc-800'}`}
            >
              <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em] uppercase">Contains</span>
              <h1 className="text-7xl font-black tracking-tighter">{prompt}</h1>
              <p className={`text-3xl font-mono font-bold mt-2 ${timer <= 3 ? 'text-red-600 animate-pulse' : 'text-yellow-500'}`}>{timer}s</p>
            </motion.div>

            <div className="mt-12 w-full max-w-md flex flex-col items-center relative">
              {/* REMOTE TYPING PREVIEW */}
              <div className="h-10 text-zinc-600 font-black text-2xl uppercase italic opacity-50 absolute -top-10">
                {turn !== myRole && remoteInput}
              </div>

              <form onSubmit={handleSubmit} className="w-full">
                <input 
                  autoFocus 
                  value={input} 
                  onChange={handleInputChange}
                  disabled={myRole !== turn}
                  className={`bg-transparent border-b-4 border-zinc-900 text-5xl font-black text-center uppercase focus:outline-none focus:border-red-600 w-full transition-all duration-500 ${myRole !== turn ? 'opacity-10 cursor-not-allowed' : 'opacity-100'}`}
                  placeholder={myRole === turn ? "TYPE NOW" : "WAIT..."}
                />
              </form>
            </div>
          </>
        )}
      </div>
      
      {/* Join/Leave Notifications */}
      <AnimatePresence>
        {(!presence.p1 || !presence.p2) && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} 
            className="fixed bottom-8 bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest text-yellow-500 shadow-2xl">
            Waiting for players to connect...
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 text-zinc-700 uppercase text-[10px] font-black tracking-widest h-4">
        {usedWords.slice(0, 5).map((w) => <span key={w}>{w}</span>)}
      </div>
    </main>
  );
}