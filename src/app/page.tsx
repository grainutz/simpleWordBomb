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
      setHeroFrame(prev => (prev + 1) % 3);
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
    <div className="min-h-screen bg-[#FFF8E1] flex flex-col items-center justify-center font-sans p-4 gap-12">
      {/* Title */}
      <img 
        src="/sprites/ui/title-hot-potato.png"
        alt="HOT POTATO"
        className="h-24 select-none"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Hero Potato */}
      <motion.div 
        animate={{ 
          y: [0, -15, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="drop-shadow-2xl"
      >
        <img 
          src={`/sprites/ui/potato-hero-${heroFrame}.png`}
          alt="Hot Potato"
          className="w-48 h-48 object-contain select-none"
          style={{ imageRendering: 'pixelated' }}
        />
      </motion.div>
      
      {/* Button (text already in sprite) */}
      <button 
        onClick={createRoom}
        className="group relative"
      >
        <img 
          src="/sprites/ui/button-normal.png"
          alt="Start Game"
          className="group-hover:hidden w-64 h-auto transition-all"
          style={{ imageRendering: 'pixelated' }}
        />
        <img 
          src="/sprites/ui/button-hover.png"
          alt="Start Game"
          className="hidden group-hover:block group-active:hidden w-64 h-auto absolute top-0 left-0"
          style={{ imageRendering: 'pixelated' }}
        />
        <img 
          src="/sprites/ui/button-pressed.png"
          alt="Start Game"
          className="hidden group-active:block w-64 h-auto absolute top-0 left-0"
          style={{ imageRendering: 'pixelated' }}
        />
      </button>
    </div>
  );
}