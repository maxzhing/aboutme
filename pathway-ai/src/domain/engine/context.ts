/* ==========================================================================
   Engine context — the single shared input every recommendation reads.
   Section 42: one student profile object that all AI features use.
   ========================================================================== */

import type { AccountState, GradeLevel, LearnedPreference, StudentProfile } from '@/domain/types';
import { MAJOR_BY_ID } from '@/data/majors';
import { INTEREST_BY_ID } from '@/data/interests';
import { average, sum, uniq } from '@/lib/format';
import { todayISO } from '@/lib/date';

export interface Constraints {
  maxCostPerYear?: number;
  maxDistanceMiles?: number;
  excludedStates: Set<string>;
  excludedRegions: Set<string>;
  excludedCategories: Set<string>;
  excludedTags: Set<string>;
  /** Weekly hours genuinely available for something new. */
  availableWeeklyHours: number;
  notes: string[];
}

export interface EngineContext {
  profile: StudentProfile;
  account: AccountState;
  today: string;
  grade: GradeLevel;
  /** Grades remaining including the current one. */
  gradesRemaining: number;
  /** Major ids in confidence order, most committed first. */
  majorIds: string[];
  primaryMajorId?: string;
  /** Interest ids including catalog-matched custom entries. */
  interestIds: string[];
  /** Union of interest signals from chosen majors plus stated interests. */
  signalSet: Set<string>;
  careerIds: string[];
  constraints: Constraints;
  /** Total committed hours per week across activities. */
  committedHours: number;
  /** Ids the student has told us not to suggest. */
  dismissed: Set<string>;
  /** Best available SAT total, official preferred over practice. */
  satTotal?: number;
  satMath?: number;
  satVerbal?: number;
  actComposite?: number;
  gpa4?: number;
}

const CONFIDENCE_ORDER: Record<string, number> = { firm: 0, leaning: 1, exploring: 2, undecided: 3 };

/** Normalises a GPA onto a 4.0 scale so comparisons stay honest. */
export function normalizeGpa(profile: StudentProfile): number | undefined {
  const { gpa, gpaScale } = profile.academics;
  if (gpa === undefined || Number.isNaN(gpa)) return undefined;
  switch (gpaScale) {
    case '4.0':
      return Math.min(gpa, 4.3);
    case '5.0':
      return Math.min((gpa / 5) * 4, 4.3);
    case '100':
      // Common US conversion bands, deliberately coarse.
      if (gpa >= 93) return 4.0;
      if (gpa >= 90) return 3.7;
      if (gpa >= 87) return 3.3;
      if (gpa >= 83) return 3.0;
      if (gpa >= 80) return 2.7;
      if (gpa >= 77) return 2.3;
      if (gpa >= 70) return 2.0;
      return 1.5;
    default:
      return gpa <= 4.3 ? gpa : undefined;
  }
}

export function bestSat(account: AccountState): { total?: number; math?: number; verbal?: number } {
  const official = account.profile.scores.filter((s) => s.kind === 'SAT' && s.official && s.total);
  const fromProfile = official.length
    ? official.reduce((a, b) => ((b.total ?? 0) > (a.total ?? 0) ? b : a))
    : undefined;
  if (fromProfile?.total) {
    return {
      total: fromProfile.total,
      math: fromProfile.sections?.find((x) => /math/i.test(x.label))?.score,
      verbal: fromProfile.sections?.find((x) => /read|writ|verbal/i.test(x.label))?.score,
    };
  }
  // Fall back to the most recent practice test, which the UI always labels as practice.
  const practice = account.satScores.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (practice) return { total: practice.total, math: practice.math, verbal: practice.readingWriting };
  const psat = account.profile.scores.find((s) => s.kind === 'PSAT' && s.total);
  if (psat?.total) {
    return {
      total: psat.total,
      math: psat.sections?.find((x) => /math/i.test(x.label))?.score,
      verbal: psat.sections?.find((x) => /read|writ/i.test(x.label))?.score,
    };
  }
  return {};
}

function buildConstraints(profile: StudentProfile, learned: LearnedPreference[]): Constraints {
  const active = learned.filter((p) => p.active);
  const c: Constraints = {
    maxCostPerYear: profile.collegePrefs.budgetPerYear,
    maxDistanceMiles: profile.collegePrefs.maxDistanceMiles,
    excludedStates: new Set(profile.collegePrefs.avoidStates),
    excludedRegions: new Set(),
    excludedCategories: new Set(),
    excludedTags: new Set(),
    availableWeeklyHours: 0,
    notes: [],
  };
  for (const pref of active) {
    switch (pref.kind) {
      case 'exclude-state':
        if (typeof pref.value === 'string') c.excludedStates.add(pref.value);
        break;
      case 'exclude-region':
        if (typeof pref.value === 'string') c.excludedRegions.add(pref.value);
        break;
      case 'max-cost':
        if (typeof pref.value === 'number') {
          c.maxCostPerYear = c.maxCostPerYear === undefined ? pref.value : Math.min(c.maxCostPerYear, pref.value);
        }
        break;
      case 'max-hours':
        if (typeof pref.value === 'number') c.availableWeeklyHours = pref.value;
        break;
      case 'exclude-category':
        if (typeof pref.value === 'string') c.excludedCategories.add(pref.value);
        break;
      case 'exclude-tag':
        if (typeof pref.value === 'string') c.excludedTags.add(pref.value);
        break;
      default:
        c.notes.push(pref.statement);
    }
  }
  return c;
}

/**
 * Estimates hours a student could realistically add per week. Deliberately
 * conservative: over-promising time is how plans fail.
 */
function estimateAvailableHours(profile: StudentProfile, committed: number): number {
  const study = profile.academics.weeklyStudyHours ?? 8;
  const rigorAllowance = profile.rigorTolerance === 'heavy' ? 4 : profile.rigorTolerance === 'light' ? -3 : 0;
  // A high school week leaves roughly 45 discretionary hours after school,
  // sleep and meals. Existing commitments and study time come out of that.
  const raw = 45 - committed - study * 0.5 + rigorAllowance;
  // Floor at 2 rather than 0: a student with a full week can still take on
  // something small, and reporting zero makes every recommendation unusable.
  return Math.max(2, Math.round(raw));
}

export function buildContext(account: AccountState): EngineContext {
  const profile = account.profile;
  const majorIds = profile.majors
    .slice()
    .sort((a, b) => (CONFIDENCE_ORDER[a.confidence] ?? 9) - (CONFIDENCE_ORDER[b.confidence] ?? 9))
    .map((m) => m.majorId)
    .filter((id) => MAJOR_BY_ID.has(id));

  const interestIds = uniq([
    ...profile.interests.filter((id) => INTEREST_BY_ID.has(id)),
    // Match free-text interests against the catalog so they still drive recommendations.
    ...profile.customInterests.flatMap((text) => {
      const lower = text.toLowerCase();
      const hit = Array.from(INTEREST_BY_ID.values()).find(
        (i) => lower.includes(i.name.toLowerCase()) || i.name.toLowerCase().includes(lower),
      );
      return hit ? [hit.id] : [];
    }),
  ]);

  const signalSet = new Set<string>(interestIds);
  for (const id of majorIds) {
    const major = MAJOR_BY_ID.get(id);
    major?.interestSignals.forEach((s) => signalSet.add(s));
  }

  const committedHours = sum(profile.activities.map((a) => a.hoursPerWeek ?? 0));
  const constraints = buildConstraints(profile, account.learnedPreferences);
  if (!constraints.availableWeeklyHours) {
    constraints.availableWeeklyHours = estimateAvailableHours(profile, committedHours);
  }

  const sat = bestSat(account);
  const act = profile.scores.filter((s) => s.kind === 'ACT' && s.total);
  const gradesRemaining = Math.max(0, 12 - profile.academics.grade + 1);

  return {
    profile,
    account,
    today: todayISO(),
    grade: profile.academics.grade,
    gradesRemaining,
    majorIds,
    primaryMajorId: majorIds[0],
    interestIds,
    signalSet,
    careerIds: profile.careers,
    constraints,
    committedHours,
    dismissed: new Set(account.dismissedRecommendationIds),
    satTotal: sat.total,
    satMath: sat.math,
    satVerbal: sat.verbal,
    actComposite: act.length ? Math.max(...act.map((a) => a.total ?? 0)) : undefined,
    gpa4: normalizeGpa(profile),
  };
}

/** Jaccard-style overlap used throughout matching, 0–1. */
export function overlapScore(a: Iterable<string>, b: Iterable<string>): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (!setA.size || !setB.size) return 0;
  let shared = 0;
  for (const x of setA) if (setB.has(x)) shared++;
  return shared / Math.min(setA.size, setB.size);
}

/** Average of defined values only, so missing data never reads as zero. */
export function meanDefined(values: (number | undefined)[]): number | undefined {
  const present = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  return present.length ? average(present) : undefined;
}
