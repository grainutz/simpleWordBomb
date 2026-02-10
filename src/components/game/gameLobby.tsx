import React from 'react';
import { CharacterSelect } from './characterSelect';
import type { GameConfig, Player, Character } from '@/hooks/useGameRoom';

type GameLobbyProps = {
  roomId: string;
  myRole: number | null;
  gameConfig: GameConfig;
  players: Player[];
  presence: { p1: boolean; p2: boolean };
  onUpdateConfig: (key: string, value: any) => void;
  onSelectCharacter: (character: Character) => void;
  onStartGame: () => void;
};

export function GameLobby({
  roomId,
  myRole,
  gameConfig,
  players,
  presence,
  onUpdateConfig,
  onSelectCharacter,
  onStartGame
}: GameLobbyProps) {
  return (
    <div className="min-h-screen bg-[#FFF8E1] p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white p-8 rounded-[40px] border-8 border-[#5D4037] shadow-2xl relative">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-4">
          {[1, 2].map(n => (
            <div
              key={n}
              className={`w-6 h-6 rounded-full border-4 border-[#5D4037] ${
                presence[`p${n}` as keyof typeof presence]
                  ? 'bg-green-400'
                  : 'bg-zinc-200'
              }`}
            />
          ))}
        </div>

        <h2 className="text-4xl font-black mb-8 text-[#5D4037] italic tracking-tighter text-center">
          KITCHEN SETTINGS
        </h2>

        <div className="space-y-8">
          {/* Character Selection */}
          <div className="pb-6 border-b-4 border-dashed border-zinc-100">
            <CharacterSelect
              myRole={myRole || 0}
              selectedCharacter={players.find(p => p.id === myRole)?.character || null}
              onSelectCharacter={onSelectCharacter}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#8D6E63] font-black uppercase tracking-widest">
              Lives: {gameConfig.maxLives} Potatoes
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={gameConfig.maxLives}
              disabled={myRole !== 1}
              onChange={(e) => onUpdateConfig('max_lives', parseInt(e.target.value))}
              className="w-full accent-[#FF7043]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#8D6E63] font-black uppercase tracking-widest">
              Heat Timer: {gameConfig.duration}s
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="5"
              value={gameConfig.duration}
              disabled={myRole !== 1}
              onChange={(e) => onUpdateConfig('bomb_duration', parseInt(e.target.value))}
              className="w-full accent-[#FF7043]"
            />
          </div>

          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => onUpdateConfig('difficulty', d)}
                disabled={myRole !== 1}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-4 transition-all ${
                  gameConfig.difficulty === d
                    ? 'bg-[#5D4037] text-white border-[#5D4037]'
                    : 'border-zinc-100 text-[#8D6E63]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="pt-6 border-t-4 border-dashed border-zinc-100">
            <div className="flex bg-[#FFF8E1] p-4 rounded-2xl border-4 border-[#5D4037] items-center justify-between">
              <code className="text-[#FF7043] font-black text-2xl">{roomId}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Copied!");
                }}
                className="text-xs bg-[#5D4037] text-white px-4 py-2 rounded-lg font-black"
              >
                COPY LINK
              </button>
            </div>
          </div>

          {myRole === 1 ? (
            <>
              {!players[0].character || !players[1].character ? (
                <p className="text-center text-[#FF7043] font-bold italic animate-pulse">
                  Both chefs must pick a character!
                </p>
              ) : (
                <button
                  onClick={onStartGame}
                  className="w-full py-5 bg-[#FF7043] text-white rounded-2xl font-black text-2xl uppercase shadow-[0_8px_0_#BF360C] hover:translate-y-1 hover:shadow-[0_4px_0_#BF360C] active:translate-y-2 active:shadow-none transition-all"
                >
                  START COOKING!
                </button>
              )}
            </>
          ) : (
            <p className="text-center text-[#8D6E63] font-bold italic animate-pulse">
              Wait for Chef 1 to start...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}