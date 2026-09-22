import type { APPlan, APPlanItem, GradeLevel } from '@/domain/types';
import { AP_COURSES, AP_COURSE_BY_ID, resolveAPCourse } from '@/data/ap';
import { MAJOR_BY_ID } from '@/data/majors';
import { listJoin, uniq } from '@/lib/format';
import { nowISO } from '@/lib/date';
import type { EngineContext } from './context';
import { explanation } from './explain';

/* ==========================================================================
   AP planner — section 13
   Never recommends a course because it sounds prestigious. Readiness and
   workload are checked explicitly, and the plan says what it would require.
   ========================================================================== */

const WORKLOAD_CEILING: Record<string, number> = { light: 7, balanced: 11, heavy: 15 };

/** Rough prerequisite chains we can check from course names the student typed. */
const PREREQ_HINTS: Record<string, { needs: RegExp; label: string }[]> = {
  'ap-calculus-ab': [{ needs: /precalc|pre-calc|trig|analysis|calculus/i, label: 'Precalculus' }],
  'ap-calculus-bc': [{ needs: /precalc|pre-calc|calculus/i, label: 'Precalculus (and ideally Calculus AB)' }],
  'ap-physics-c-mech': [{ needs: /calculus/i, label: 'Calculus, at least concurrently' }],
  'ap-physics-c-em': [{ needs: /calculus/i, label: 'Calculus, at least concurrently' }],
  'ap-physics-2': [{ needs: /physic/i, label: 'A first physics course' }],
  'ap-chemistry': [{ needs: /chem/i, label: 'A first chemistry course' }],
  'ap-biology': [{ needs: /bio/i, label: 'A first biology course' }],
  'ap-english-literature': [{ needs: /english|literature|lang/i, label: 'Strong prior English coursework' }],
  'ap-spanish-language': [{ needs: /spanish/i, label: 'Several years of Spanish' }],
  'ap-chinese-language': [{ needs: /chinese|mandarin/i, label: 'Several years of Mandarin' }],
  'ap-latin': [{ needs: /latin/i, label: 'Three years of Latin' }],
  'ap-music-theory': [{ needs: /music|band|orchestra|choir|piano/i, label: 'Ability to read music' }],
  'ap-art-and-design': [{ needs: /art|studio|design|draw/i, label: 'Prior studio art coursework' }],
  'ap-statistics': [{ needs: /algebra ii|algebra 2|precalc|calculus|statistic/i, label: 'Algebra II' }],
  'ap-precalculus': [{ needs: /algebra ii|algebra 2|precalc/i, label: 'Algebra II' }],
};

function hasTaken(ctx: EngineContext, pattern: RegExp): boolean {
  return [...ctx.profile.academics.currentCourses, ...ctx.profile.academics.previousCourses].some((c) =>
    pattern.test(c),
  );
}

function alreadyTakingOrTaken(ctx: EngineContext, courseId: string): boolean {
  const course = AP_COURSE_BY_ID.get(courseId);
  if (!course) return false;
  // Students write "AP US History", not "ap-united-states-history", so match on
  // the resolved course rather than on substring luck.
  const entered = [...ctx.profile.academics.currentCourses, ...ctx.profile.academics.previousCourses];
  if (entered.some((c) => resolveAPCourse(c)?.id === courseId)) return true;
  return ctx.profile.scores.some((s) => s.kind === 'AP' && resolveAPCourse(s.subject)?.id === courseId);
}

function readinessFor(ctx: EngineContext, courseId: string): { readiness: APPlanItem['readiness']; note: string } {
  const hints = PREREQ_HINTS[courseId];
  if (!hints?.length) {
    const course = AP_COURSE_BY_ID.get(courseId);
    if (course && course.prerequisites.length) {
      return { readiness: 'unknown', note: `Listed prerequisites: ${listJoin(course.prerequisites)}. Check with your counselor.` };
    }
    return { readiness: 'ready', note: 'No strict prerequisites beyond a solid general foundation.' };
  }
  const missing = hints.filter((h) => !hasTaken(ctx, h.needs));
  if (!missing.length) {
    return { readiness: 'ready', note: `You have the usual preparation (${listJoin(hints.map((h) => h.label))}).` };
  }
  // A senior missing one prerequisite can often take it concurrently.
  if (missing.length === 1 && ctx.grade >= 11) {
    return {
      readiness: 'likely-ready',
      note: `Usually needs ${missing[0].label}. Many students take it concurrently — confirm with your counselor.`,
    };
  }
  return {
    readiness: 'build-first',
    note: `Build ${listJoin(missing.map((h) => h.label))} first. Taking this before you are ready tends to cost more than it gains.`,
  };
}

function offersCourse(ctx: EngineContext, courseId: string): boolean {
  const offered = ctx.profile.academics.schoolOffersAP;
  // If the student never told us what their school offers, do not filter anything out.
  return offered.length === 0 || offered.some((o) => resolveAPCourse(o)?.id === courseId);
}

export function buildAPPlan(ctx: EngineContext): APPlan {
  const byGrade: Record<number, APPlanItem[]> = {};
  const loadByGrade: Record<number, number> = {};
  const notes: string[] = [];
  const warnings: string[] = [];

  const recommendedIds = new Set<string>();
  const usefulIds = new Set<string>();
  for (const majorId of ctx.majorIds) {
    const major = MAJOR_BY_ID.get(majorId);
    major?.recommendedAP.forEach((id) => recommendedIds.add(id));
    major?.usefulAP.forEach((id) => usefulIds.add(id));
  }
  // Interests also nominate courses, one tier below major-driven recommendations.
  for (const course of AP_COURSES) {
    if (course.supportsMajors.some((m) => ctx.majorIds.includes(m))) usefulIds.add(course.id);
  }

  if (!ctx.majorIds.length) {
    notes.push(
      'You have not named a major yet, so this plan favours courses that keep options open rather than courses that specialise early.',
    );
  }

  const ceiling = WORKLOAD_CEILING[ctx.profile.rigorTolerance] ?? 11;

  // If the student has already told us this year's schedule, their current
  // year is set — plan the years they can still change.
  const scheduleIsSet = ctx.profile.academics.currentCourses.length > 0;
  const firstPlannableGrade = scheduleIsSet ? Math.min(12, ctx.grade + 1) : ctx.grade;
  const gradesAhead: GradeLevel[] = [];
  for (let g = firstPlannableGrade; g <= 12; g++) gradesAhead.push(g as GradeLevel);
  if (!gradesAhead.length) gradesAhead.push(12);

  const placed = new Set<string>();

  for (const grade of gradesAhead) {
    const items: APPlanItem[] = [];
    let load = 0;

    const candidates = AP_COURSES.filter((course) => {
      if (placed.has(course.id)) return false;
      // Never re-recommend something already taken or in progress, in any year.
      if (alreadyTakingOrTaken(ctx, course.id)) return false;
      if (!offersCourse(ctx, course.id)) return false;
      return course.typicalGrades.includes(grade);
    });

    const scored = candidates
      .map((course) => {
        const isRecommended = recommendedIds.has(course.id);
        const isUseful = usefulIds.has(course.id);
        const { readiness, note } = readinessFor(ctx, course.id);
        let score = isRecommended ? 100 : isUseful ? 60 : 20;
        if (readiness === 'build-first') score -= 55;
        if (readiness === 'likely-ready') score -= 8;
        // Prefer courses well matched to the student's grade.
        if (course.typicalGrades[0] === grade) score += 6;
        // A heavy course late in a heavy year is a bad idea regardless of value.
        score -= course.workload * 2;
        return { course, score, isRecommended, isUseful, readiness, note };
      })
      .sort((a, b) => b.score - a.score);

    for (const c of scored) {
      const wouldExceed = load + c.course.workload > ceiling;
      let tier: APPlanItem['tier'];
      if (c.readiness === 'build-first') tier = 'not-necessary';
      else if (c.isRecommended && !wouldExceed) tier = 'recommended';
      else if (c.isUseful && !wouldExceed) tier = 'useful';
      else if (wouldExceed && (c.isRecommended || c.isUseful)) tier = 'optional';
      else tier = 'not-necessary';

      if (tier === 'not-necessary' && !c.isRecommended && !c.isUseful) continue;

      const majorNames = ctx.majorIds
        .filter((m) => MAJOR_BY_ID.get(m)?.recommendedAP.includes(c.course.id) || MAJOR_BY_ID.get(m)?.usefulAP.includes(c.course.id))
        .map((m) => MAJOR_BY_ID.get(m)?.name ?? m);

      items.push({
        courseId: c.course.id,
        grade,
        tier,
        readiness: c.readiness,
        readinessNote: c.note,
        workload: c.course.workload,
        explanation: explanation({
          whyThis: c.isRecommended
            ? `${c.course.name} is core preparation for ${listJoin(majorNames) || 'the direction you described'} — not a prestige pick.`
            : c.isUseful
              ? `${c.course.name} supports ${listJoin(majorNames) || 'your interests'} without being essential.`
              : `${c.course.name} is available but does not connect strongly to what you have told us.`,
          whyNow:
            tier === 'optional'
              ? `Grade ${grade} is already near your workload limit, so this would be a stretch rather than a plan.`
              : `Grade ${grade} is when students typically take this, given the prerequisites.`,
          connection: majorNames.length
            ? `Connects to ${listJoin(majorNames)}.`
            : 'Keeps broad options open rather than narrowing early.',
          requires: `${c.note} Workload roughly ${c.course.workload} out of 5.`,
          alternatives:
            c.isRecommended && candidates.length > 1
              ? [`A lighter year focused on fewer AP courses done well`, `Taking this in grade ${Math.min(12, grade + 1)} instead`]
              : ['Skipping it — an AP you do not need is not a loss'],
          uncertainty:
            ctx.profile.academics.schoolOffersAP.length === 0
              ? 'We do not know which AP courses your school offers, so some of these may not be available.'
              : undefined,
          evidence: uniq([
            ...(ctx.majorIds.length ? [`Majors you listed: ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`] : []),
            ...(ctx.profile.academics.currentCourses.length ? [`Current courses: ${listJoin(ctx.profile.academics.currentCourses.slice(0, 4))}`] : []),
            `Workload tolerance: ${ctx.profile.rigorTolerance}`,
          ]),
        }),
      });

      if (tier === 'recommended' || tier === 'useful') {
        load += c.course.workload;
        placed.add(c.course.id);
      }
      if (items.length >= 8) break;
    }

    byGrade[grade] = items;
    loadByGrade[grade] = load;

    if (load > ceiling) {
      warnings.push(`Grade ${grade} is above the workload you said you could carry. Drop one course rather than stretching.`);
    }
    if (load === 0 && items.length === 0) {
      notes.push(`No AP courses are strongly indicated for grade ${grade} based on what you have told us. That is a legitimate plan, not a gap.`);
    }
  }

  if (ctx.profile.academics.schoolOffersAP.length === 0) {
    warnings.push('You have not told us which AP courses your school offers, so this plan assumes all of them are available.');
  }
  if (scheduleIsSet && ctx.grade < 12) {
    notes.push(
      `Your grade ${ctx.grade} schedule is already recorded, so this plan covers grade ${firstPlannableGrade} onward. Courses you are taking or have taken are excluded.`,
    );
  }
  if (ctx.grade === 12) {
    notes.push(
      'You are in grade 12, so course selection is largely behind you. This is here for reference and for any spring additions your school allows.',
    );
  }
  notes.push(
    'Taking fewer AP courses and doing well in them is read more favourably than taking many and struggling. This plan caps each year at what you said you could carry.',
  );

  return { id: `apPlan-${ctx.profile.id}`, generatedAt: nowISO(), byGrade, loadByGrade, notes, warnings };
}
