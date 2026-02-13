import { supabase } from '@/lib/supabase';
import { isValidWord, getPromptByDifficulty } from '@/lib/gameUtils';
import type { GameConfig, Player } from '@/hooks/useGameRoom';

export const gameService = {
  async handleTimeout(
    roomId: string,
    turn: number,
    players: Player[],
    gameConfig: GameConfig
  ) {
    const isP1 = turn === 1;
    
    await supabase.from('rooms').update({
      p1_lives: isP1 ? players[0].lives - 1 : players[0].lives,
      p2_lives: !isP1 ? players[1].lives - 1 : players[1].lives,
      current_turn: turn === 1 ? 2 : 1,
      prompt: getPromptByDifficulty(gameConfig.difficulty),
      current_timer_value: gameConfig.duration
    }).eq('id', roomId);
  },

  async togglePause(roomId: string, isPaused: boolean, currentTimer: number) {
    await supabase.from('rooms').update({
      is_paused: isPaused,
      current_timer_value: currentTimer
    }).eq('id', roomId);
  },

  async updateConfig(roomId: string, key: string, value: any) {
    await supabase.from('rooms').update({ [key]: value }).eq('id', roomId);
  },

  async startGame(roomId: string, gameConfig: GameConfig) {
    await supabase.from('rooms').update({
      is_started: true,
      p1_lives: gameConfig.maxLives,
      p2_lives: gameConfig.maxLives,
      prompt: getPromptByDifficulty(gameConfig.difficulty),
      used_words: []
    }).eq('id', roomId);
  },

  async submitWord(
    roomId: string,
    input: string,
    prompt: string,
    usedWords: string[],
    turn: number,
    gameConfig: GameConfig
  ) {
    const cleanInput = input.toUpperCase().trim();
    
    if (isValidWord(cleanInput, prompt) && !usedWords.includes(cleanInput)) {
      await supabase.from('rooms').update({
        prompt: getPromptByDifficulty(gameConfig.difficulty),
        current_turn: turn === 1 ? 2 : 1,
        used_words: [cleanInput, ...usedWords],
        current_timer_value: gameConfig.duration
      }).eq('id', roomId);

      return { success: true };
    }

    return { success: false };
  }
};