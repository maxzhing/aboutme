import { getQuestion, QUESTIONS } from '@/data/questions';
import { snapshot, useStore } from './store';
import { offlineTutor, TUTOR_MODES, type TutorMode, type TutorReply } from './engine/tutor';
import { findWeaknesses } from './engine/adaptive';
import { LETTERS, correctAnswerLabel } from './answers';
import { plain } from './richtext';
import { DIFFICULTY_NAME, SKILL } from './taxonomy';
import { dateKey } from './util';
import type { Question, TutorMessage } from './types';

/**
 * OPTIONAL AI ENHANCEMENT (Google Gemini Developer API, free tier).
 *
 * Stellify is a single offline file, so there is no server to hold a key. If a student chooses to
 * paste their own free AI Studio key in Settings, it is stored only in this browser and requests
 * go straight from this browser to Google. Without a key, or on any error or rate limit, the
 * built-in tutor answers from the validated explanations instead. Free-tier model names and
 * quotas change; the model is configurable and Stellify keeps its own conservative caps.
 */
export const DEFAULT_MODEL = 'gemini-flash-latest';
const API = 'https://generativelanguage.googleapis.com/v1beta';
const MIN_GAP_MS = 4000;
const DAILY_CAP = 60;
let lastCall = 0;
let cooldownUntil = 0;

export interface AiStatus { enabled: boolean; model?: string; reason?: string }
export function aiStatus(): Promise<AiStatus> {
  const s = useStore.getState().settings;
  if (!s.geminiKey) return Promise.resolve({ enabled: false, reason: 'No AI key added. The built-in tutor is active.' });
  return Promise.resolve({ enabled: true, model: s.geminiModel || DEFAULT_MODEL });
}

const usageKey = () => `stellify-ai-${dateKey()}`;
const usedToday = () => { try { return Number(localStorage.getItem(usageKey()) ?? 0); } catch { return 0; } };
const bump = () => { try { localStorage.setItem(usageKey(), String(usedToday() + 1)); } catch { /* ignore */ } };

/** Checks a key by listing the models it can use. Returns model ids that support text generation. */
export async function testGeminiKey(key: string): Promise<{ ok: boolean; models: string[]; error?: string }> {
  try {
    const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) return { ok: false, models: [], error: res.status === 400 || res.status === 403 ? 'Google rejected this key. Check that it was copied completely.' : `Google returned status ${res.status}.` };
    const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const models = (data.models ?? []).filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''));
    return { ok: true, models };
  } catch { return { ok: false, models: [], error: 'Could not reach Google. Check your internet connection.' }; }
}

function questionBrief(q: Question, answered: boolean, answer: string | null | undefined): string {
  const lines = [`SKILL: ${SKILL[q.skill].name} — ${q.sub} (${DIFFICULTY_NAME[q.difficulty]})`];
  if (q.passage) lines.push(`PASSAGE: ${plain(q.passage)}`);
  if (q.notes) lines.push(`NOTES: ${q.notes.map(plain).join(' | ')}`);
  if (q.figure?.kind === 'table') lines.push(`TABLE: ${q.figure.headers.join(' | ')} :: ${q.figure.rows.map((r) => r.join(' | ')).join(' ;; ')}`);
  lines.push(`QUESTION: ${q.stem}`);
  if (q.choices) lines.push(`CHOICES: ${q.choices.map((c, i) => `${LETTERS[i]}) ${c}`).join('  ')}`);
  lines.push(`CONCEPT: ${q.concept}`, `STRATEGY: ${q.strategy}`, `COMMON TRAP: ${q.trap}`);
  if (answered) {
    lines.push(`VALIDATED CORRECT ANSWER: ${correctAnswerLabel(q)}`, `VALIDATED SOLUTION STEPS: ${q.steps.join(' ')}`,
      `VALIDATED RATIONALES: ${q.why.map((w, i) => (q.choices ? `${LETTERS[i]}: ${w}` : w)).join(' || ')}`,
      `STUDENT ANSWER: ${q.type === 'mcq' ? LETTERS[Number(answer)] ?? 'none' : answer}`);
  } else {
    lines.push(`FIRST STEPS (safe to share): ${q.steps.slice(0, -1).join(' ')}`, 'The student has NOT answered yet. Do not state or confirm which choice or value is correct, and do not rule out specific choices.');
  }
  return lines.join('\n');
}

export interface AskArgs { mode: TutorMode; message?: string; qid?: string; answer?: string | null; hintsGiven?: number; socraticStep?: number; history?: TutorMessage[] }
export interface AskResult extends TutorReply { source: 'offline' | 'gemini'; notice?: string }

/**
 * Asks the tutor. Hints, Socratic steps and challenges always come from validated data so they
 * can never leak or invent an answer. Other modes try the AI model first when it is enabled.
 */
export async function askTutor(a: AskArgs): Promise<AskResult> {
  const state = snapshot();
  const q = a.qid ? getQuestion(a.qid) : undefined;
  const offline = (notice?: string): AskResult => ({ ...offlineTutor({ mode: a.mode, message: a.message, question: q, answer: a.answer, hintsGiven: a.hintsGiven, socraticStep: a.socraticStep, state, bank: QUESTIONS, getQ: getQuestion }), source: 'offline', notice });
  const { aiEnabled, aiConsent, geminiKey, geminiModel } = useStore.getState().settings;
  if (!aiEnabled || !aiConsent || !geminiKey || a.mode === 'hint' || a.mode === 'socratic' || a.mode === 'challenge') return offline();
  const now = Date.now();
  if (now < cooldownUntil) return offline('The free AI quota is resting for a minute, so this answer comes from Stellify\'s built-in explanations.');
  if (usedToday() >= DAILY_CAP) return offline(`Stellify limits AI replies to ${DAILY_CAP} a day to protect your free quota. Built-in explanations are unlimited.`);
  if (now - lastCall < MIN_GAP_MS) await new Promise((r) => setTimeout(r, MIN_GAP_MS - (now - lastCall)));
  lastCall = Date.now();

  const answered = a.answer != null && a.answer !== '';
  const modeLabel = TUTOR_MODES.find((m) => m.id === a.mode)?.label ?? 'Answer the student\'s question';
  const weak = findWeaknesses(state, getQuestion, 3).map((w) => SKILL[w.skill].name);
  const system = [
    'You are the Stellify SAT tutor for a high-school student preparing for the Digital SAT.',
    'Be warm, concise and precise. Use short paragraphs, **bold** labels and bullet lines starting with "• ". Write math as $...$ LaTeX.',
    'Ground everything about the current question in the VALIDATED data provided. Never contradict the validated answer or invent a different one. If the data does not cover what is asked, say you are not certain rather than guessing.',
    'Never ask for or mention personal information. Stay on SAT preparation.',
    q ? `CURRENT QUESTION DATA\n${questionBrief(q, answered, a.answer)}` : 'No specific question is open. Answer general SAT questions briefly and accurately; if unsure, say so.',
    weak.length ? `The student's weakest skills right now: ${weak.join(', ')}.` : '',
    `TUTOR MODE: ${modeLabel}.`,
  ].filter(Boolean).join('\n\n');
  const contents = [
    ...(a.history ?? []).slice(-6).map((m) => ({ role: m.role === 'student' ? 'user' : 'model', parts: [{ text: m.text.slice(0, 800) }] })),
    { role: 'user', parts: [{ text: (a.message ?? modeLabel).slice(0, 1200) }] },
  ];
  try {
    const res = await fetch(`${API}/models/${encodeURIComponent(geminiModel || DEFAULT_MODEL)}:generateContent`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.3, maxOutputTokens: 800 } }),
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 429) { cooldownUntil = Date.now() + 60_000; return offline('The free AI quota is used up for the moment, so this answer comes from Stellify\'s built-in explanations.'); }
    if (!res.ok) return offline(res.status === 404 ? 'That AI model is not available for your key. Pick another model in Settings. Showing the built-in explanation instead.' : 'The AI service returned an error, so this answer comes from Stellify\'s built-in explanations.');
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
    if (!text) return offline('The AI returned an empty reply, so this answer comes from Stellify\'s built-in explanations.');
    bump();
    return { text, links: offline().links, source: 'gemini' };
  } catch {
    return offline('The AI service could not be reached, so this answer comes from Stellify\'s built-in explanations.');
  }
}
