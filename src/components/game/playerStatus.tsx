import React from 'react';
import type { Player } from '@/hooks/useGameRoom';

type PlayerStatusProps = {
  players: Player[];
  myRole: number | null;
  turn: number;
  maxLives: number;
  presence: { p1: boolean; p2: boolean };
};

export function PlayerStatus({
  players,
  myRole,
  turn,
  maxLives,
  presence
}: PlayerStatusProps) {
  return (
    <div className="w-full max-w-2xl flex justify-between items-start px-4">
      {[1, 2].map((num) => (
        <div
          key={num}
          className={`flex flex-col ${
            num === 2 ? 'items-end' : 'items-start'
          } ${turn === num ? 'scale-110' : 'opacity-40'} transition-all`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-3 h-3 rounded-full ${
                presence[`p${num}` as keyof typeof presence]
                  ? 'bg-green-500'
                  : 'bg-red-400'
              }`}
            />
            <p className="font-black uppercase text-xs tracking-tighter">
              Chef {num} {myRole === num && "(YOU)"}
            </p>
          </div>
          <div className="flex gap-1">
            {[...Array(maxLives)].map((_, j) => (
              <span
                key={j}
                className={`text-2xl ${
                  j < players[num - 1].lives
                    ? 'grayscale-0'
                    : 'grayscale opacity-20'
                }`}
              >
                🥔
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}