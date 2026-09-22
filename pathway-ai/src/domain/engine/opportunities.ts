import type { Explanation, Opportunity, ResearchProgram, Scholarship } from '@/domain/types';
import { OPPORTUNITIES } from '@/data/opportunities';
import { RESEARCH_PROGRAMS } from '@/data/research';
import { SCHOLARSHIPS } from '@/data/scholarships';
import { MAJOR_BY_ID } from '@/data/majors';
import { INTEREST_BY_ID } from '@/data/interests';
import { clamp, listJoin, uniq } from '@/lib/format';
import type { EngineContext } from './context';
import { explanation } from './explain';

/* ==========================================================================
   Opportunity, research and scholarship matching — sections 10, 27, 28
   Every card answers "why this, for you" and the engine respects the student's
   own constraints on cost, time and distance.
   ========================================================================== */

export interface ScoredOpportunity {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
  blockers: string[];
  explanation: Explanation;
}

const COST_WEIGHT: Record<Opportunity['cost'], number> = {
  free: 14,
  stipend: 18,
  low: 8,
  moderate: -6,
  high: -20,
  varies: 0,
};

function feedbackFor(ctx: EngineContext, targetId: string) {
  return ctx.account.feedback.filter((f) => f.targetId === targetId);
}

export function scoreOpportunity(ctx: EngineContext, op: Opportunity): ScoredOpportunity {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  if (!op.grades.includes(ctx.grade)) {
    blockers.push(`Intended for grades ${op.grades.join(', ')} — you are in grade ${ctx.grade}`);
    score -= 45;
  } else {
    score += 8;
  }

  const majorHits = op.majorTags.filter((m) => ctx.majorIds.includes(m));
  if (majorHits.length) {
    score += 26 + majorHits.length * 5;
    reasons.push(`Directly relevant to ${listJoin(majorHits.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
  }

  const interestHits = op.interestTags.filter((t) => ctx.signalSet.has(t));
  if (interestHits.length) {
    score += 18 + interestHits.length * 4;
    reasons.push(`Matches your interest in ${listJoin(interestHits.map((t) => INTEREST_BY_ID.get(t)?.name ?? t).slice(0, 3))}`);
  }

  score += COST_WEIGHT[op.cost];
  if (op.cost === 'free' || op.cost === 'stipend') {
    reasons.push(op.cost === 'stipend' ? 'Paid rather than paid-for' : 'Free to take part');
  }
  if (ctx.constraints.maxCostPerYear !== undefined && ctx.constraints.maxCostPerYear < 20000 && op.cost === 'high') {
    blockers.push('High cost, and you told us budget matters');
    score -= 22;
  }

  // Time honesty: a student with a full week should see the light options
  // first, and should be told plainly when something does not fit.
  const estimatedHours = op.commitment * 3;
  const free = ctx.constraints.availableWeeklyHours;
  const overrun = estimatedHours - free;
  if (overrun > 4) {
    blockers.push(`Roughly ${estimatedHours} hrs/week, well above the ~${free} hrs/week we estimate you have free`);
    score -= 34;
  } else if (overrun > 0) {
    blockers.push(`Roughly ${estimatedHours} hrs/week against the ~${free} hrs/week we estimate you have free — tight but possible`);
    score -= 10;
  } else if (op.commitment <= 2) {
    score += 8;
  }

  // Does the student already do something very like this?
  const alreadyDoing = ctx.profile.activities.some(
    (a) =>
      a.name.toLowerCase().includes(op.name.toLowerCase().split(' ')[0]) ||
      (a.category === 'competition' && op.category === 'competition' && a.name.toLowerCase().includes(op.name.toLowerCase().slice(0, 8))),
  );
  if (alreadyDoing) {
    blockers.push('You appear to already be involved in this');
    score -= 30;
  }

  // Location and format.
  const state = ctx.profile.academics.state;
  if (op.format === 'online') {
    score += 6;
    reasons.push('Runs online, so location is not a constraint');
  } else if (op.state && state && op.state !== state) {
    score -= 6;
    blockers.push(`Held in ${op.state}, away from your state`);
  }

  // Student feedback is authoritative and overrides scoring.
  for (const fb of feedbackFor(ctx, op.id)) {
    if (fb.kind === 'not-interested') score -= 100;
    if (fb.kind === 'too-expensive') score -= 60;
    if (fb.kind === 'too-far') score -= 60;
    if (fb.kind === 'too-time-consuming') score -= 60;
    if (fb.kind === 'already-doing') score -= 80;
    if (fb.kind === 'interested' || fb.kind === 'saved') score += 25;
  }
  if (ctx.constraints.excludedCategories.has(op.category)) score -= 80;
  if (op.interestTags.some((t) => ctx.constraints.excludedTags.has(t))) score -= 60;

  // A difficulty far above the student's demonstrated level is not a fit.
  if (op.difficulty >= 5 && ctx.grade <= 9) {
    blockers.push('Very selective and usually entered by older students with more preparation');
    score -= 12;
  }

  return {
    opportunity: op,
    score: clamp(score, -100, 100),
    reasons,
    blockers,
    explanation: explanation({
      whyThis: reasons.length
        ? reasons[0]
        : `This is a broadly useful ${op.category.replace('-', ' ')} option, though it does not connect strongly to what you have told us yet.`,
      whyNow:
        op.deadlineMonth !== undefined
          ? `Applications usually open around ${monthName(op.deadlineMonth)}, so the work starts before that.`
          : 'This runs on a rolling basis, so timing is up to you.',
      connection: reasons.slice(1).join(' ') || 'Connects loosely to your stated interests.',
      requires: `${op.hoursPerWeek ?? `Commitment level ${op.commitment}/5`}. ${op.suggestedPrep.slice(0, 2).join(' ')}`.trim(),
      alternatives: blockers.length
        ? ['Something with a lower time commitment', 'A local or online version of the same thing']
        : ['Doing nothing extra this term and going deeper in what you already do'],
      uncertainty: 'Eligibility and deadline details here are demo data. Check the official site before planning around them.',
      evidence: uniq([
        ...(ctx.majorIds.length ? [`Majors: ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`] : []),
        `Grade ${ctx.grade}`,
        `About ${ctx.constraints.availableWeeklyHours} free hours a week after current commitments`,
      ]),
    }),
  };
}

function monthName(m: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][
    Math.max(0, Math.min(11, m - 1))
  ];
}

export interface OpportunityFilters {
  categories?: Opportunity['category'][];
  format?: Opportunity['format'] | 'any';
  maxCommitment?: number;
  costs?: Opportunity['cost'][];
  query?: string;
  includeBlocked?: boolean;
}

export function findOpportunities(ctx: EngineContext, filters: OpportunityFilters = {}, limit = 40): ScoredOpportunity[] {
  const q = filters.query?.trim().toLowerCase();
  return OPPORTUNITIES.filter((op) => {
    if (filters.categories?.length && !filters.categories.includes(op.category)) return false;
    if (filters.format && filters.format !== 'any' && op.format !== filters.format) return false;
    if (filters.maxCommitment && op.commitment > filters.maxCommitment) return false;
    if (filters.costs?.length && !filters.costs.includes(op.cost)) return false;
    if (q && !`${op.name} ${op.description} ${op.organization ?? ''} ${op.skillsBuilt.join(' ')}`.toLowerCase().includes(q)) return false;
    return true;
  })
    .map((op) => scoreOpportunity(ctx, op))
    .filter((s) => filters.includeBlocked || s.score > -40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ---------------------------------------------------------------- Research */

export interface ScoredResearch {
  program: ResearchProgram;
  score: number;
  reasons: string[];
  blockers: string[];
}

export function findResearch(
  ctx: EngineContext,
  filters: { subject?: string; format?: string; paid?: string; maxSelectivity?: number; query?: string } = {},
): ScoredResearch[] {
  const q = filters.query?.trim().toLowerCase();
  return RESEARCH_PROGRAMS.filter((p) => {
    if (filters.subject && !p.subjects.includes(filters.subject)) return false;
    if (filters.format && filters.format !== 'any' && p.format !== filters.format) return false;
    if (filters.paid && filters.paid !== 'any' && p.paid !== filters.paid) return false;
    if (filters.maxSelectivity && p.selectivity > filters.maxSelectivity) return false;
    if (q && !`${p.name} ${p.host} ${p.description}`.toLowerCase().includes(q)) return false;
    return true;
  })
    .map((program) => {
      const reasons: string[] = [];
      const blockers: string[] = [];
      let score = 0;

      if (!program.grades.includes(ctx.grade)) {
        blockers.push(`Usually for grades ${program.grades.join(', ')}`);
        score -= 35;
      }
      const majorHits = program.majorTags.filter((m) => ctx.majorIds.includes(m));
      if (majorHits.length) {
        score += 30;
        reasons.push(`Matches ${listJoin(majorHits.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
      }
      const subjectHits = program.subjects.filter((s) => ctx.signalSet.has(s) || ctx.majorIds.includes(s));
      if (subjectHits.length) {
        score += 18;
        reasons.push(`Covers ${listJoin(subjectHits.slice(0, 3))}`);
      }
      if (program.paid === 'paid' || program.paid === 'stipend') {
        score += 16;
        reasons.push('Paid, so cost is not a barrier');
      }
      if (program.selectivity >= 5) {
        score -= 8;
        blockers.push('Extremely selective — worth applying to, but not worth planning around');
      }
      if (program.selectivity <= 2) {
        score += 14;
        reasons.push('Accessible rather than lottery-like — a realistic route to real research');
      }
      if (program.format === 'online') {
        score += 6;
        reasons.push('Runs remotely');
      }
      if (program.state && ctx.profile.academics.state && program.state === ctx.profile.academics.state) {
        score += 12;
        reasons.push(`Based in ${program.state}, your state`);
      }
      for (const fb of feedbackFor(ctx, program.id)) {
        if (fb.kind === 'not-interested') score -= 100;
        if (fb.kind === 'too-expensive' || fb.kind === 'too-far') score -= 55;
        if (fb.kind === 'interested' || fb.kind === 'saved') score += 25;
      }
      return { program, score, reasons, blockers };
    })
    .sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------ Scholarships */

export interface ScoredScholarship {
  scholarship: Scholarship;
  score: number;
  reasons: string[];
  cautions: string[];
  eligibilityUnknown: string[];
}

export function findScholarships(
  ctx: EngineContext,
  filters: { grade?: number; major?: string; minAmount?: number; query?: string } = {},
): ScoredScholarship[] {
  const q = filters.query?.trim().toLowerCase();
  return SCHOLARSHIPS.filter((s) => {
    if (filters.major && s.majorTags.length && !s.majorTags.includes(filters.major)) return false;
    if (filters.minAmount && (s.amountMax ?? s.amountMin ?? 0) < filters.minAmount) return false;
    if (q && !`${s.name} ${s.sponsor} ${s.description}`.toLowerCase().includes(q)) return false;
    return true;
  })
    .map((scholarship) => {
      const reasons: string[] = [];
      const cautions: string[] = [];
      const eligibilityUnknown: string[] = [];
      let score = 0;

      if (scholarship.grades.includes(ctx.grade)) {
        score += 22;
        reasons.push(`Open to grade ${ctx.grade} students`);
      } else if (scholarship.grades.some((g) => g > ctx.grade)) {
        score += 6;
        reasons.push(`Worth noting now — you apply in grade ${Math.min(...scholarship.grades.filter((g) => g > ctx.grade))}`);
      } else {
        score -= 40;
        cautions.push('The application window for your grade has passed');
      }

      const majorHits = scholarship.majorTags.filter((m) => ctx.majorIds.includes(m));
      if (majorHits.length) {
        score += 24;
        reasons.push(`Targets ${listJoin(majorHits.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
      } else if (!scholarship.majorTags.length) {
        score += 8;
        reasons.push('Open to any intended major');
      }

      if (scholarship.states?.length && ctx.profile.academics.state) {
        if (scholarship.states.includes(ctx.profile.academics.state)) {
          score += 20;
          reasons.push(`Restricted to ${listJoin(scholarship.states)} — which includes you`);
        } else {
          score -= 60;
          cautions.push(`Restricted to ${listJoin(scholarship.states)}`);
        }
      }

      // GPA thresholds we can actually check.
      const gpaText = scholarship.academicRequirements?.find((r) => /gpa/i.test(r));
      const threshold = gpaText ? Number(gpaText.match(/(\d\.\d+)/)?.[1]) : undefined;
      if (threshold && ctx.gpa4 !== undefined) {
        if (ctx.gpa4 >= threshold) {
          score += 14;
          reasons.push(`You meet the stated ${threshold} GPA requirement`);
        } else {
          score -= 45;
          cautions.push(`Requires a ${threshold} GPA; yours is currently ${ctx.gpa4.toFixed(2)}`);
        }
      } else if (threshold) {
        eligibilityUnknown.push(`Requires a ${threshold} GPA — add your GPA so we can check this.`);
      }

      if (scholarship.amountMax && scholarship.amountMax >= 20000) score += 10;
      if (scholarship.renewable) {
        score += 8;
        reasons.push('Renewable across multiple years');
      }
      if (ctx.profile.collegePrefs.aidImportance >= 4) score += 8;

      // Eligibility we genuinely cannot evaluate — say so rather than guess.
      const sensitive = scholarship.eligibility.filter((e) =>
        /heritage|income|Pell|citizen|minority|Black|Hispanic|woman|adversity|resident/i.test(e),
      );
      if (sensitive.length) {
        eligibilityUnknown.push(
          `We do not ask for the information needed to check: ${listJoin(sensitive.slice(0, 2))}. Read the criteria yourself.`,
        );
      }

      for (const fb of feedbackFor(ctx, scholarship.id)) {
        if (fb.kind === 'not-interested') score -= 100;
        if (fb.kind === 'saved' || fb.kind === 'interested') score += 20;
      }

      return { scholarship, score, reasons, cautions, eligibilityUnknown };
    })
    .sort((a, b) => b.score - a.score);
}
