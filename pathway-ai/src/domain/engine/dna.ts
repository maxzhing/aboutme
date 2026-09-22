import type { StudentDNA, SubjectStrength } from '@/domain/types';
import { INTERESTS, INTEREST_BY_ID, STRENGTH_LABELS } from '@/data/interests';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { clamp, countLabel, listJoin, uniq } from '@/lib/format';
import { nowISO } from '@/lib/date';
import type { EngineContext } from './context';
import { overlapScore } from './context';

/* -------------------------------------------------------------------------
   Academic strengths
   Derived from stated interests, coursework, scores and activities. Every band
   carries the evidence that produced it, and missing evidence is stated rather
   than guessed at.
   ---------------------------------------------------------------------- */

const COURSE_SIGNALS: { pattern: RegExp; keys: string[]; label: string }[] = [
  { pattern: /calculus|precalc|statistic|algebra|geometry|math/i, keys: ['quantitative', 'abstract-reasoning'], label: 'mathematics coursework' },
  { pattern: /computer|program|coding|software/i, keys: ['quantitative', 'building', 'abstract-reasoning'], label: 'computing coursework' },
  { pattern: /physic/i, keys: ['quantitative', 'scientific'], label: 'physics coursework' },
  { pattern: /chem/i, keys: ['scientific', 'quantitative'], label: 'chemistry coursework' },
  { pattern: /bio|anatomy/i, keys: ['scientific', 'memory-systems'], label: 'biology coursework' },
  { pattern: /environment|earth|geolog/i, keys: ['scientific', 'systems-thinking'], label: 'environmental science coursework' },
  { pattern: /english|literature|writing|composition/i, keys: ['writing', 'analysis'], label: 'English coursework' },
  { pattern: /history|government|civics/i, keys: ['writing', 'analysis', 'memory-systems'], label: 'history and government coursework' },
  { pattern: /econ/i, keys: ['quantitative', 'analysis', 'systems-thinking'], label: 'economics coursework' },
  { pattern: /psycholog|sociolog/i, keys: ['analysis', 'scientific'], label: 'social science coursework' },
  { pattern: /spanish|french|chinese|latin|german|japanese|language/i, keys: ['languages', 'memory-systems'], label: 'language coursework' },
  { pattern: /music|orchestra|band|choir/i, keys: ['creative', 'performance', 'discipline'], label: 'music coursework' },
  { pattern: /art|design|studio|drawing|ceramic/i, keys: ['creative', 'craft'], label: 'art and design coursework' },
  { pattern: /engineer|robotic|technology|cad/i, keys: ['building', 'quantitative'], label: 'engineering coursework' },
];

const ACTIVITY_SIGNALS: Record<string, string[]> = {
  club: ['communication'],
  sport: ['discipline', 'performance', 'leadership'],
  music: ['creative', 'performance', 'discipline'],
  art: ['creative', 'craft'],
  research: ['scientific', 'analysis'],
  volunteering: ['service'],
  competition: ['discipline', 'analysis'],
  leadership: ['leadership', 'communication'],
  job: ['discipline', 'communication'],
  internship: ['communication', 'analysis'],
  project: ['building', 'creative'],
  community: ['service', 'leadership'],
  family: ['discipline', 'service'],
  other: [],
};

function bandFor(score: number): SubjectStrength['band'] {
  if (score >= 78) return 'very-strong';
  if (score >= 58) return 'strong';
  if (score >= 36) return 'developing';
  return 'emerging';
}

export function deriveStrengths(ctx: EngineContext): SubjectStrength[] {
  const scores = new Map<string, number>();
  const evidence = new Map<string, string[]>();

  const bump = (key: string, amount: number, why: string) => {
    scores.set(key, (scores.get(key) ?? 0) + amount);
    const list = evidence.get(key) ?? [];
    if (!list.includes(why)) list.push(why);
    evidence.set(key, list);
  };

  // Stated interests: the student's own signal, weighted meaningfully.
  for (const id of ctx.interestIds) {
    const interest = INTEREST_BY_ID.get(id);
    if (!interest) continue;
    for (const key of interest.strengthKeys) bump(key, 16, `You listed ${interest.name} as an interest`);
  }

  // Coursework, current weighted above previous.
  const allCourses = [
    ...ctx.profile.academics.currentCourses.map((c) => ({ c, weight: 14, when: 'this year' })),
    ...ctx.profile.academics.previousCourses.map((c) => ({ c, weight: 8, when: 'previously' })),
  ];
  for (const { c, weight, when } of allCourses) {
    const isAdvanced = /\bAP\b|IB |Honors|Honours|Advanced|Dual/i.test(c);
    for (const sig of COURSE_SIGNALS) {
      if (sig.pattern.test(c)) {
        bump(sig.keys[0], weight * (isAdvanced ? 1.4 : 1), `${c} (${when})`);
        for (const key of sig.keys.slice(1)) bump(key, weight * 0.55 * (isAdvanced ? 1.3 : 1), `${c} (${when})`);
      }
    }
  }

  // AP exam scores are direct evidence.
  for (const score of ctx.profile.scores) {
    if (score.kind !== 'AP' || !score.subject || !score.total) continue;
    const course = Array.from(AP_COURSE_BY_ID.values()).find((c) => c.name === score.subject);
    const weight = score.total >= 5 ? 26 : score.total >= 4 ? 18 : score.total >= 3 ? 9 : 2;
    const name = course?.name ?? score.subject;
    for (const sig of COURSE_SIGNALS) {
      if (sig.pattern.test(name)) {
        bump(sig.keys[0], weight, `${name} exam score of ${score.total}`);
        for (const key of sig.keys.slice(1)) bump(key, weight * 0.5, `${name} exam score of ${score.total}`);
      }
    }
  }

  // SAT sections speak to two axes specifically.
  if (ctx.satMath) {
    const w = ctx.satMath >= 720 ? 22 : ctx.satMath >= 650 ? 14 : ctx.satMath >= 570 ? 7 : 2;
    bump('quantitative', w, `SAT Math around ${ctx.satMath}`);
  }
  if (ctx.satVerbal) {
    const w = ctx.satVerbal >= 700 ? 22 : ctx.satVerbal >= 640 ? 14 : ctx.satVerbal >= 560 ? 7 : 2;
    bump('writing', w, `SAT Reading & Writing around ${ctx.satVerbal}`);
    bump('analysis', w * 0.6, `SAT Reading & Writing around ${ctx.satVerbal}`);
  }

  // Activities: duration and leadership matter more than count.
  for (const activity of ctx.profile.activities) {
    const years = activity.gradesInvolved.length || 1;
    const intensity = clamp((activity.hoursPerWeek ?? 2) / 4, 0.5, 3);
    const base = 6 * Math.min(years, 4) * intensity;
    for (const key of ACTIVITY_SIGNALS[activity.category] ?? []) {
      bump(key, base, `${activity.name} — ${countLabel(years, 'year')}`);
    }
    if (activity.leadership) bump('leadership', base * 0.9, `Leadership in ${activity.name}`);
    if (years >= 3) bump('discipline', base * 0.7, `${activity.name} sustained for ${years} years`);
  }

  const out: SubjectStrength[] = Array.from(scores.entries())
    .map(([key, raw]) => {
      // Compress the tail so a single high signal cannot read as mastery.
      const score = Math.round(clamp(100 * (1 - Math.exp(-raw / 55)), 0, 100));
      return {
        subject: STRENGTH_LABELS[key] ?? key,
        score,
        band: bandFor(score),
        evidence: (evidence.get(key) ?? []).slice(0, 4),
      };
    })
    .filter((s) => s.score >= 12)
    .sort((a, b) => b.score - a.score);

  return out.slice(0, 10);
}

/* -------------------------------------------------------------------------
   Interest profile
   ---------------------------------------------------------------------- */

function deriveInterestProfile(ctx: EngineContext): StudentDNA['interestProfile'] {
  const byCluster = new Map<string, { weight: number; subjects: string[] }>();
  for (const id of ctx.interestIds) {
    const interest = INTEREST_BY_ID.get(id);
    if (!interest) continue;
    const entry = byCluster.get(interest.cluster) ?? { weight: 0, subjects: [] };
    entry.weight += 1;
    entry.subjects.push(interest.name);
    byCluster.set(interest.cluster, entry);
  }
  const total = Array.from(byCluster.values()).reduce((n, e) => n + e.weight, 0) || 1;
  return Array.from(byCluster.entries())
    .map(([cluster, e]) => ({ cluster, weight: Math.round((e.weight / total) * 100), subjects: e.subjects }))
    .sort((a, b) => b.weight - a.weight);
}

/* -------------------------------------------------------------------------
   Major matching
   ---------------------------------------------------------------------- */

function deriveMajorMatches(ctx: EngineContext, strengths: SubjectStrength[]): StudentDNA['majorMatches'] {
  const strengthByLabel = new Map(strengths.map((s) => [s.subject, s.score]));
  const quantScore = strengthByLabel.get(STRENGTH_LABELS['quantitative']) ?? 0;
  const writeScore = strengthByLabel.get(STRENGTH_LABELS['writing']) ?? 0;
  const labScore = strengthByLabel.get(STRENGTH_LABELS['scientific']) ?? 0;
  const stated = new Set(ctx.majorIds);

  const scored = MAJORS.filter((m) => m.id !== 'undecided').map((major) => {
    const why: string[] = [];
    let score = 0;

    if (stated.has(major.id)) {
      const intent = ctx.profile.majors.find((m) => m.majorId === major.id);
      const bonus = intent?.confidence === 'firm' ? 48 : intent?.confidence === 'leaning' ? 40 : 30;
      score += bonus;
      why.push(`You named this as a major you are ${intent?.confidence ?? 'considering'}`);
    }

    const signalMatch = overlapScore(major.interestSignals, ctx.signalSet);
    if (signalMatch > 0) {
      score += signalMatch * 34;
      const shared = major.interestSignals
        .filter((s) => ctx.signalSet.has(s))
        .map((s) => INTEREST_BY_ID.get(s)?.name ?? s)
        .slice(0, 3);
      if (shared.length) why.push(`Overlaps with your interest in ${listJoin(shared)}`);
    }

    const careerMatch = overlapScore(major.careers, ctx.careerIds);
    if (careerMatch > 0) {
      score += careerMatch * 22;
      const shared = major.careers
        .filter((c) => ctx.careerIds.includes(c))
        .map((c) => CAREER_BY_ID.get(c)?.name ?? c)
        .slice(0, 2);
      if (shared.length) why.push(`Leads toward ${listJoin(shared)}, which you said interests you`);
    }

    // Preparation alignment — honest about demands rather than flattering.
    const quantGap = major.mathIntensity * 20 - quantScore;
    if (major.mathIntensity >= 4 && quantScore >= 55) {
      score += 12;
      why.push('Your quantitative record supports a maths-heavy programme');
    } else if (major.mathIntensity >= 4 && quantGap > 35) {
      score -= 10;
      why.push('This is maths-heavy; your record would need more quantitative depth first');
    }
    if (major.writingIntensity >= 4 && writeScore >= 55) {
      score += 10;
      why.push('Your writing record fits a writing-intensive programme');
    }
    if (major.labIntensity >= 4 && labScore >= 55) {
      score += 8;
      why.push('You have real laboratory science behind you');
    }

    // Related to something already chosen — worth surfacing as exploration.
    if (!stated.has(major.id) && ctx.majorIds.some((id) => MAJOR_BY_ID.get(id)?.relatedMajors.includes(major.id))) {
      score += 14;
      const from = ctx.majorIds.find((id) => MAJOR_BY_ID.get(id)?.relatedMajors.includes(major.id));
      why.push(`Closely related to ${MAJOR_BY_ID.get(from ?? '')?.name ?? 'a major you listed'}`);
    }

    return { majorId: major.id, score: clamp(score, 0, 100), why };
  });

  return scored
    .filter((m) => m.score >= 16)
    .sort((a, b) => b.score - a.score)
    .slice(0, 9)
    .map((m) => ({
      majorId: m.majorId,
      tier: (m.score >= 58 ? 'strong-match' : m.score >= 34 ? 'possible-match' : 'exploration') as
        | 'strong-match'
        | 'possible-match'
        | 'exploration',
      why: m.why.slice(0, 3),
      relevance: Math.round(m.score),
    }));
}

/* -------------------------------------------------------------------------
   Careers, strengths and development areas
   ---------------------------------------------------------------------- */

function deriveCareerPaths(ctx: EngineContext, majorMatches: StudentDNA['majorMatches']): StudentDNA['careerPaths'] {
  const byCareer = new Map<string, string[]>();
  const topMajors = majorMatches.slice(0, 5).map((m) => m.majorId);
  for (const majorId of topMajors) {
    const major = MAJOR_BY_ID.get(majorId);
    for (const careerId of major?.careers ?? []) {
      byCareer.set(careerId, uniq([...(byCareer.get(careerId) ?? []), majorId]));
    }
  }
  // Careers the student named come first, even if only one major reaches them.
  const ordered = Array.from(byCareer.entries()).sort((a, b) => {
    const aStated = ctx.careerIds.includes(a[0]) ? 1 : 0;
    const bStated = ctx.careerIds.includes(b[0]) ? 1 : 0;
    if (aStated !== bStated) return bStated - aStated;
    return b[1].length - a[1].length;
  });

  return ordered.slice(0, 8).map(([careerId, viaMajorIds]) => {
    const career = CAREER_BY_ID.get(careerId);
    const majorNames = viaMajorIds.map((id) => MAJOR_BY_ID.get(id)?.name ?? id);
    const stated = ctx.careerIds.includes(careerId);
    return {
      careerId,
      viaMajorIds,
      why: stated
        ? `You named this. ${listJoin(majorNames)} ${majorNames.length > 1 ? 'are common routes' : 'is a common route'} in.`
        : `Reachable from ${listJoin(majorNames)}, which match your profile. ${career?.pathNote ?? ''}`.trim(),
    };
  });
}

function deriveProfileStrengths(ctx: EngineContext, strengths: SubjectStrength[]): StudentDNA['profileStrengths'] {
  const out: StudentDNA['profileStrengths'] = [];

  const top = strengths.filter((s) => s.band === 'very-strong' || s.band === 'strong').slice(0, 3);
  for (const s of top) {
    out.push({
      title: s.subject,
      detail: `Your record shows real depth here, not just exposure.`,
      evidence: s.evidence,
    });
  }

  const sustained = ctx.profile.activities.filter((a) => a.gradesInvolved.length >= 3);
  if (sustained.length) {
    out.push({
      title: 'Sustained commitment',
      detail: `You have stayed with ${listJoin(sustained.map((a) => a.name))} for three years or more. Depth over time is read very differently from a long list of short involvements.`,
      evidence: sustained.map((a) => `${a.name} — grades ${a.gradesInvolved.join(', ')}`),
    });
  }

  const leadership = ctx.profile.activities.filter((a) => a.leadership);
  if (leadership.length) {
    out.push({
      title: 'Leadership with responsibility',
      detail: `You hold real responsibility in ${listJoin(leadership.map((a) => a.name))}, not just a title.`,
      evidence: leadership.map((a) => `${a.role ?? 'Leader'} — ${a.name}`),
    });
  }

  const founded = ctx.profile.activities.filter((a) => /found|start|creat|launch/i.test(a.role ?? ''));
  if (founded.length) {
    out.push({
      title: 'Initiative',
      detail: `You started something that did not exist before: ${listJoin(founded.map((a) => a.name))}.`,
      evidence: founded.map((a) => `${a.name} — ${a.role}`),
    });
  }

  const awards = ctx.profile.awards.filter((a) => a.level !== 'school');
  if (awards.length) {
    out.push({
      title: 'Recognition beyond your school',
      detail: `You have been recognised at ${listJoin(uniq(awards.map((a) => a.level)))} level.`,
      evidence: awards.map((a) => `${a.name}${a.year ? ` (${a.year})` : ''}`),
    });
  }

  const jobsAndFamily = ctx.profile.activities.filter((a) => a.category === 'job' || a.category === 'family');
  if (jobsAndFamily.length) {
    out.push({
      title: 'Responsibility outside school',
      detail:
        'Paid work and family responsibilities are meaningful commitments. They belong on your activity list, and they explain how your time is actually spent.',
      evidence: jobsAndFamily.map((a) => `${a.name} — ${a.hoursPerWeek ?? '?'} hrs/week`),
    });
  }

  return out.slice(0, 6);
}

function deriveDevelopmentOpportunities(
  ctx: EngineContext,
  strengths: SubjectStrength[],
  majorMatches: StudentDNA['majorMatches'],
): StudentDNA['developmentOpportunities'] {
  const out: StudentDNA['developmentOpportunities'] = [];
  const has = (pattern: RegExp) =>
    ctx.profile.activities.some((a) => pattern.test(a.name) || pattern.test(a.description ?? '') || pattern.test(a.category));

  const topMajor = majorMatches[0] ? MAJOR_BY_ID.get(majorMatches[0].majorId) : undefined;

  if (!has(/research|lab/i) && topMajor && topMajor.labIntensity >= 3) {
    out.push({
      title: 'Research experience',
      detail: `Your profile could become stronger with some exposure to how research actually works — ${topMajor.name} programmes value it, and it is the fastest way to find out whether you enjoy the field.`,
      priority: ctx.grade >= 11 ? 'useful' : 'important',
      route: '/app/research',
    });
  }

  if (!ctx.profile.activities.some((a) => a.leadership)) {
    out.push({
      title: 'Responsibility within something you already do',
      detail:
        'You do not need a new activity for this. Taking on a defined responsibility in something you already care about counts more than a title in something new.',
      priority: 'useful',
      route: '/app/activities',
    });
  }

  const longest = Math.max(0, ...ctx.profile.activities.map((a) => a.gradesInvolved.length));
  if (longest < 2 && ctx.profile.activities.length > 2) {
    out.push({
      title: 'Depth in one or two activities',
      detail:
        'Your involvements are broad but each is fairly short. Choosing one or two to stay with — and go deeper in — reads far more strongly than adding another.',
      priority: 'important',
      route: '/app/activities',
    });
  }

  const writing = strengths.find((s) => s.subject === STRENGTH_LABELS['writing']);
  if (topMajor && topMajor.writingIntensity >= 4 && (!writing || writing.score < 45)) {
    out.push({
      title: 'Writing depth',
      detail: `${topMajor.name} is writing-intensive. Building a record of substantial writing — coursework, a publication, or a long research paper — would strengthen both your preparation and your application.`,
      priority: 'useful',
      route: '/app/academics',
    });
  }

  const quant = strengths.find((s) => s.subject === STRENGTH_LABELS['quantitative']);
  if (topMajor && topMajor.mathIntensity >= 4 && (!quant || quant.score < 50)) {
    out.push({
      title: 'Quantitative preparation',
      detail: `${topMajor.name} expects comfort with mathematics well past algebra. Strengthening this before you get there matters more than adding another activity.`,
      priority: 'important',
      route: '/app/ap',
    });
  }

  if (!ctx.profile.activities.some((a) => a.category === 'project' || /project|built|made/i.test(a.description ?? ''))) {
    out.push({
      title: 'Something you built or made',
      detail:
        'A single finished project you can point to — and talk about honestly, including what went wrong — carries more weight than a longer activity list.',
      priority: 'useful',
      route: '/app/projects',
    });
  }

  if (!ctx.profile.goals.idealExperience) {
    out.push({
      title: 'A clearer picture of what you want',
      detail:
        'You have not described what a good college experience would look like for you. That single answer improves nearly every recommendation in this app.',
      priority: 'useful',
      route: '/app/settings/profile',
    });
  }

  return out.slice(0, 5);
}

function missingInputs(ctx: EngineContext): string[] {
  const missing: string[] = [];
  if (!ctx.gpa4) missing.push('Your GPA — without it, academic context is guesswork');
  if (!ctx.satTotal) missing.push('Any SAT, ACT or PSAT score, even a practice one');
  if (!ctx.profile.academics.currentCourses.length) missing.push('Your current courses');
  if (!ctx.profile.activities.length) missing.push('Your activities');
  if (!ctx.majorIds.length) missing.push('At least one major you are considering, even tentatively');
  if (!ctx.profile.collegePrefs.priorities.length) missing.push('What you actually want from a college');
  if (!ctx.profile.academics.schoolOffersAP.length) missing.push('Which AP courses your school offers');
  return missing;
}

/* ------------------------------------------------------------------------ */

export function buildStudentDNA(ctx: EngineContext): StudentDNA {
  const academicStrengths = deriveStrengths(ctx);
  const majorMatches = deriveMajorMatches(ctx, academicStrengths);
  return {
    generatedAt: nowISO(),
    academicStrengths,
    interestProfile: deriveInterestProfile(ctx),
    majorMatches,
    careerPaths: deriveCareerPaths(ctx, majorMatches),
    profileStrengths: deriveProfileStrengths(ctx, academicStrengths),
    developmentOpportunities: deriveDevelopmentOpportunities(ctx, academicStrengths, majorMatches),
    missingInputs: missingInputs(ctx),
  };
}

export const ALL_INTEREST_CLUSTERS = uniq(INTERESTS.map((i) => i.cluster));
