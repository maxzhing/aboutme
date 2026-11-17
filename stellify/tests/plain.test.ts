import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { officialQuestion, QUESTIONS } from '@/data/questions';
import type { PackItem } from '@/data/pack';
import { gradeLevel, METHOD, plainWords, sentences, simpleExplanation } from '@/lib/plain';
import { SKILLS } from '@/lib/taxonomy';

/** An official-style question with explanation notes written for this test (not College Board text). */
const item = (over: Partial<PackItem>): PackItem => ({
  id: 'cb-test', skill: 'tsp', d: 'M', passage: 'A short passage.', stem: 'Which choice best states the main purpose of the text?',
  choices: ['one', 'two', 'three', 'four'], answer: 1, why: [], ...over,
});

describe('In simple words', () => {
  it('drops the formal opening and keeps the evidence and the conclusion', () => {
    const q = officialQuestion(item({ why: [
      'Choice A is incorrect. The text never mentions the harbor at all.',
      'Choice B is the best answer because it most accurately describes the main purpose of the text. The text opens with a description of the old market. It then explains that the market moved twice. Finally, the text indicates that the baker is “quietly delighted” with the new spot. Thus, the main purpose of the text is to show how the baker feels about the move.',
      'Choice C is incorrect because the text doesn’t describe the weather; it focuses on the market.',
      'Choice D is incorrect. There’s no suggestion that the baker plans to leave.',
    ] }));
    const s = simpleExplanation(q)!;
    expect(s.answer).toBe('B');
    expect(s.right).not.toMatch(/most accurately describes the main purpose/);
    expect(s.right).toContain('“quietly delighted”');
    expect(s.right).toMatch(/the text says that/i);
    expect(s.right).toContain('the main purpose of the text is to show how the baker feels');
    expect(s.right).not.toMatch(/\bThus\b|\bis so\b/);
    expect(s.wrong.map((w) => w.letter)).toEqual(['A', 'C', 'D']);
    expect(s.wrong[1].text).toBe('The text doesn’t describe the weather. It focuses on the market.');
    expect(s.wrong[2].text).toBe('The text never says that the baker plans to leave.');
  });

  it('says grammar rules in plain words', () => {
    const q = officialQuestion(item({ skill: 'fss', stem: 'Which choice completes the text so that it conforms to the conventions of Standard English?', why: [
      'Choice A is incorrect because the plural verb “are” doesn’t agree in number with the singular subject “the kite.”',
      'Choice B is the best answer. The convention being tested is subject-verb agreement. The singular verb “is” agrees in number with the singular subject “the kite.”',
      'Choice C is incorrect because the plural verb “were” doesn’t agree in number with the singular subject “the kite.”',
      'Choice D is incorrect because the plural verb “have been” doesn’t agree in number with the singular subject “the kite.”',
    ] }));
    const s = simpleExplanation(q)!;
    expect(s.right).toMatch(/^This tests subject–verb agreement/);
    expect(s.right).toContain('The subject “the kite” is one thing, so the verb must be the one-thing form: “is”.');
    expect(s.wrong[0].text).toBe('The verb “are” is the more-than-one form, but the subject “the kite” is one thing.');
  });

  it('puts the meaning of the word first for vocabulary questions', () => {
    const q = officialQuestion(item({ skill: 'wic', why: [
      'Choice A is incorrect because “hide” would mean conceal, which does not fit.',
      'Choice B is the best answer because it most logically completes the text’s discussion of the lighthouse. As used in this context, “guide” would mean show the way. The text indicates that ships depended on the light at night. This context conveys the idea that the light helped ships find their way.',
      'Choice C is incorrect. Nothing in the text is about a contest.', 'Choice D is incorrect. The text is not about painting.',
    ] }));
    const s = simpleExplanation(q)!;
    expect(s.right.startsWith('As used here, “guide” would mean show the way.')).toBe(true);
    expect(s.right).toContain('So the light helped ships find their way.');
  });

  it('never changes quotations or italic titles', () => {
    expect(plainWords('The text indicates that “therefore it indicates” and *Thus Spoke* matter. Therefore, yes.')).toBe('The text says that “therefore it indicates” and *Thus Spoke* matter. So, yes.');
  });

  it('splits sentences without breaking quotations or abbreviations', () => {
    expect(sentences('Plants like A. thaliana grow fast. She said “wait... no.” Then it rained.')).toEqual(['Plants like A. thaliana grow fast.', 'She said “wait... no.”', 'Then it rained.']);
  });

  it('does not rewrite Math (formulas are lost from PDF text) but gives a plain method', () => {
    const q = officialQuestion(item({ skill: 'nleq', choices: ['A', 'B', 'C', 'D'], answer: 2, image: 'data:image/jpeg;base64,', rationaleImage: 'data:image/jpeg;base64,', why: ['x', 'y', 'Choice C is correct. The given equation yields x = 900.', 'z'] }));
    const s = simpleExplanation(q)!;
    expect(s.rewritten).toBe(false);
    expect(s.right).toBe('');
    expect(s.method.length).toBeGreaterThan(0);
  });

  it('is only for official questions', () => {
    expect(simpleExplanation(QUESTIONS[0])).toBeNull();
  });

  it('has a plain method for every skill, written simply', () => {
    for (const k of SKILLS) {
      expect(METHOD[k.id]?.length, k.id).toBeGreaterThanOrEqual(2);
      expect(gradeLevel(METHOD[k.id].join(' ')), k.id).toBeLessThanOrEqual(11);
    }
    const avg = SKILLS.reduce((s, k) => s + gradeLevel(METHOD[k.id].join(' ')), 0) / SKILLS.length;
    expect(avg).toBeLessThanOrEqual(7);
  });
});

// The College Board's questions are never committed; this runs on the private pack when it exists.
const PACK = join(__dirname, '..', 'private', 'pack.json');
describe.skipIf(!existsSync(PACK))('In simple words for every official Reading & Writing question (private pack)', () => {
  it('is shorter, keeps every quotation and keeps the College Board reasoning', () => {
    const pack = JSON.parse(readFileSync(PACK, 'utf8'));
    const items: PackItem[] = Array.isArray(pack) ? pack : pack.items;
    const qs = items.map(officialQuestion).filter((q) => q.section === 'rw' && q.type === 'mcq');
    expect(qs.length).toBeGreaterThan(500);
    const norm = (x: string) => x.replace(/[.,]”$/, '”');
    const content = (x: string) => new Set((x.toLowerCase().match(/[a-z]{5,}/g) ?? []));
    for (const q of qs) {
      const s = simpleExplanation(q)!;
      expect(s.rewritten, q.id).toBe(true);
      expect(s.right.length, q.id).toBeGreaterThan(20);
      expect(s.wrong, q.id).toHaveLength(3);
      const orig = q.why.join(' ');
      const quotes = (orig.match(/“[^”]*”/g) ?? []).map(norm);
      for (const t of [s.right, ...s.wrong.map((w) => w.text)]) for (const m of t.match(/“[^”]*”/g) ?? []) expect(quotes, `${q.id}: ${m}`).toContain(norm(m));
      // the simple reason is built from the College Board's own reasoning for the right answer
      const cb = content(q.why[q.answer as number]);
      expect([...content(s.right)].filter((w) => cb.has(w)).length, q.id).toBeGreaterThanOrEqual(2);
      expect(s.right.length + s.wrong.reduce((n, w) => n + w.text.length, 0), q.id).toBeLessThanOrEqual(orig.length + 400);
    }
  });
});
