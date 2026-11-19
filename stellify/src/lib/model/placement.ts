import type { Attempt, DomainId, Question, Section, SkillId } from '../types';
import { DOMAINS, SKILLS } from '../taxonomy';
import { PER_TEST } from '../engine/insights';
import { rng, shuffle } from '../util';
import { TIER_B, estimateAbilities, pKnow } from './ability';
import type { Intake } from './intake';

/**
 * The placement check: a short adaptive check that replaces the fixed 28-question diagnostic.
 *
 *  - It covers all eight SAT domains, two questions each (16 in all, about 15–20 minutes), alternating sections.
 *  - Each question's difficulty is chosen from the current estimate so the student has a fair chance
 *    (about 60–70%): a 900-level student is not handed 20 hard questions in a row, and a 1450-level student is
 *    not bored by easy ones.
 *  - Within a domain it asks first about the skills that matter most for this student: the ones they said feel
 *    hard, then the ones that appear most on the test.
 *  - "I have not learned this yet" is an honest answer: it marks the skill as new, so the plan teaches it from
 *    the start instead of drilling it.
 *  - The student can stop at any point; whatever was answered is used.
 */
export const PLACEMENT = { perDomain: 2, sessionPrefix: 'placement-' } as const;
export const PLACEMENT_LENGTH = DOMAINS.length * PLACEMENT.perDomain;

export function placementAnswers(attempts: Attempt[], sessionId: string) { return attempts.filter((a) => a.sessionId === sessionId); }

export function nextPlacementQuestion(o: { bank: Question[]; attempts: Attempt[]; sessionId: string; intake?: Intake; getQ: (id: string) => Question | undefined; now: number }): Question | null {
  const mine = placementAnswers(o.attempts, o.sessionId).map((a) => o.getQ(a.qid)).filter((q): q is Question => !!q);
  if (mine.length >= PLACEMENT_LENGTH) return null;
  const rand = rng(`${o.sessionId}-${mine.length}`);
  // alternate sections, starting with Reading and Writing
  const sec: Section = mine.length % 2 === 0 ? 'rw' : 'math';
  const asked = (d: DomainId) => mine.filter((q) => q.domain === d).length;
  const domains = DOMAINS.filter((d) => d.section === sec && asked(d.id) < PLACEMENT.perDomain).sort((a, b) => asked(a.id) - asked(b.id) || b.weight - a.weight);
  const domain = domains[0];
  if (!domain) return null;
  const ab = estimateAbilities(o.attempts, o.getQ, o.now, o.intake);
  const askedSkills = new Set(mine.map((q) => q.skill));
  const hardSaid = new Set(ab.skills ? Object.values(ab.skills).filter((s) => s.saidHard).map((s) => s.skill) : []);
  const skills = SKILLS.filter((k) => k.domain === domain.id && !askedSkills.has(k.id))
    .sort((a, b) => Number(ab.skills[a.id].notTaught) - Number(ab.skills[b.id].notTaught) || Number(hardSaid.has(b.id)) - Number(hardSaid.has(a.id)) || PER_TEST[b.id] - PER_TEST[a.id] || rand() - 0.5);
  const seen = new Set(o.attempts.map((a) => a.qid));
  for (const k of skills.length ? skills : SKILLS.filter((s) => s.domain === domain.id)) {
    const th = ab.skills[k.id as SkillId].theta;
    // aim for about a 65% chance of knowing it; never the Beyond-SAT tier
    const pool = shuffle(o.bank.filter((q) => q.skill === k.id && q.difficulty !== 'elite' && !q.official && !seen.has(q.id) && !(q as Question & { remix?: unknown }).remix), rand)
      .sort((a, b) => Math.abs(pKnow(th, TIER_B[a.difficulty]) - 0.65) - Math.abs(pKnow(th, TIER_B[b.difficulty]) - 0.65));
    if (pool[0]) return pool[0];
  }
  return null;
}
