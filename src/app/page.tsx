"use client";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getPromptByDifficulty } from '@/lib/gameUtils';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  const createRoom = async () => {
    // Generate a short, readable room ID (e.g., "pot-123")
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
    <div className="min-h-screen bg-[#FFF8E1] flex flex-col items-center justify-center font-sans p-4 overflow-hidden relative">
      {/* Animated Steam Background Elements */}
      <motion.div 
        animate={{ y: [-10, -30], opacity: [0, 0.5, 0] }}
        transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
        className="absolute text-6xl pointer-events-none"
      >💨</motion.div>

      {/* The Hero Potato */}
      <motion.div 
        animate={{ 
          rotate: [0, 5, -5, 0], 
          y: [0, -15, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="text-[120px] mb-6 drop-shadow-xl cursor-default select-none"
      >
        🥔
      </motion.div>

      {/* Title & Subtitle */}
      <div className="text-center mb-10">
        <h1 className="text-7xl font-black text-[#5D4037] mb-2 tracking-tighter italic">
          HOT POTATO
        </h1>
        <div className="h-1 w-full bg-[#5D4037] rounded-full mb-3 opacity-20" />
        <p className="text-[#8D6E63] font-black uppercase tracking-[0.3em] text-xs">
          Type fast or get mashed!
        </p>
      </div>
      
      {/* Action Button */}
      <button 
        onClick={createRoom}
        className="group relative px-12 py-6 bg-[#FF7043] text-white font-black rounded-[2rem] border-4 border-[#5D4037] shadow-[0_10px_0_#BF360C] hover:shadow-[0_6px_0_#BF360C] hover:translate-y-[4px] active:shadow-none active:translate-y-[10px] transition-all duration-75 uppercase tracking-tighter text-3xl italic"
      >
        <span className="flex items-center gap-3">
          Cook Game <span className="group-hover:rotate-12 transition-transform">🔥</span>
        </span>
      </button>

      {/* Decorative Footer */}
      <p className="fixed bottom-8 text-[#8D6E63]/40 font-bold uppercase text-[10px] tracking-widest">
        Best served with friends • 2026 Edition
      </p>
    </div>
  );
}