import type { WhatIfResult, WhatIfScenario } from '@/domain/types';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { MAJOR_BY_ID } from '@/data/majors';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { listJoin } from '@/lib/format';
import type { EngineContext } from './context';
import { buildContext } from './context';
import { matchColleges } from './collegeMatch';

/* ==========================================================================
   What-if simulator — section 52
   Re-runs the real matcher against a modified profile. Never claims an
   admission outcome; describes shifts in options and preparation instead.
   ========================================================================== */

function applyScenario(ctx: EngineContext, scenario: WhatIfScenario): EngineContext {
  const account = structuredClone(ctx.account);
  const c = scenario.changes;

  if (c.satTotal !== undefined) {
    account.satScores = [
      ...account.satScores,
      {
        id: 'whatif-sat',
        date: ctx.today,
        label: 'Hypothetical',
        math: Math.round(c.satTotal / 2 / 10) * 10,
        readingWriting: c.satTotal - Math.round(c.satTotal / 2 / 10) * 10,
        total: c.satTotal,
        official: false,
      },
    ];
    // Remove any real official score so the hypothetical is what gets read.
    account.profile.scores = account.profile.scores.filter((s) => s.kind !== 'SAT');
  }
  if (c.gpa !== undefined) {
    account.profile.academics.gpa = c.gpa;
    account.profile.academics.gpaScale = '4.0';
  }
  if (c.addMajorId) {
    if (!account.profile.majors.some((m) => m.majorId === c.addMajorId)) {
      account.profile.majors.push({ majorId: c.addMajorId, confidence: 'exploring' });
    }
  }
  if (c.replaceMajorId) {
    account.profile.majors = [{ majorId: c.replaceMajorId, confidence: 'leaning' }];
  }
  if (c.addAPCourseIds?.length) {
    for (const id of c.addAPCourseIds) {
      const course = AP_COURSE_BY_ID.get(id);
      if (course) account.profile.academics.currentCourses.push(course.name);
    }
  }
  if (c.restrictRegions?.length) {
    account.profile.collegePrefs.regions = c.restrictRegions;
  }
  if (c.budgetPerYear !== undefined) {
    account.profile.collegePrefs.budgetPerYear = c.budgetPerYear;
    account.learnedPreferences = account.learnedPreferences.filter((p) => p.kind !== 'max-cost');
  }

  return buildContext(account);
}

export function runWhatIf(ctx: EngineContext, scenario: WhatIfScenario): WhatIfResult {
  const after = applyScenario(ctx, scenario);
  const beforeMatches = matchColleges(ctx);
  const afterMatches = matchColleges(after);

  const beforeById = new Map(beforeMatches.map((m) => [m.collegeId, m]));
  const collegeShifts: WhatIfResult['collegeShifts'] = [];

  for (const a of afterMatches.slice(0, 40)) {
    const b = beforeById.get(a.collegeId);
    if (!b) continue;
    if (b.overallBand === a.overallBand) continue;
    const college = COLLEGE_BY_ID.get(a.collegeId);
    collegeShifts.push({
      collegeId: a.collegeId,
      beforeBand: b.overallBand,
      afterBand: a.overallBand,
      note: `${college?.shortName ?? a.collegeId} moves from ${b.overallBand} to ${a.overallBand} fit${
        a.academicContext.testNote ? ` — ${a.academicContext.testNote}` : ''
      }`,
    });
  }

  const effects: WhatIfResult['effects'] = [];
  const c = scenario.changes;

  if (c.satTotal !== undefined) {
    const inRangeBefore = beforeMatches.filter((m) => /inside the published middle/.test(m.academicContext.testNote ?? '')).length;
    const inRangeAfter = afterMatches.filter((m) => /inside the published middle|at or above/.test(m.academicContext.testNote ?? '')).length;
    effects.push({
      area: 'college-options',
      before: `Your score sits inside the published middle 50% at ${inRangeBefore} colleges in this catalog.`,
      after: `At ${c.satTotal} it would sit inside or above the middle 50% at ${inRangeAfter}.`,
      delta:
        inRangeAfter > inRangeBefore
          ? `That widens where your test score stops being the limiting factor, by ${inRangeAfter - inRangeBefore} colleges.`
          : 'That does not change where your score sits relative to published ranges.',
    });
    effects.push({
      area: 'planning',
      before: `Currently around ${ctx.satTotal ?? 'no recorded score'}.`,
      after: `Reaching ${c.satTotal} typically means sustained targeted practice, not one more test sitting.`,
      delta: ctx.satTotal
        ? `A ${c.satTotal - ctx.satTotal} point move is realistic over months with consistent work on identified weaknesses. It is not guaranteed.`
        : 'Take a diagnostic first so this projection has a starting point.',
    });
  }

  if (c.gpa !== undefined && ctx.gpa4 !== undefined) {
    effects.push({
      area: 'academic-preparation',
      before: `GPA of ${ctx.gpa4.toFixed(2)}.`,
      after: `GPA of ${c.gpa.toFixed(2)}.`,
      delta:
        c.gpa > ctx.gpa4
          ? 'GPA moves slowly because it averages everything already recorded. Later grades matter more than earlier ones, but a large jump in one year is uncommon.'
          : 'A falling GPA affects more than college options — it usually signals something worth addressing directly.',
    });
  }

  if (c.replaceMajorId || c.addMajorId) {
    const majorId = c.replaceMajorId ?? c.addMajorId!;
    const major = MAJOR_BY_ID.get(majorId);
    if (major) {
      const offering = afterMatches.filter((m) => COLLEGE_BY_ID.get(m.collegeId)?.majors.includes(majorId)).length;
      effects.push({
        area: 'college-options',
        before: c.replaceMajorId
          ? `Currently matching for ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}.`
          : 'Currently matching on your existing majors only.',
        after: `${offering} colleges in this catalog offer ${major.name}.`,
        delta: c.replaceMajorId
          ? `Switching changes which colleges are strong academic matches, and changes the preparation this app recommends.`
          : `Adding ${major.name} broadens matching rather than narrowing it.`,
      });
      effects.push({
        area: 'academic-preparation',
        before: 'Your current AP plan follows your existing majors.',
        after: `${major.name} points toward ${listJoin(major.recommendedAP.map((id) => AP_COURSE_BY_ID.get(id)?.name ?? id))}.`,
        delta:
          major.mathIntensity >= 4
            ? `This is a maths-heavy direction — intensity ${major.mathIntensity} out of 5. That changes your course sequence, not just your label.`
            : `Preparation load is moderate, intensity ${major.mathIntensity} out of 5 for mathematics.`,
      });
      effects.push({
        area: 'activities',
        before: 'Current activity recommendations follow your listed interests.',
        after: `${major.name} suggests ${listJoin(major.competitions.slice(0, 2))} and projects like ${listJoin(major.projectIdeas.slice(0, 2))}.`,
        delta: 'Activity recommendations would re-order, but nothing you already do becomes worthless.',
      });
    }
  }

  if (c.addAPCourseIds?.length) {
    const names = c.addAPCourseIds.map((id) => AP_COURSE_BY_ID.get(id)?.name ?? id);
    const load = c.addAPCourseIds.reduce((n, id) => n + (AP_COURSE_BY_ID.get(id)?.workload ?? 3), 0);
    effects.push({
      area: 'academic-preparation',
      before: `Current courses: ${listJoin(ctx.profile.academics.currentCourses.slice(0, 4))}.`,
      after: `Adding ${listJoin(names)}.`,
      delta: `That adds about ${load} workload points. Your stated tolerance is ${ctx.profile.rigorTolerance}. ${
        load >= 8 ? 'This is a significant addition — something else would probably have to give.' : 'This looks manageable.'
      }`,
    });
  }

  if (c.restrictRegions?.length) {
    const inRegion = afterMatches.filter((m) => c.restrictRegions!.includes(COLLEGE_BY_ID.get(m.collegeId)?.region ?? '')).length;
    effects.push({
      area: 'college-options',
      before: `${beforeMatches.length} colleges considered.`,
      after: `${inRegion} sit within ${listJoin(c.restrictRegions)}.`,
      delta:
        inRegion < 12
          ? 'That is a narrow pool. Worth checking whether the constraint is real or a default assumption.'
          : 'Still a workable pool. Geographic limits are a legitimate constraint, not a compromise.',
    });
  }

  if (c.budgetPerYear !== undefined) {
    const affordableAfter = afterMatches.filter(
      (m) => (COLLEGE_BY_ID.get(m.collegeId)?.avgNetPrice ?? Infinity) <= c.budgetPerYear!,
    ).length;
    const affordableBefore = ctx.constraints.maxCostPerYear
      ? beforeMatches.filter((m) => (COLLEGE_BY_ID.get(m.collegeId)?.avgNetPrice ?? Infinity) <= ctx.constraints.maxCostPerYear!).length
      : beforeMatches.length;
    effects.push({
      area: 'financial',
      before: `${affordableBefore} colleges sit at or below your current budget.`,
      after: `${affordableAfter} sit at or below $${c.budgetPerYear.toLocaleString()}.`,
      delta:
        'Average net price is an average. Your actual number depends on your family’s finances, so run each net price calculator before treating this as settled.',
    });
  }

  if (c.summerPath) {
    effects.push({
      area: 'activities',
      before: 'Your current summer is unplanned in this app.',
      after: `A summer focused on ${c.summerPath}.`,
      delta:
        'A single summer rarely changes which colleges match you. It changes what you have to write about, and what you know about yourself.',
    });
  }

  if (!effects.length) {
    effects.push({
      area: 'planning',
      before: 'No change specified.',
      after: 'No change specified.',
      delta: 'Choose a variable to change to see what shifts.',
    });
  }

  return {
    scenarioId: scenario.id,
    effects,
    collegeShifts: collegeShifts.slice(0, 8),
    caveat:
      'This shows how your fit assessment and preparation would shift, using the same logic as the rest of the app. It does not predict admission decisions, and no change described here makes admission more or less likely in any quantified way.',
  };
}
