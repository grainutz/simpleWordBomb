"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { isValidWord, getRandomPrompt } from '@/lib/gameUtils';
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

  // Sync with Supabase
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
    setTimer(10);
  };

  // Timer Authority: Only the active player controls the countdown
  useEffect(() => {
    if (myRole !== turn || players[0].lives <= 0 || players[1].lives <= 0) return;

    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      handleTimeout();
    }
  }, [timer, turn, myRole]);

  const handleTimeout = async () => {
    const isP1 = turn === 1;
    await supabase.from('rooms').update({
      p1_lives: isP1 ? players[0].lives - 1 : players[0].lives,
      p2_lives: !isP1 ? players[1].lives - 1 : players[1].lives,
      current_turn: turn === 1 ? 2 : 1,
      prompt: getRandomPrompt(),
    }).eq('id', roomId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myRole !== turn) return;

    const cleanInput = input.toUpperCase().trim();
    if (isValidWord(cleanInput, prompt) && !usedWords.includes(cleanInput)) {
      setFeedback('correct');
      await supabase.from('rooms').update({
        prompt: getRandomPrompt(),
        current_turn: turn === 1 ? 2 : 1,
        used_words: [cleanInput, ...usedWords],
      }).eq('id', roomId);
      setInput("");
    } else {
      setFeedback('error');
    }
    setTimeout(() => setFeedback(null), 400);
  };

  if (!myRole) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <h2 className="text-white text-2xl font-bold">JOIN AS:</h2>
      <div className="flex gap-4">
        <button onClick={() => setMyRole(1)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black">Player 1</button>
        <button onClick={() => setMyRole(2)} className="px-8 py-4 bg-zinc-900 text-white border border-zinc-700 rounded-lg hover:bg-white hover:text-black">Player 2</button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-between py-16">
      <div className="w-full max-w-xl flex justify-between px-8">
        {[0, 1].map(i => (
          <div key={i} className={turn === i+1 ? "opacity-100" : "opacity-30"}>
            <p className="text-[10px] font-bold text-zinc-500 uppercase">P{i+1} {myRole === i+1 && "(YOU)"}</p>
            <div className="flex gap-1">
              {[...Array(3)].map((_, j) => (
                <div key={j} className={`w-6 h-2 rounded-full ${j < players[i].lives ? 'bg-red-600 shadow-[0_0_10px_red]' : 'bg-zinc-800'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center">
        <motion.div 
          animate={timer <= 3 ? { x: [-2, 2, -2, 2, 0] } : {}}
          className={`w-64 h-64 rounded-full border-8 flex flex-col items-center justify-center transition-all 
            ${feedback === 'correct' ? 'border-green-500' : feedback === 'error' ? 'border-red-500' : 'border-zinc-800'}`}
        >
          <span className="text-[10px] text-zinc-500 font-bold tracking-[0.3em]">CONTAINS</span>
          <h1 className="text-7xl font-black">{prompt}</h1>
          <p className={`text-2xl font-mono ${timer <= 3 ? 'text-red-500' : 'text-yellow-500'}`}>{timer}s</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-12">
          <input 
            autoFocus value={input} 
            onChange={e => setInput(e.target.value)}
            disabled={myRole !== turn}
            className="bg-transparent border-b-4 border-zinc-900 text-5xl font-black text-center uppercase focus:outline-none focus:border-yellow-500 w-80"
          />
        </form>
      </div>
      
      <div className="flex gap-4 text-zinc-600 uppercase text-xs font-bold">
        {usedWords.slice(0, 5).map((w, i) => <span key={i}>{w}</span>)}
      </div>
    </main>
  );
}