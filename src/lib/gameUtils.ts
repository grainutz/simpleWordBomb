
import { WORDS } from './wordList';

// cache the dictionary set
const dictionarySet = new Set(WORDS.map(w => w.toUpperCase()));

const playableWords = WORDS.filter(word => {
  const upper = word.toUpperCase();
  // no short or long words
  if (upper.length < 4 || upper.length > 15) return false;
  
  // take out words with rare consecutive consonants
  const rarePatterns = /[BCDFGHJKLMNPQRSTVWXYZ]{4,}|ELY|XQ|QZ|XZ|BPM|XIM/i;
  if (rarePatterns.test(word)) return false;
  
  return true;
});

const playableSet = new Set(playableWords.map(w => w.toUpperCase()));

export const isValidWord = (word: string, prompt: string): boolean => {
  const upperWord = word.toUpperCase().trim();
  return (
    upperWord.length > 2 &&
    upperWord.includes(prompt.toUpperCase()) &&
    dictionarySet.has(upperWord) 
  );
};

//count words that contain a prompt
const countWordsWithPrompt = (prompt: string): number => {
  let count = 0;
  for (const word of playableWords) {
    if (word.toUpperCase().includes(prompt)) {
      count++;
      if (count > 50) break; 
    }
  }
  return count;
};

export const getRandomPrompt = (): string => {
  const commonPrompts = ["ING", "TION", "ENT", "ER", "ED", "LY", "RE", "UN", "ION", "AL"];
  
  // 40% chance for common
  if (Math.random() < 0.4) {
    return commonPrompts[Math.floor(Math.random() * commonPrompts.length)];
  }

  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;
    
    //playable words
    const randomWord = playableWords[Math.floor(Math.random() * playableWords.length)].toUpperCase();

    if (randomWord.length < 5) continue;

    // 80% chance for 2 letter prompts
    const length = Math.random() > 0.8 ? 3 : 2;

    const maxStart = randomWord.length - length;
    const minStart = Math.min(1, maxStart);
    const start = minStart + Math.floor(Math.random() * (maxStart - minStart + 1));
    const prompt = randomWord.substring(start, start + length);

    const wordCount = countWordsWithPrompt(prompt);
    
    if (wordCount >= 10) {
      // avoid prompts with rare letter combinations
      if (!/X[^AEIOU]|[^AEIOU]X|Q[^U]|[BCDFGHJKLMNPQRSTVWXYZ]{3}/i.test(prompt)) {
        return prompt;
      }
    }
  }

  return commonPrompts[Math.floor(Math.random() * commonPrompts.length)];
};

export const getPromptByDifficulty = (difficulty: 'easy' | 'medium' | 'hard'): string => {
  const easyPrompts = ["ING", "ER", "ED", "LY", "ION", "AL", "EN", "RE"];
  const mediumPrompts = ["ENT", "TION", "CON", "PRE", "BLE", "NESS", "MENT", "IST"];
  
  switch (difficulty) {
    case 'easy':
      return easyPrompts[Math.floor(Math.random() * easyPrompts.length)];
    case 'medium':
      // 50/50 between curated medium prompts and validated random ones
      if (Math.random() < 0.5) {
        return mediumPrompts[Math.floor(Math.random() * mediumPrompts.length)];
      }
      return getRandomPrompt();
    case 'hard':
      return getRandomPrompt();
  }
};