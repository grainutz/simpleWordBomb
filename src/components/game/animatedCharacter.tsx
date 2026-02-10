import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Character } from '@/hooks/useGameRoom';

type AnimatedCharacterProps = {
  character: Character;
  potatoSprite: number; // 0-3 based on burn level
  isActive: boolean; // true when it's their turn (holding potato)
  position: 'left' | 'right';
  lives: number;
};

export function AnimatedCharacter({
  character,
  potatoSprite,
  isActive,
  position,
  lives
}: AnimatedCharacterProps) {
  const [idleFrame, setIdleFrame] = useState(0);

  // Idle animation cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setIdleFrame((prev) => (prev + 1) % 2); // 2 frames for idle
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`relative flex flex-col items-center ${position === 'left' ? 'items-start' : 'items-end'}`}>
      {/* Potato on head when active */}
      {isActive && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="absolute -top-16 z-10"
          style={{
            left: position === 'left' ? '50%' : 'auto',
            right: position === 'right' ? '50%' : 'auto',
            transform: 'translateX(-50%)'
          }}
        >
          {/* Potato sprite - replace with your actual sprite */}
          <div className="relative">
            <img
              src={`/sprites/potato-${potatoSprite}.png`}
              alt="Hot Potato"
              className="w-20 h-20 object-contain"
              style={{
                imageRendering: 'pixelated',
              }}
            />
            {/* Add shake effect when potato is burning */}
            {potatoSprite >= 2 && (
              <motion.div
                animate={{ rotate: [-5, 5, -5, 5, 0] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="absolute inset-0"
              />
            )}
          </div>
        </motion.div>
      )}

      {/* Character sprite */}
      <motion.div
        animate={{
          y: isActive ? [0, -4, 0] : [0, -2, 0], // Bounce more when holding potato
          scale: isActive ? 1.1 : 1
        }}
        transition={{
          duration: isActive ? 0.6 : 1,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="relative"
      >
        <img
          src={`/sprites/${character}-idle-${idleFrame}.png`}
          alt={character}
          className="w-32 h-32 object-contain"
          style={{
            imageRendering: 'pixelated',
            filter: lives <= 0 ? 'grayscale(1) opacity(0.5)' : 'none',
            transform: position === 'right' ? 'scaleX(-1)' : 'none'
          }}
        />
        
        {/* Panic effect when timer is low */}
        {isActive && potatoSprite >= 3 && (
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="absolute -top-4 -left-4 text-3xl"
          >
            💧
          </motion.div>
        )}
      </motion.div>

      {/* Character name and lives */}
      <div className={`mt-2 flex flex-col ${position === 'right' ? 'items-end' : 'items-start'}`}>
        <p className="font-black text-xs uppercase tracking-wider text-[#5D4037]">
          {character}
        </p>
        <div className="flex gap-1 mt-1">
          {[...Array(lives)].map((_, i) => (
            <span key={i} className="text-sm">
              ❤️
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}