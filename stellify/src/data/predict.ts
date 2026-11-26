import type { SkillId } from '@/lib/types';

/**
 * Predict-First (N8): what to predict before the choices appear, per Reading & Writing question type, plus
 * quick picks where a short label is the natural prediction. Original wording.
 */
export const PREDICT: Partial<Record<SkillId, { prompt: string; picks?: string[] }>> = {
  cid: { prompt: 'In one sentence: what is the text mainly about?' },
  coet: { prompt: 'What would the evidence have to show to do what the question asks (support, weaken, illustrate)?' },
  coeq: { prompt: 'What does the data actually show? Name the comparison or trend the claim needs.' },
  inf: { prompt: 'What must be true, given the passage? Finish the thought in your own words.' },
  wic: { prompt: 'What word would you put in the blank (or what does the word mean here)? Use your own word.' },
  tsp: { prompt: 'What job does the text (or the underlined part) do?', picks: ['introduce a claim', 'give an example', 'contrast', 'qualify a claim', 'explain a cause', 'conclude'] },
  ctc: { prompt: 'How would the second author respond to the first? Agree, disagree, or partly, and why?' },
  tra: { prompt: 'How do the two sentences relate?', picks: ['contrast', 'addition', 'cause and effect', 'example', 'sequence', 'similarity', 'emphasis'] },
  syn: { prompt: 'What goal must the sentence meet, and which notes does it need?' },
  bnd: { prompt: 'Is each side of the blank a complete sentence? What punctuation can join them?', picks: ['period or semicolon', 'comma + and/but', 'colon', 'comma only', 'no punctuation'] },
  fss: { prompt: 'What has to agree with what? Name the rule.', picks: ['subject–verb agreement', 'pronoun agreement', 'verb tense', 'modifier placement', 'parallel structure', 'possessive'] },
};
