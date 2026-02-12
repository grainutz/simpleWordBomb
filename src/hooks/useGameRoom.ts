import { useState, useEffect } from 'react';
import { useRealtimeSync } from './useRealtimeSync';
import { useGameTimer } from './useGameTimer';
import { gameService } from '@/services/gameService';
import { getPromptByDifficulty } from '@/lib/gameUtils';

export type Character = 'seal' | 'capybara';

export type GameConfig = {
  maxLives: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isStarted: boolean;
  valentineMode: boolean;
};

export type Player = {
  id: number;
  lives: number;
  character: Character | null;
};

export function useGameRoom(roomId: string, myRole: number | null) {
  const [valentineSuccess, setValentineSuccess] = useState(false);
  const [input, setInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [turn, setTurn] = useState(1);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'error' | null>(null);
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, lives: 3, character: null }, 
    { id: 2, lives: 3, character: null }
  ]);
  const [isPaused, setIsPaused] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    maxLives: 3,
    duration: 10,
    difficulty: 'medium',
    isStarted: false,
    valentineMode: false
  });

  const { remoteInput, presence, sendTyping, channelRef } = useRealtimeSync(
    roomId,
    myRole,
    syncState
  );

  const { timer, setTimer } = useGameTimer({
    isActive: gameConfig.isStarted && !isPaused && myRole === turn,
    duration: gameConfig.duration,
    onTimeout: handleTimeout,
    onTick: (newTimer) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: { timer: newTimer }
      });
    },
    shouldRun: players[0].lives > 0 && players[1].lives > 0
  });

  function syncState(data: any) {
    setPrompt(data.prompt);
    setTurn(data.current_turn);
    setUsedWords(data.used_words || []);
    setPlayers([
      { id: 1, lives: data.p1_lives, character: data.p1_character }, 
      { id: 2, lives: data.p2_lives, character: data.p2_character }
    ]);
    setIsPaused(data.is_paused);

    setValentineSuccess(data.valentine_success || false);
    
    setGameConfig({
      maxLives: data.max_lives,
      duration: data.bomb_duration,
      difficulty: data.difficulty,
      isStarted: data.is_started,
      valentineMode: data.valentine_mode || false,
    });

    if (data.current_timer_value !== null && data.current_timer_value !== undefined) {
      setTimer(data.current_timer_value);
    } else if (data.is_started) {
      setTimer(data.bomb_duration);
    }
  }

  async function handleTimeout() {
    await gameService.handleTimeout(roomId, turn, players, gameConfig);
  }

  async function togglePause() {
    if (myRole !== 1) return;
    await gameService.togglePause(roomId, !isPaused, timer);
  }

  async function updateConfig(key: string, value: any) {
    if (myRole !== 1) return;
    await gameService.updateConfig(roomId, key, value);
  }

  async function selectCharacter(character: Character) {
    if (!myRole) return;
    const field = myRole === 1 ? 'p1_character' : 'p2_character';
    await gameService.updateConfig(roomId, field, character);
  }

  async function startGame() {
    await gameService.startGame(roomId, gameConfig);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (myRole !== turn || !gameConfig.isStarted) return;

    const result = await gameService.submitWord(
      roomId,
      input,
      prompt,
      usedWords,
      turn,
      gameConfig
    );

    if (result.success) {
      setFeedback('correct');
      setInput("");
      sendTyping("", myRole);
    } else {
      setFeedback('error');
    }

    setTimeout(() => setFeedback(null), 400);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    sendTyping(val, myRole);
  }

  const isGameOver = players[0].lives <= 0 || players[1].lives <= 0;
  const winner = players[0].lives > 0 ? 1 : 2;

  return {
    // State
    input,
    prompt,
    timer,
    turn,
    usedWords,
    feedback,
    players,
    isPaused,
    gameConfig,
    remoteInput,
    presence,
    isGameOver,
    winner,
    valentineSuccess,

    // Actions
    handleInputChange,
    handleSubmit,
    togglePause,
    updateConfig,
    selectCharacter,
    startGame,
  };
}