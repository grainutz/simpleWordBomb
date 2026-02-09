import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerStatus } from './playerStatus';
import { PotatoBomb } from './potatoBomb';
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
  presence: { p1: boolean; p2: boolean };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTogglePause: () => void;
  onUpdateConfig: (key: string, value: any) => void;
};

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
          className="fixed top-8 right-8 w-14 h-14 bg-white border-4 border-[#5D4037] rounded-full flex items-center justify-center text-2xl shadow-[0_4px_0_#5D4037] active:translate-y-1 active:shadow-none z-40"
        >
          {isPaused ? "▶️" : "⏸️"}
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <AnimatePresence mode="wait">
          {isGameOver ? (
            <motion.div
              initial={{ y: -500 }}
              animate={{ y: 0 }}
              className="text-center bg-white p-12 rounded-[40px] shadow-2xl border-8 border-[#5D4037]"
            >
              <h2 className="text-6xl font-black mb-4 uppercase italic">MASHED!</h2>
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
            <div className="relative flex flex-col items-center">
              <PotatoBomb prompt={prompt} timer={timer} turn={turn} />

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