"use client";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPromptByDifficulty } from '@/lib/gameUtils';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const [heroFrame, setHeroFrame] = useState(0);

  // Animate hero potato
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroFrame(prev => (prev + 1) % 2);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const createRoom = async () => {
    const newRoomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    const { error } = await supabase.from('rooms').insert({
      id: newRoomId,
      prompt: getPromptByDifficulty('medium'),
      current_turn: 1,
      p1_lives: 3,
      p2_lives: 3,
      used_words: [],
      is_started: false,
      bomb_duration: 10,
      max_lives: 3,
      difficulty: 'medium'
    });

    if (!error) {
      router.push(`/room/${newRoomId}`);
    } else {
      console.error("Error creating room:", error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E1] flex items-center justify-center">
  <div className="flex flex-col items-center font-sans">

    {/* Title */}
    <img 
      src="/sprites/ui/title-hot-potato.png"
      alt="HOT POTATO"
      className="h-24 mb-6 select-none"
      style={{ imageRendering: 'pixelated' }}
    />

    {/* Hero */}
    <motion.div 
      animate={{ y: [0, -15, 0], scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      className="drop-shadow-2xl mb-8"
    >
      <img 
        src={`/sprites/ui/potato-hero-${heroFrame}.png`}
        alt="Hot Potato"
        className="w-56 h-56 object-contain select-none"
        style={{ imageRendering: 'pixelated' }}
      />
    </motion.div>

    {/* Button */}
    <button
      onClick={createRoom}
      className="group relative w-64"
    >
      <img
        src="/sprites/ui/button-normal.png"
        alt="Start Game"
        className="absolute inset-0 group-hover:hidden w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src="/sprites/ui/button-hover.png"
        alt="Start Game"
        className="absolute inset-0 hidden group-hover:block group-active:hidden w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src="/sprites/ui/button-pressed.png"
        alt="Start Game"
        className="absolute inset-0 hidden group-active:block w-full h-auto"
        style={{ imageRendering: "pixelated" }}
      />
    </button>

  </div>
</div>
  );
}