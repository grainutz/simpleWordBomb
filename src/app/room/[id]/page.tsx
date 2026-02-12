"use client";
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameRoom } from '@/hooks/useGameRoom';
import { GameLobby } from '@/components/game/gameLobby';
import { GameBoard } from '@/components/game/gameBoard';

export default function GameRoom() {
  const { id: roomId } = useParams();
  const [myRole, setMyRole] = useState<number | null>(null);

  const {
    input,
    prompt,
    timer,
    turn,
    usedWords,
    players,
    isPaused,
    gameConfig,
    remoteInput,
    presence,
    isGameOver,
    winner,
    valentineSuccess, // Extracted from your hook

    handleInputChange,
    handleSubmit,
    togglePause,
    updateConfig,
    selectCharacter,
    startGame,
  } = useGameRoom(roomId as string, myRole);

  if (!myRole) {
    return (
      <div className="min-h-screen bg-[#FFF8E1] flex flex-col items-center justify-center gap-8">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-9xl"
        >
          🥔
        </motion.div>
        <h2 className="text-[#5D4037] text-4xl font-black italic tracking-tighter uppercase">
          Pick a Side!
        </h2>
        <div className="flex gap-6">
          <button
            onClick={() => setMyRole(1)}
            className="px-10 py-6 bg-white text-[#5D4037] border-4 border-[#5D4037] rounded-2xl font-black text-xl shadow-[0_8px_0_#5D4037] hover:translate-y-1 hover:shadow-[0_4px_0_#5D4037] active:translate-y-2 active:shadow-none transition-all"
          >
            CHEF 1 (HOST)
          </button>
          <button
            onClick={() => setMyRole(2)}
            className="px-10 py-6 bg-white text-[#5D4037] border-4 border-[#5D4037] rounded-2xl font-black text-xl shadow-[0_8px_0_#5D4037] hover:translate-y-1 hover:shadow-[0_4px_0_#5D4037] active:translate-y-2 active:shadow-none transition-all"
          >
            CHEF 2 (GUEST)
          </button>
        </div>
      </div>
    );
  }

  if (!gameConfig.isStarted) {
    return (
      <GameLobby
        roomId={roomId as string}
        myRole={myRole}
        gameConfig={gameConfig}
        players={players}
        presence={presence}
        onUpdateConfig={updateConfig}
        onSelectCharacter={selectCharacter}
        onStartGame={startGame}
      />
    );
  }

  return (
    <GameBoard
      myRole={myRole}
      turn={turn}
      timer={timer}
      prompt={prompt}
      input={input}
      remoteInput={remoteInput}
      players={players}
      usedWords={usedWords}
      isPaused={isPaused}
      isGameOver={isGameOver}
      winner={winner}
      valentineSuccess={valentineSuccess} // NEW PROP
      maxLives={gameConfig.maxLives}
      gameConfig={{ duration: gameConfig.duration }}
      presence={presence}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      onTogglePause={togglePause}
      onUpdateConfig={updateConfig}
    />
  );
}