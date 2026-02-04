"use client";
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getRandomPrompt } from '@/lib/gameUtils';

export default function Home() {
  const router = useRouter();

  const createRoom = async () => {
  // Use the built-in browser method to generate a valid UUID
  const newRoomId = crypto.randomUUID(); 
  
  const { error } = await supabase.from('rooms').insert({
    id: newRoomId, // This will now be accepted by Postgres
    prompt: getRandomPrompt(),
    current_turn: 1,
    p1_lives: 3,
    p2_lives: 3,
    used_words: []
  });

  if (!error) router.push(`/room/${newRoomId}`);
};

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans">
      <h1 className="text-8xl font-black mb-8 italic tracking-tighter">WORD BOMB</h1>
      <button 
        onClick={createRoom}
        className="px-12 py-6 bg-red-600 font-black rounded-full hover:bg-red-500 transition-all shadow-[0_0_30px_rgba(220,38,38,0.4)] uppercase tracking-widest"
      >
        Start New Game
      </button>
    </div>
  );
}