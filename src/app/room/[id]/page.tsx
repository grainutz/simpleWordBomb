"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidWord, getPromptByDifficulty } from '@/lib/gameUtils';
import { supabase } from '@/lib/supabase';

export default function GameRoom() {
  const { id: roomId } = useParams();
  const [myRole, setMyRole] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [timer, setTimer] = useState(10);
  const [turn, setTurn] = useState(1);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'error' | null>(null);
  const [players, setPlayers] = useState([{ id: 1, lives: 3 }, { id: 2, lives: 3 }]);
  
  // New State for Rules
  const [gameConfig, setGameConfig] = useState({
    maxLives: 3,
    duration: 10,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    isStarted: false
  });

  useEffect(() => {
    if (!roomId) return;
    const fetchInitial = async () => {
      const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
      if (data) syncState(data);
    };
    fetchInitial();

    const channel = supabase.channel(`room:${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, 
      (payload) => syncState(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

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
    setTimer(data.bomb_duration); // Sync timer to the custom duration
  };

  // Timer Authority
  useEffect(() => {
    if (!gameConfig.isStarted || myRole !== turn || players[0].lives <= 0 || players[1].lives <= 0) return;

    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      handleTimeout();
    }
  }, [timer, turn, myRole, gameConfig.isStarted]);

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
    if (myRole !== 1) return; // Only P1 can change rules
    await supabase.from('rooms').update({ [key]: value }).eq('id', roomId);
  };

  const startGame = async () => {
    await supabase.from('rooms').update({ 
      is_started: true,
      p1_lives: gameConfig.maxLives,
      p2_lives: gameConfig.maxLives,
      prompt: getPromptByDifficulty(gameConfig.difficulty)
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
    } else {
      setFeedback('error');
    }
    setTimeout(() => setFeedback(null), 400);
  };

  // --- UI RENDERING ---

  if (!myRole) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <h2 className="text-white text-2xl font-bold tracking-tighter">JOIN AS:</h2>
      <div className="flex gap-4">
        <button onClick={() => setMyRole(1)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black transition-all">Player 1 (Host)</button>
        <button onClick={() => setMyRole(2)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black transition-all">Player 2</button>
      </div>
    </div>
  );

  // LOBBY / RULES SCREEN
  if (!gameConfig.isStarted) {
    return (
      <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl">
          <h2 className="text-3xl font-black mb-6 italic tracking-tighter">ROOM SETTINGS</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Lives: {gameConfig.maxLives}</label>
              <input type="range" min="1" max="5" value={gameConfig.maxLives} 
                disabled={myRole !== 1}
                onChange={(e) => updateConfig('max_lives', parseInt(e.target.value))}
                className="w-full accent-red-600 mt-2" 
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Bomb Timer: {gameConfig.duration}s</label>
              <input type="range" min="5" max="30" step="5" value={gameConfig.duration} 
                disabled={myRole !== 1}
                onChange={(e) => updateConfig('bomb_duration', parseInt(e.target.value))}
                className="w-full accent-red-600 mt-2" 
              />
            </div>

            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((d) => (
                <button 
                  key={d}
                  onClick={() => updateConfig('difficulty', d)}
                  disabled={myRole !== 1}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${gameConfig.difficulty === d ? 'bg-white text-black border-white' : 'border-zinc-800 text-zinc-500'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Invite Code</p>
              <div className="flex bg-black p-3 rounded-xl border border-zinc-800 items-center justify-between">
                <code className="text-red-500 font-mono text-xl">{roomId}</code>
                <button onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }} className="text-[10px] bg-zinc-800 px-3 py-1 rounded-md">COPY LINK</button>
              </div>
            </div>

            {myRole === 1 ? (
              <button onClick={startGame} className="w-full py-4 bg-red-600 rounded-xl font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-lg shadow-red-600/20">Start Game</button>
            ) : (
              <p className="text-center text-zinc-500 italic text-sm animate-pulse">Waiting for host to start...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN (Keep your existing return UI here)
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between py-16">
      {/* Existing HUD and Bomb UI... */}
      {/* Ensure to use gameConfig.maxLives for the heart display if you want it dynamic */}
    </main>
  );
}