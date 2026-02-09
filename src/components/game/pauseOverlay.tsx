import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type PauseOverlayProps = {
  isPaused: boolean;
  myRole: number | null;
  onTogglePause: () => void;
};

export function PauseOverlay({ isPaused, myRole, onTogglePause }: PauseOverlayProps) {
  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#FFF8E1]/80 backdrop-blur-md flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="bg-white border-8 border-[#5D4037] p-10 rounded-[40px] shadow-2xl text-center"
          >
            <h2 className="text-5xl font-black text-[#5D4037] mb-6 italic uppercase">
              Kitchen Break!
            </h2>
            <p className="text-[#8D6E63] font-bold mb-8 uppercase tracking-widest">
              The potato is resting...
            </p>

            {myRole === 1 ? (
              <button
                onClick={onTogglePause}
                className="px-10 py-4 bg-[#FF7043] text-white font-black rounded-2xl shadow-[0_6px_0_#BF360C] active:translate-y-1 active:shadow-none uppercase"
              >
                Resume Cooking
              </button>
            ) : (
              <div className="animate-pulse text-[#FF7043] font-black uppercase underline decoration-4">
                Waiting for Host to Resume
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}