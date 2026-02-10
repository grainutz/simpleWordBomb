import React from 'react';
import { motion } from 'framer-motion';
import type { Character } from '@/hooks/useGameRoom';

type CharacterSelectProps = {
  myRole: number;
  selectedCharacter: Character | null;
  onSelectCharacter: (character: Character) => void;
};

export function CharacterSelect({
  myRole,
  selectedCharacter,
  onSelectCharacter
}: CharacterSelectProps) {
  const characters: { type: Character; name: string; emoji: string }[] = [
    { type: 'seal', name: 'Seal', emoji: '🦭' },
    { type: 'capybara', name: 'Capybara', emoji: '🐹' }
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <h3 className="text-2xl font-black text-[#5D4037] uppercase tracking-tight">
        Choose Your Chef!
      </h3>
      
      <div className="flex gap-6">
        {characters.map(({ type, name, emoji }) => (
          <motion.button
            key={type}
            onClick={() => onSelectCharacter(type)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`relative w-32 h-32 rounded-2xl border-4 flex flex-col items-center justify-center transition-all ${
              selectedCharacter === type
                ? 'bg-[#FF7043] border-[#BF360C] text-white shadow-[0_6px_0_#BF360C]'
                : 'bg-white border-[#5D4037] text-[#5D4037] shadow-[0_4px_0_#5D4037] hover:translate-y-1 hover:shadow-[0_2px_0_#5D4037]'
            }`}
          >
            {selectedCharacter === type && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-3 -right-3 w-8 h-8 bg-green-400 border-4 border-white rounded-full flex items-center justify-center text-sm"
              >
                ✓
              </motion.div>
            )}
            <span className="text-5xl mb-2">{emoji}</span>
            <span className="font-black text-xs uppercase tracking-wider">{name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}