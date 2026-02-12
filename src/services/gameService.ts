import { supabase } from '@/lib/supabase';
import { isValidWord, getPromptByDifficulty } from '@/lib/gameUtils';
import type { GameConfig, Player } from '@/hooks/useGameRoom';

// Valentine mode: "WILL YOU BE MY VALENTINE? YES!"
const VALENTINE_PROMPTS_P1 = ['IL', 'OU', 'BE', 'MY', 'AL'];
const VALENTINE_PROMPT_P2 = 'YE';

function getNextPrompt(
  gameConfig: GameConfig, 
  currentPrompt: string, 
  nextTurn: number,
  valentineRoundCount: number
): string {
  if (!gameConfig.valentineMode) {
    return getPromptByDifficulty(gameConfig.difficulty);
  }

  // Valentine mode logic
  if (nextTurn === 1) {
    // P1's turn: cycle through WILL YOU BE MY VALENTINE prompts
    const p1Index = valentineRoundCount % VALENTINE_PROMPTS_P1.length;
    return VALENTINE_PROMPTS_P1[p1Index];
  } else {
    // P2's turn: check if P1 just finished "AL" (last prompt)
    const p1JustFinishedAL = currentPrompt === 'AL';
    
    if (p1JustFinishedAL) {
      // Time for the proposal! P2 gets "YES!"
      return VALENTINE_PROMPT_P2;
    } else {
      // P2 gets normal prompts until the big question
      return getPromptByDifficulty(gameConfig.difficulty);
    }
  }
}

export const gameService = {
  async handleTimeout(
    roomId: string,
    turn: number,
    players: Player[],
    gameConfig: GameConfig
  ) {
    const isP1 = turn === 1;
    const nextTurn = turn === 1 ? 2 : 1;
    
    // Fetch current state to get prompt and round count
    const { data } = await supabase
      .from('rooms')
      .select('prompt, valentine_round_count')
      .eq('id', roomId)
      .single();
    
    const nextPrompt = getNextPrompt(
      gameConfig, 
      data?.prompt || '', 
      nextTurn,
      data?.valentine_round_count || 0
    );
    
    await supabase.from('rooms').update({
      p1_lives: isP1 ? players[0].lives - 1 : players[0].lives,
      p2_lives: !isP1 ? players[1].lives - 1 : players[1].lives,
      current_turn: nextTurn,
      prompt: nextPrompt,
      current_timer_value: gameConfig.duration,
      valentine_round_count: nextTurn === 1 ? (data?.valentine_round_count || 0) + 1 : (data?.valentine_round_count || 0)
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
    const initialPrompt = gameConfig.valentineMode 
      ? VALENTINE_PROMPTS_P1[0] // Start with "IL" (WILL)
      : getPromptByDifficulty(gameConfig.difficulty);
    
    await supabase.from('rooms').update({
      is_started: true,
      p1_lives: gameConfig.maxLives,
      p2_lives: gameConfig.maxLives,
      prompt: initialPrompt,
      used_words: [],
      valentine_round_count: 0
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
      const nextTurn = turn === 1 ? 2 : 1;

      const isValentineSuccess = gameConfig.valentineMode && turn === 2 && prompt === 'YE';
      
      // Fetch current round count for Valentine mode
      const { data } = await supabase
        .from('rooms')
        .select('valentine_round_count')
        .eq('id', roomId)
        .single();
      
      const nextPrompt = getNextPrompt(
        gameConfig, 
        prompt, 
        nextTurn,
        data?.valentine_round_count || 0
      );
      
      await supabase.from('rooms').update({
        prompt: nextPrompt,
        current_turn: nextTurn,
        used_words: [cleanInput, ...usedWords],
        current_timer_value: gameConfig.duration,
        valentine_success: isValentineSuccess,
        valentine_round_count: nextTurn === 1 ? (data?.valentine_round_count || 0) + 1 : (data?.valentine_round_count || 0)
      }).eq('id', roomId);

      return { success: true };
    }

    return { success: false };
  }
};