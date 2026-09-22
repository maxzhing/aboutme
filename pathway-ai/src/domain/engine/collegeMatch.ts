import type { College, CollegeMatch, FitDimension } from '@/domain/types';
import { COLLEGES, COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { clamp, listJoin, uniq } from '@/lib/format';
import type { EngineContext } from './context';
import { bandFromScore, FIT_DISCLAIMER } from './explain';

/* ==========================================================================
   College matching
   Four independent dimensions, each with its own reasons, gaps and unknowns.
   No single composite score — section 51 and 7 both forbid it.
   ========================================================================== */

function academicFit(college: College, ctx: EngineContext): FitDimension {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  let score = 30; // neutral base: a college is not a bad academic fit by default

  const wanted = ctx.majorIds.length ? ctx.majorIds : [];
  const offered = wanted.filter((m) => college.majors.includes(m));
  const missing = wanted.filter((m) => !college.majors.includes(m));
  const strong = offered.filter((m) => college.strengths.includes(m));

  if (!wanted.length) {
    unknowns.push('You have not named a major yet, so this reflects general academic breadth only.');
    score += Math.min(college.majors.length, 18);
  } else {
    if (offered.length) {
      score += (offered.length / wanted.length) * 26;
      reasons.push(`Offers ${listJoin(offered.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
    }
    if (strong.length) {
      score += strong.length * 14;
      reasons.push(`Known for ${listJoin(strong.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
    }
    if (missing.length) {
      score -= missing.length * 16;
      gaps.push(`Does not appear to offer ${listJoin(missing.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))} in our data`);
    }
  }

  // Signature programmes that touch the student's majors are a real signal.
  const relevantPrograms = college.signaturePrograms.filter((p) =>
    p.relatedMajors.some((m) => wanted.includes(m)),
  );
  if (relevantPrograms.length) {
    score += relevantPrograms.length * 9;
    reasons.push(`${listJoin(relevantPrograms.map((p) => p.name))} ${relevantPrograms.length > 1 ? 'connect' : 'connects'} directly to what you want to study`);
  }

  // Multiple majors across different families need a broad institution.
  const families = uniq(wanted.map((m) => MAJOR_BY_ID.get(m)?.family).filter(Boolean) as string[]);
  if (families.length > 1) {
    if (college.majors.length >= 14 || college.tags.includes('interdisciplinary')) {
      score += 10;
      reasons.push(`Broad enough to combine ${listJoin(families)}`);
    } else {
      gaps.push(`You are considering ${listJoin(families)} — check whether both are genuinely available here`);
    }
  }

  if (college.undergradEnrollment < 3000 && ctx.profile.collegePrefs.sizes.includes('large')) {
    gaps.push('Small course catalogue relative to the size of institution you said you wanted');
  }

  if (college.testPolicy === 'blind') {
    unknowns.push('This college does not consider test scores, so your SAT will not affect your application here.');
  }

  return {
    key: 'academic',
    label: 'Academic fit',
    score: clamp(Math.round(score), 0, 100),
    band: bandFromScore(clamp(score, 0, 100)),
    reasons,
    gaps,
    unknowns,
  };
}

function personalFit(college: College, ctx: EngineContext): FitDimension {
  const prefs = ctx.profile.collegePrefs;
  const reasons: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  let score = 34;
  let stated = 0;

  if (prefs.regions.length) {
    stated++;
    if (prefs.regions.includes(college.region)) {
      score += 13;
      reasons.push(`In the ${college.region}, which you listed`);
    } else {
      score -= 11;
      gaps.push(`In the ${college.region}, outside the regions you named`);
    }
  }
  if (prefs.states.length) {
    stated++;
    if (prefs.states.includes(college.state)) {
      score += 10;
      reasons.push(`In ${college.state}, a state you named`);
    }
  }
  if (ctx.constraints.excludedStates.has(college.state)) {
    score -= 40;
    gaps.push(`You asked not to see colleges in ${college.state}`);
  }
  if (ctx.constraints.excludedRegions.has(college.region)) {
    score -= 40;
    gaps.push(`You asked not to see colleges in the ${college.region}`);
  }
  if (prefs.settings.length && !prefs.settings.includes('no-preference')) {
    stated++;
    if (prefs.settings.includes(college.setting)) {
      score += 11;
      reasons.push(`${college.setting.charAt(0).toUpperCase() + college.setting.slice(1)} campus, as you preferred`);
    } else {
      score -= 8;
      gaps.push(`${college.setting} campus, which is not what you said you wanted`);
    }
  }
  if (prefs.sizes.length && !prefs.sizes.includes('no-preference')) {
    stated++;
    if (prefs.sizes.includes(college.sizeBand)) {
      score += 11;
      reasons.push(`${college.sizeBand.charAt(0).toUpperCase() + college.sizeBand.slice(1)} undergraduate population`);
    } else {
      score -= 8;
      gaps.push(`${college.sizeBand} student body, not the size you named`);
    }
  }
  if (prefs.control !== 'no-preference') {
    stated++;
    if (prefs.control === college.control) {
      score += 7;
      reasons.push(`${college.control === 'public' ? 'Public' : 'Private'} institution, as you preferred`);
    } else {
      score -= 5;
    }
  }

  const matchedPriorities = prefs.priorities.filter((p) => college.tags.includes(p));
  if (prefs.priorities.length) {
    stated++;
    score += (matchedPriorities.length / prefs.priorities.length) * 24;
    if (matchedPriorities.length) {
      reasons.push(`Matches ${matchedPriorities.length} of your ${prefs.priorities.length} stated priorities`);
    } else {
      gaps.push('None of your stated priorities show up in what this college is known for');
    }
  }

  if (!stated) {
    unknowns.push('You have not set college preferences yet, so personal fit cannot be assessed.');
    score = 30;
  }

  return {
    key: 'personal',
    label: 'Personal fit',
    score: clamp(Math.round(score), 0, 100),
    band: stated ? bandFromScore(clamp(score, 0, 100)) : 'unclear',
    reasons,
    gaps,
    unknowns,
  };
}

function opportunityFit(college: College, ctx: EngineContext): FitDimension {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  let score = 32;

  const opp = college.opportunities;
  if (opp.undergradResearch) {
    score += 12;
    reasons.push(`Undergraduate research: ${opp.undergradResearch}`);
  }
  if (opp.coop) {
    score += 10;
    reasons.push(`Co-op programme: ${opp.coop}`);
  }
  if (opp.internships) {
    score += 9;
    reasons.push(`Internships: ${opp.internships}`);
  }
  if (opp.entrepreneurship && ctx.signalSet.has('entrepreneurship')) {
    score += 9;
    reasons.push(`Entrepreneurship support: ${opp.entrepreneurship}`);
  }
  if (opp.studyAbroad && (ctx.signalSet.has('languages') || ctx.signalSet.has('international-relations'))) {
    score += 8;
    reasons.push(`Study abroad: ${opp.studyAbroad}`);
  }

  // Music and arts specifically — a very common reason a college works or does not.
  if (ctx.signalSet.has('music')) {
    if (college.tags.includes('music-strong')) {
      score += 16;
      reasons.push(`Serious music programme: ${college.studentLife.music ?? 'conservatory-level'}`);
    } else if (college.studentLife.music) {
      score += 5;
      reasons.push(`Music available: ${college.studentLife.music}`);
    } else {
      gaps.push('We do not have music programme detail for this college — worth checking directly');
    }
  }
  if ((ctx.signalSet.has('art') || ctx.signalSet.has('design') || ctx.signalSet.has('theater')) && college.tags.includes('arts-strong')) {
    score += 12;
    reasons.push('Strong arts programmes');
  }
  if (ctx.signalSet.has('athletics') && college.tags.includes('strong-athletics')) {
    score += 8;
    reasons.push(`Athletics: ${college.studentLife.athletics ?? 'major varsity programme'}`);
  }

  if (college.studentLife.clubsCount) {
    score += clamp(college.studentLife.clubsCount / 120, 0, 8);
  }

  if (!opp.undergradResearch && !opp.coop && !opp.internships) {
    unknowns.push('We hold limited opportunity data for this college. Check its site before ruling it in or out.');
  }

  return {
    key: 'opportunity',
    label: 'Opportunity fit',
    score: clamp(Math.round(score), 0, 100),
    band: bandFromScore(clamp(score, 0, 100)),
    reasons,
    gaps,
    unknowns,
  };
}

function financialFit(college: College, ctx: EngineContext): FitDimension {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const unknowns: string[] = [];
  let score = 40;

  const inState = ctx.profile.academics.state === college.state && college.control === 'public';
  const sticker = (inState ? college.tuitionInState : college.tuitionOutState) ?? college.tuitionOutState;
  const total = (sticker ?? 0) + (college.roomAndBoard ?? 0);
  const budget = ctx.constraints.maxCostPerYear;

  if (inState) {
    score += 12;
    reasons.push(`You are an ${college.state} resident, so in-state tuition applies`);
  }

  if (budget !== undefined && college.avgNetPrice !== undefined) {
    const ratio = college.avgNetPrice / budget;
    if (ratio <= 0.85) {
      score += 26;
      reasons.push(`Average net price is below the budget you set`);
    } else if (ratio <= 1.15) {
      score += 12;
      reasons.push('Average net price is close to your stated budget');
    } else if (ratio <= 1.6) {
      score -= 10;
      gaps.push('Average net price runs above your budget — aid would need to beat the average');
    } else {
      score -= 26;
      gaps.push('Average net price is well above your budget');
    }
    unknowns.push('Average net price is an average across all aided students. Your own number could be very different — run the college’s net price calculator.');
  } else if (budget === undefined) {
    unknowns.push('You have not set a budget, so affordability cannot be assessed.');
  } else {
    unknowns.push('We do not hold a net price figure for this college.');
  }

  if (college.meetsFullNeed) {
    score += 14;
    reasons.push('States that it meets full demonstrated financial need');
  }
  if (college.noLoanAid) {
    score += 10;
    reasons.push('Replaces loans with grants in aid packages');
  }
  if (college.meritAid) {
    score += ctx.profile.collegePrefs.aidImportance >= 4 ? 9 : 5;
    reasons.push('Offers merit scholarships not based on need');
  }
  if (!college.meetsFullNeed && !college.meritAid && ctx.profile.collegePrefs.aidImportance >= 4) {
    gaps.push('No commitment to meet full need and no merit aid in our data — a real risk given how much aid matters to you');
  }
  if (total > 0) {
    reasons.push(`Published cost of attendance around ${Math.round(total / 1000)}k before aid`);
  }

  return {
    key: 'financial',
    label: 'Financial considerations',
    score: clamp(Math.round(score), 0, 100),
    band: bandFromScore(clamp(score, 0, 100)),
    reasons,
    gaps,
    unknowns,
  };
}

/** Academic-profile context, deliberately framed as preparation, never odds. */
function academicContext(college: College, ctx: EngineContext): CollegeMatch['academicContext'] {
  const out: CollegeMatch['academicContext'] = { disclaimer: FIT_DISCLAIMER };

  if (ctx.gpa4 !== undefined && college.gpaAvg !== undefined) {
    const diff = ctx.gpa4 - college.gpaAvg;
    out.gpaNote =
      diff >= 0.1
        ? `Your GPA is at or above the average of admitted students here (about ${college.gpaAvg.toFixed(2)} on a 4.0 scale).`
        : diff >= -0.25
          ? `Your GPA is close to the average of admitted students here (about ${college.gpaAvg.toFixed(2)}).`
          : `Your GPA sits below the average of admitted students here (about ${college.gpaAvg.toFixed(2)}). That is one factor among many, and context matters.`;
  } else if (ctx.gpa4 === undefined) {
    out.gpaNote = 'Add your GPA to see how your record compares with admitted students here.';
  }

  if (college.testPolicy === 'blind') {
    out.testNote = 'This college does not consider SAT or ACT scores at all.';
  } else if (ctx.satTotal && college.sat25 && college.sat75) {
    const isPractice = !ctx.profile.scores.some((s) => s.kind === 'SAT' && s.official);
    const label = isPractice ? 'practice score' : 'score';
    out.testNote =
      ctx.satTotal >= college.sat75
        ? `Your ${label} of ${ctx.satTotal} is at or above the published 75th percentile (${college.sat75}).`
        : ctx.satTotal >= college.sat25
          ? `Your ${label} of ${ctx.satTotal} falls inside the published middle 50% (${college.sat25}–${college.sat75}).`
          : `Your ${label} of ${ctx.satTotal} is below the published 25th percentile (${college.sat25}). ${
              college.testPolicy === 'optional' ? 'This college is test-optional, so you could choose not to submit.' : ''
            }`.trim();
  } else if (college.sat25) {
    out.testNote = `Published middle 50%: ${college.sat25}–${college.sat75 ?? '?'}. Add a score to compare.`;
  }

  return out;
}

export interface MatchOptions {
  /** Only include colleges passing hard constraints the student set. */
  respectExclusions?: boolean;
  limit?: number;
}

export function matchColleges(ctx: EngineContext, options: MatchOptions = {}): CollegeMatch[] {
  const { respectExclusions = true, limit } = options;
  const dismissed = new Set(
    ctx.account.feedback.filter((f) => f.targetType === 'college' && f.kind === 'not-interested').map((f) => f.targetId),
  );

  const matches = COLLEGES.filter((college) => {
    if (dismissed.has(college.id)) return false;
    if (!respectExclusions) return true;
    if (ctx.constraints.excludedStates.has(college.state)) return false;
    if (ctx.constraints.excludedRegions.has(college.region)) return false;
    return true;
  }).map((college) => {
    const dimensions = [
      academicFit(college, ctx),
      personalFit(college, ctx),
      opportunityFit(college, ctx),
      financialFit(college, ctx),
    ];
    // Weight academic and personal fit above the rest for ordering only.
    // Financial weight scales with how important the student said aid is:
    // for a student who told us cost decides, cost decides the ordering too.
    const financialWeight = 0.15 + (ctx.profile.collegePrefs.aidImportance - 3) * 0.055;
    const remaining = 1 - financialWeight;
    const weighted =
      dimensions[0].score * remaining * 0.412 +
      dimensions[1].score * remaining * 0.353 +
      dimensions[2].score * remaining * 0.235 +
      dimensions[3].score * financialWeight;

    const matchedPrograms = college.signaturePrograms
      .filter((p) => p.relatedMajors.some((m) => ctx.majorIds.includes(m)) || !ctx.majorIds.length)
      .map((p) => ({ name: p.name, description: p.description }));

    const matchedOpportunities = Object.entries(college.opportunities)
      .filter(([, v]) => Boolean(v))
      .map(([k, v]) => `${labelForOpportunity(k)}: ${v}`);

    const concerns = dimensions.flatMap((d) => d.gaps);

    return {
      collegeId: college.id,
      dimensions,
      overallBand: bandFromScore(weighted),
      rank: 0,
      headline: headlineFor(college, dimensions, ctx),
      academicContext: academicContext(college, ctx),
      matchedPrograms: matchedPrograms.slice(0, 3),
      matchedOpportunities: matchedOpportunities.slice(0, 4),
      concerns: concerns.slice(0, 4),
      _weighted: weighted,
    } as CollegeMatch & { _weighted: number };
  });

  matches.sort((a, b) => b._weighted - a._weighted);
  const ranked = matches.map((m, i) => {
    const { _weighted, ...rest } = m as CollegeMatch & { _weighted: number };
    void _weighted;
    return { ...rest, rank: i + 1 };
  });
  return limit ? ranked.slice(0, limit) : ranked;
}

function labelForOpportunity(key: string): string {
  switch (key) {
    case 'undergradResearch':
      return 'Undergraduate research';
    case 'studyAbroad':
      return 'Study abroad';
    case 'internships':
      return 'Internships';
    case 'entrepreneurship':
      return 'Entrepreneurship';
    case 'coop':
      return 'Co-op';
    default:
      return key;
  }
}

function headlineFor(college: College, dims: FitDimension[], ctx: EngineContext): string {
  const best = dims.slice().sort((a, b) => b.score - a.score)[0];
  const worst = dims.slice().sort((a, b) => a.score - b.score)[0];
  const majorName = ctx.primaryMajorId ? MAJOR_BY_ID.get(ctx.primaryMajorId)?.name : undefined;

  if (best.score < 45) {
    return `Little in ${college.shortName ?? college.name}'s profile lines up with what you have told us so far.`;
  }
  const strengthPhrase =
    best.key === 'academic' && majorName
      ? `Strong academic match for ${majorName}`
      : best.key === 'personal'
        ? 'Closely matches the kind of place you described'
        : best.key === 'opportunity'
          ? 'Unusually strong on the opportunities you care about'
          : 'Financially realistic given what you told us';

  const caveat =
    worst.score < 45
      ? worst.key === 'financial'
        ? ', though cost is the thing to check first'
        : worst.key === 'personal'
          ? ', though it is not the kind of campus you described wanting'
          : worst.key === 'academic'
            ? ', though the academic match is thinner than it looks'
            : ', though opportunity data here is limited'
      : '';

  return `${strengthPhrase}${caveat}.`;
}

export function matchForCollege(ctx: EngineContext, collegeId: string): CollegeMatch | undefined {
  if (!COLLEGE_BY_ID.has(collegeId)) return undefined;
  return matchColleges(ctx, { respectExclusions: false }).find((m) => m.collegeId === collegeId);
}
