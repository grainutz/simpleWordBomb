import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStatus } from './playerStatus';
import { AnimatedCharacter } from './animatedCharacter';
import { PauseOverlay } from './pauseOverlay';
import type { Player } from '@/hooks/useGameRoom';

type GameBoardProps = {
  myRole: number | null;
  turn: number;
  timer: number;
  prompt: string;
  input: string;
  remoteInput: string;
  players: Player[];
  usedWords: string[];
  isPaused: boolean;
  isGameOver: boolean;
  winner: number;
  maxLives: number;
  gameConfig: { duration: number };
  presence: { p1: boolean; p2: boolean };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTogglePause: () => void;
  onUpdateConfig: (key: string, value: any) => void;
};

// helper potato burn indicator
function getPotatoSprite(timer: number, duration: number): number {
  const percentage = (timer / duration) * 100;
  if (percentage > 66) return 0; // Fresh
  if (percentage > 33) return 1; // Slightly burnt
  if (percentage > 10) return 2; // Very burnt
  return 3; // Critical!
}

export function GameBoard({
  myRole,
  turn,
  timer,
  prompt,
  input,
  remoteInput,
  players,
  usedWords,
  isPaused,
  isGameOver,
  winner,
  maxLives,
  gameConfig,
  presence,
  onInputChange,
  onSubmit,
  onTogglePause,
  onUpdateConfig
}: GameBoardProps) {
  return (
    <main className="min-h-screen bg-[#FFF8E1] text-[#5D4037] flex flex-col items-center justify-between py-12 px-4 overflow-hidden relative">
      <PlayerStatus
        players={players}
        myRole={myRole}
        turn={turn}
        maxLives={maxLives}
        presence={presence}
      />

      <PauseOverlay
        isPaused={isPaused}
        myRole={myRole}
        onTogglePause={onTogglePause}
      />

      {!isGameOver && myRole === 1 && (
        <button
          onClick={onTogglePause}
          className="fixed top-8 right-8 z-40 group"
        >
          <img
            src={isPaused ? "/sprites/ui/icon-play.png" : "/sprites/ui/icon-pause.png"}
            alt={isPaused ? "Resume" : "Pause"}
            className="w-14 h-14 group-hover:scale-110 group-active:scale-95 transition-transform"
            style={{ imageRendering: 'pixelated' }}
          />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <AnimatePresence mode="wait">
          {isGameOver ? (
            <motion.div
              initial={{ y: -500 }}
              animate={{ y: 0 }}
              className="text-center flex flex-col items-center"
            >
              <img
                src={myRole === winner ? "/sprites/ui/banner-victory.png" : "/sprites/ui/banner-defeat.png"}
                alt={myRole === winner ? "Victory!" : "Defeat"}
                className="w-96 h-auto mb-8"
                style={{ imageRendering: 'pixelated' }}
              />
              <p className="text-xl font-bold text-[#8D6E63] mb-8 uppercase">
                Chef {winner} wins the round!
              </p>
              
              {myRole === 1 && (
                <button
                  onClick={() => onUpdateConfig('is_started', false)}
                  className="px-10 py-5 bg-[#FF7043] text-white font-black rounded-2xl text-xl shadow-[0_6px_0_#BF360C] active:translate-y-1"
                >
                  PLAY AGAIN
                </button>
              )}
            </motion.div>
          ) : (
            <div className="relative flex flex-col items-center w-full max-w-4xl">
              
              <div className="flex justify-between items-center w-full px-12 mb-12">
                {/* p1 */}
                <AnimatedCharacter
                  character={players[0].character || 'seal'}
                  potatoSprite={getPotatoSprite(timer, gameConfig.duration)}
                  isActive={turn === 1}
                  position="left"
                  lives={players[0].lives}
                />

                {/* Prompt Display */}
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white border-8 border-[#5D4037] rounded-3xl px-12 py-8 shadow-2xl">
                    <h1 className="text-7xl font-black tracking-tighter uppercase text-[#5D4037]">
                      {prompt}
                    </h1>
                  </div>
                  
                  <div className="bg-[#5D4037] text-white px-8 py-4 rounded-full font-black text-3xl border-4 border-white shadow-xl">
                    ⏱️ {timer}s
                  </div>
                </div>

                {/* p2 */}
                <AnimatedCharacter
                  character={players[1].character || 'capybara'}
                  potatoSprite={getPotatoSprite(timer, gameConfig.duration)}
                  isActive={turn === 2}
                  position="right"
                  lives={players[1].lives}
                />
              </div>

              <div className="mt-24 flex flex-col items-center">
                <div className="h-10 mb-2 font-black text-[#FF7043] text-2xl italic uppercase">
                  {turn !== myRole && remoteInput}
                </div>
                <form onSubmit={onSubmit}>
                  <input
                    autoFocus
                    value={input}
                    onChange={onInputChange}
                    disabled={myRole !== turn}
                    placeholder={myRole === turn ? "HURRY!" : "WATCHING..."}
                    className="bg-white border-8 border-[#5D4037] rounded-[30px] px-10 py-6 text-4xl font-black text-center uppercase focus:outline-none focus:ring-8 focus:ring-[#FF7043]/20 w-96 shadow-2xl placeholder:opacity-20 transition-all"
                  />
                </form>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full flex justify-center gap-4 h-12">
        <AnimatePresence>
          {usedWords.slice(0, 4).map((w) => (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              key={w}
              className="bg-white px-6 py-2 rounded-full text-xs font-black uppercase border-4 border-[#5D4037] h-fit"
            >
              {w}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {(!presence.p1 || !presence.p2) && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-10 bg-[#5D4037] text-white px-8 py-4 rounded-full font-black text-xs tracking-widest uppercase"
          >
            Searching for Chef {!presence.p1 ? '1' : '2'}... 🧑‍🍳
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}