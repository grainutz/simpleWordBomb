import React from 'react';
import { motion } from 'framer-motion';

export function ValentineCelebration() {
  const hearts = Array.from({ length: 20 });
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-pink-100/80 backdrop-blur-sm flex items-center justify-center pointer-events-none"
    >
      {hearts.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: '50%',
            y: '100%',
            opacity: 0,
            scale: 0
          }}
          animate={{
            x: `${Math.random() * 100}%`,
            y: '-10%',
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1.5, 0],
            rotate: Math.random() * 360
          }}
          transition={{
            duration: 3,
            delay: i * 0.1,
            ease: 'easeOut'
          }}
          className="absolute text-6xl"
        >
          💖
        </motion.div>
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.5 
        }}
        className="text-center pointer-events-auto"
      >
        <div className="bg-white p-12 rounded-[40px] border-8 border-pink-400 shadow-2xl">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-8xl mb-4"
          >
            💕
          </motion.div>
          <h2 className="text-6xl font-black text-pink-600 mb-4 italic uppercase">
            They Said YES!
          </h2>
          <p className="text-xl text-pink-400 font-bold uppercase tracking-widest">
            Happy Valentine's Day! 💝
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}