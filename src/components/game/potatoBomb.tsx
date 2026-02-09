import React from 'react';
import { motion } from 'framer-motion';

type PotatoBombProps = {
  prompt: string;
  timer: number;
  turn: number;
};

export function PotatoBomb({ prompt, timer, turn }: PotatoBombProps) {
  const potatoColor = timer > 5 ? '#D7CCC8' : timer > 2 ? '#FFAB91' : '#FF5252';
  const potatoScale = timer > 5 ? 1 : timer > 2 ? 1.1 : 1.2;

  return (
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
        <motion.div
          animate={{ y: -60, opacity: 0 }}
          transition={{ repeat: Infinity, duration: 0.6 }}
          className="absolute -top-10 left-1/2 text-4xl"
        >
          💨
        </motion.div>
      )}

      <div
        style={{ backgroundColor: potatoColor }}
        className="w-56 h-64 rounded-[110px_110px_90px_90px] border-8 border-[#5D4037] flex flex-col items-center justify-center transition-colors duration-500 shadow-2xl relative"
      >
        {/* Eyes */}
        <div className="flex gap-6 mb-4">
          <div className="w-4 h-4 bg-[#5D4037] rounded-full" />
          <div className="w-4 h-4 bg-[#5D4037] rounded-full" />
        </div>

        {/* Mouth */}
        <div
          className={`w-12 h-6 border-b-8 border-[#5D4037] rounded-full ${
            timer <= 3 ? 'h-10 bg-[#5D4037] rounded-lg' : ''
          }`}
        />

        {/* Prompt */}
        <h1 className="text-6xl font-black mt-6 tracking-tighter uppercase">
          {prompt}
        </h1>

        {/* Timer Badge */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-[#5D4037] text-white rounded-full flex items-center justify-center text-3xl font-black border-4 border-white shadow-xl">
          {timer}
        </div>
      </div>
    </motion.div>
  );
}