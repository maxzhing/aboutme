import type {
  BlindSpot,
  CalendarEvent,
  Deadline,
  Recommendation,
  StudyPlan,
  StudyPlanBlock,
} from '@/domain/types';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { AP_COURSE_BY_ID, resolveAPCourse } from '@/data/ap';
import { MAJOR_BY_ID } from '@/data/majors';
import { addDays, daysUntil, nextOccurrenceOfMonth, startOfWeek, todayISO } from '@/lib/date';
import { clamp, countLabel, listJoin, sum, uniq } from '@/lib/format';
import { uid } from '@/lib/id';
import { demo } from '@/data/provenance';
import type { EngineContext } from './context';
import { explanation } from './explain';
import { satStats, apStats, errorPatterns } from './practice';

/* ==========================================================================
   Blind spots, deadlines, study plan and summer planning
   Sections 22, 24, 34, 35, 53.
   ========================================================================== */

/* ----------------------------------------------------------- Blind spots */

export function findBlindSpots(ctx: EngineContext): BlindSpot[] {
  const out: BlindSpot[] = [];
  const { profile, account } = ctx;

  /* Deadlines first — these are time-critical and objective. */
  const upcoming = account.deadlines
    .filter((d) => !d.done)
    .map((d) => ({ d, days: daysUntil(d.date, ctx.today) }))
    .filter((x) => x.days >= 0 && x.days <= 45)
    .sort((a, b) => a.days - b.days);
  if (upcoming.length) {
    const soonest = upcoming[0];
    out.push({
      id: 'deadline-soon',
      area: 'deadlines',
      title: `${countLabel(upcoming.length, 'deadline')} within 45 days`,
      finding: `Your next one is "${soonest.d.title}" in ${soonest.days} ${soonest.days === 1 ? 'day' : 'days'}.`,
      priority: soonest.days <= 14 ? 'important' : 'useful',
      action: soonest.days <= 14 ? 'Block time for this in the next three days.' : 'Put a working session on the calendar now.',
      route: '/app/planner/deadlines',
      evidence: upcoming.slice(0, 3).map((x) => `${x.d.title} — ${x.days} days`),
    });
  }

  /* Testing */
  if (!ctx.satTotal && ctx.grade >= 10) {
    out.push({
      id: 'no-test-score',
      area: 'testing',
      title: 'No test score on file',
      finding:
        'You have no SAT, ACT or PSAT score recorded. Without one, every academic comparison in this app is guesswork, and you cannot tell whether test-optional is the right call for you.',
      priority: ctx.grade >= 11 ? 'important' : 'useful',
      action: 'Take one timed diagnostic. It takes an afternoon and changes everything downstream.',
      route: '/app/sat',
      evidence: ['No entries in your testing history'],
    });
  } else if (ctx.grade === 11 && !profile.plannedTests.some((t) => t.kind === 'SAT' || t.kind === 'ACT')) {
    out.push({
      id: 'no-planned-test',
      area: 'testing',
      title: 'No test date planned',
      finding: 'You are in grade 11 with no SAT or ACT date recorded. Registration deadlines are typically a month before the test.',
      priority: 'important',
      action: 'Pick a test date and register. You can always take it again.',
      route: '/app/planner',
      evidence: [`Grade ${ctx.grade}`, 'No planned tests recorded'],
    });
  }

  const sat = satStats(ctx);
  const weakDomains = sat.byDomain.filter((d) => d.band === 'weak' && d.attempted >= 3);
  if (weakDomains.length) {
    out.push({
      id: 'sat-weak-domain',
      area: 'testing',
      title: `Consistent weakness in ${listJoin(weakDomains.slice(0, 2).map((d) => d.label))}`,
      finding: `You are scoring below 55% on ${listJoin(weakDomains.map((d) => `${d.label} (${d.accuracy}%)`))} across enough questions for it to be a real pattern rather than noise.`,
      priority: 'useful',
      action: 'Run a targeted drill on the weakest one before doing more mixed practice.',
      route: '/app/sat/practice',
      evidence: weakDomains.map((d) => `${d.label}: ${d.correct}/${d.attempted} correct`),
    });
  }

  /* Academics */
  if (!profile.academics.gpa) {
    out.push({
      id: 'no-gpa',
      area: 'academics',
      title: 'GPA missing',
      finding: 'Without your GPA we cannot say anything useful about academic fit at any college.',
      priority: 'important',
      action: 'Add it from your transcript — two minutes of work.',
      route: '/app/settings/profile',
      evidence: ['Academic record has no GPA'],
    });
  }
  if (!profile.academics.currentCourses.length) {
    out.push({
      id: 'no-courses',
      area: 'academics',
      title: 'Current courses not recorded',
      finding: 'The AP planner cannot check prerequisites or workload without knowing what you are taking now.',
      priority: 'useful',
      action: 'Add your current schedule.',
      route: '/app/settings/profile',
      evidence: ['No current courses listed'],
    });
  }

  /* Activities */
  const activities = profile.activities;
  if (!activities.length) {
    out.push({
      id: 'no-activities',
      area: 'activities',
      title: 'No activities recorded',
      finding: 'Everything outside class — including a job, caring for siblings, or something you do alone — belongs here.',
      priority: 'important',
      action: 'Add what you actually do, including paid work and family responsibilities.',
      route: '/app/activities',
      evidence: [],
    });
  } else {
    const sustained = activities.filter((a) => a.gradesInvolved.length >= 2);
    if (!sustained.length && ctx.grade >= 10) {
      out.push({
        id: 'no-sustained',
        area: 'activities',
        title: 'Nothing you have stuck with',
        finding:
          'Every activity on your list is a single year. Continuity is read very differently from a longer list — depth in one thing beats breadth across five.',
        priority: 'important',
        action: 'Pick one to carry forward next year and commit to it properly.',
        route: '/app/activities',
        evidence: activities.slice(0, 4).map((a) => `${a.name} — ${countLabel(a.gradesInvolved.length, 'year')}`),
      });
    }
    const undescribed = activities.filter((a) => !a.description?.trim());
    if (undescribed.length >= 2) {
      out.push({
        id: 'thin-descriptions',
        area: 'applications',
        title: `${countLabel(undescribed.length, 'activity')} without a description`,
        finding:
          'When you write your activity list next year, you will not remember the details. Writing them down now, while they are fresh, is the single easiest thing on this page.',
        priority: 'useful',
        action: 'Add two sentences to each.',
        route: '/app/applications/activities',
        evidence: undescribed.map((a) => a.name),
      });
    }
    const hoursTotal = sum(activities.map((a) => a.hoursPerWeek ?? 0));
    if (hoursTotal > 40) {
      out.push({
        id: 'overcommitted',
        area: 'activities',
        title: 'Your week may be overcommitted',
        finding: `Your listed activities add to about ${Math.round(hoursTotal)} hours a week on top of school. That is not sustainable alongside serious coursework, and we would rather say so than suggest more.`,
        priority: 'important',
        action: 'Look at what you would drop if you had to. That answer usually tells you something.',
        route: '/app/activities',
        evidence: activities.map((a) => `${a.name}: ${a.hoursPerWeek ?? '?'} hrs/week`),
      });
    }
  }

  /* College list shape */
  const list = account.collegeList;
  if (!list.length && ctx.grade >= 10) {
    out.push({
      id: 'empty-list',
      area: 'colleges',
      title: 'No colleges saved',
      finding: 'Researching colleges early is mostly about learning what you actually want, not about building a final list.',
      priority: ctx.grade >= 11 ? 'important' : 'useful',
      action: 'Save three that interest you for different reasons.',
      route: '/app/colleges',
      evidence: [],
    });
  } else if (list.length) {
    const colleges = list.map((e) => COLLEGE_BY_ID.get(e.collegeId)).filter(Boolean);
    const accessible = colleges.filter((c) => (c!.acceptanceRate ?? 100) > 40);
    if (colleges.length >= 4 && accessible.length === 0) {
      out.push({
        id: 'no-accessible',
        area: 'colleges',
        title: 'Every college on your list is highly selective',
        finding:
          'A list where every option admits under 40% of applicants is not a list, it is a lottery ticket. Colleges with higher admit rates are not consolation prizes — several on this platform have stronger undergraduate teaching than the selective ones.',
        priority: 'important',
        action: 'Add two or three where you would genuinely be happy and where admission is more predictable.',
        route: '/app/colleges/match',
        evidence: colleges.map((c) => `${c!.shortName ?? c!.name}: ${c!.acceptanceRate ?? '?'}% admit rate`).slice(0, 5),
      });
    }
    const affordable = colleges.filter(
      (c) => ctx.constraints.maxCostPerYear === undefined || (c!.avgNetPrice ?? Infinity) <= ctx.constraints.maxCostPerYear * 1.2,
    );
    if (ctx.constraints.maxCostPerYear !== undefined && colleges.length >= 3 && affordable.length === 0) {
      out.push({
        id: 'no-affordable',
        area: 'colleges',
        title: 'No college on your list fits your budget',
        finding: `You set a budget of about $${ctx.constraints.maxCostPerYear.toLocaleString()} a year, and every saved college has an average net price above it.`,
        priority: 'important',
        action: 'Add options that meet full need, or in-state publics, and run each net price calculator.',
        route: '/app/colleges/match',
        evidence: colleges.map((c) => `${c!.shortName ?? c!.name}: avg net price $${(c!.avgNetPrice ?? 0).toLocaleString()}`).slice(0, 4),
      });
    }
  }

  /* Exploration */
  if (!ctx.majorIds.length) {
    out.push({
      id: 'no-major',
      area: 'exploration',
      title: 'No intended major, even tentatively',
      finding:
        'Undecided is a legitimate answer, but naming two or three possibilities — even ones you may drop — makes every recommendation in this app sharper.',
      priority: 'useful',
      action: 'Pick two you are curious about. You are not committing to anything.',
      route: '/app/majors',
      evidence: [],
    });
  }
  if (!profile.goals.idealExperience) {
    out.push({
      id: 'no-goals',
      area: 'exploration',
      title: 'You have not described what you want',
      finding: 'The free-text answer about your ideal college experience drives college matching more than any other single field.',
      priority: 'useful',
      action: 'Write a few honest sentences.',
      route: '/app/settings/profile',
      evidence: [],
    });
  }

  /* Applications, grade 12 only */
  if (ctx.grade === 12) {
    const applying = list.filter((e) => e.stage === 'applying' || e.stage === 'application-planning');
    const missingRecs = account.recommendationPackets.length === 0;
    if (applying.length && missingRecs) {
      out.push({
        id: 'no-recs',
        area: 'applications',
        title: 'No recommendation requests tracked',
        finding: `You have ${countLabel(applying.length, 'college')} in the application stage and no recommenders recorded. Teachers get asked by many students at once.`,
        priority: 'important',
        action: 'Ask two teachers now, and give them a packet.',
        route: '/app/applications/recommendations',
        evidence: applying.map((e) => COLLEGE_BY_ID.get(e.collegeId)?.shortName ?? e.collegeId),
      });
    }
    if (applying.length && !account.essays.length) {
      out.push({
        id: 'no-essays',
        area: 'applications',
        title: 'No essay drafts started',
        finding: 'Essays take longer than anyone expects, and the first draft is always the hardest to start.',
        priority: 'important',
        action: 'Start a personal statement draft, even a bad one.',
        route: '/app/applications/essays',
        evidence: [],
      });
    }
  }

  const order = { important: 0, useful: 1, optional: 2 } as const;
  return out
    .filter((b) => !ctx.dismissed.has(b.id))
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 10);
}

/* ----------------------------------------------------------- Deadlines */

export interface DeadlineIntelligence {
  deadline: Deadline;
  daysAway: number;
  urgency: 'overdue' | 'critical' | 'soon' | 'upcoming' | 'distant';
  message: string;
  blockers: string[];
}

export function deadlineIntelligence(ctx: EngineContext): DeadlineIntelligence[] {
  return ctx.account.deadlines
    .filter((d) => !d.done)
    .map((deadline) => {
      const daysAway = daysUntil(deadline.date, ctx.today);
      const urgency: DeadlineIntelligence['urgency'] =
        daysAway < 0 ? 'overdue' : daysAway <= 7 ? 'critical' : daysAway <= 21 ? 'soon' : daysAway <= 60 ? 'upcoming' : 'distant';
      const blockers: string[] = [];

      if (deadline.refType === 'college' && deadline.refId) {
        const entry = ctx.account.collegeList.find((e) => e.collegeId === deadline.refId);
        const college = COLLEGE_BY_ID.get(deadline.refId);
        if (college && entry) {
          const done = Object.values(entry.checklist).filter(Boolean).length;
          if (done < 3) blockers.push(`Only ${done} application tasks complete for ${college.shortName ?? college.name}`);
          if (!ctx.account.recommendationPackets.length) blockers.push('No recommendation requested yet');
          if (!ctx.account.essays.length) blockers.push('No essay draft started');
        }
      }

      const message =
        daysAway < 0
          ? `This passed ${Math.abs(daysAway)} days ago. Mark it done or remove it so it stops competing for your attention.`
          : daysAway === 0
            ? 'This is today.'
            : daysAway <= 7
              ? `${daysAway} days away. ${blockers.length ? `Before you can finish it: ${listJoin(blockers)}.` : 'Block time today.'}`
              : daysAway <= 21
                ? `${daysAway} days away — close enough that this week matters.`
                : `${daysAway} days away.`;

      return { deadline, daysAway, urgency, message, blockers };
    })
    .sort((a, b) => a.daysAway - b.daysAway);
}

/** Deadlines the catalog implies but the student has not added yet. */
export function suggestedDeadlines(ctx: EngineContext): Omit<Deadline, 'id' | 'createdAt'>[] {
  const existing = new Set(ctx.account.deadlines.map((d) => `${d.refType}:${d.refId}:${d.title}`));
  const out: Omit<Deadline, 'id' | 'createdAt'>[] = [];

  for (const entry of ctx.account.collegeList) {
    const college = COLLEGE_BY_ID.get(entry.collegeId);
    if (!college) continue;
    for (const dl of college.deadlines) {
      if (!dl.date && !dl.note) continue;
      const title = `${college.shortName ?? college.name} — ${dl.kind}`;
      const key = `college:${college.id}:${title}`;
      if (existing.has(key)) continue;
      // Without a real date we anchor to the usual month and label it as an estimate.
      const date = dl.date ?? estimateDeadlineDate(dl.kind, ctx.today);
      out.push({
        title,
        date,
        category: 'college-application',
        refType: 'college',
        refId: college.id,
        notes: dl.note ? `${dl.note} (estimated date — confirm on the college site)` : 'Estimated date — confirm on the college site',
        done: false,
        provenance: demo([{ label: `${college.shortName ?? college.name} admissions`, url: college.admissionsUrl }]),
      });
    }
  }

  for (const test of ctx.profile.plannedTests) {
    if (!test.date) continue;
    const title = `${test.kind}${test.subject ? ` — ${test.subject}` : ''}`;
    if (existing.has(`test:${test.id}:${title}`)) continue;
    out.push({
      title,
      date: test.date,
      category: test.kind === 'AP' ? 'exam' : 'test-registration',
      refType: 'test',
      refId: test.id,
      done: false,
      provenance: { kind: 'user', note: 'You entered this test date.' },
    });
  }

  return out.slice(0, 12);
}

function estimateDeadlineDate(kind: string, today: string): string {
  const month = kind === 'ED' || kind === 'EA' || kind === 'REA' ? 11 : kind === 'ED2' ? 1 : kind === 'Priority' ? 10 : 1;
  const day = kind === 'RD' || kind === 'ED2' ? 1 : kind === 'Priority' ? 15 : 1;
  return nextOccurrenceOfMonth(month, day, today);
}

/* ---------------------------------------------------------- Study plan */

export function buildStudyPlan(ctx: EngineContext, weeklyMinutes?: number): StudyPlan {
  const weekOf = startOfWeek(ctx.today);
  const totalMinutes = weeklyMinutes ?? (ctx.profile.academics.weeklyStudyHours ?? 8) * 60;

  /* Work out what deserves time, and why. */
  const priorities: StudyPlan['inputs']['priorities'] = [];
  const sat = satStats(ctx);
  const nextSat = ctx.profile.plannedTests.find((t) => t.kind === 'SAT' || t.kind === 'ACT');
  const satDays = nextSat?.date ? daysUntil(nextSat.date, ctx.today) : undefined;

  if (satDays !== undefined && satDays > 0) {
    const urgency = satDays <= 45 ? 3 : satDays <= 120 ? 2 : 1.2;
    priorities.push({
      scope: 'SAT',
      weight: urgency,
      reason: `Your test is ${satDays} days away${sat.byDomain.length ? `, and your weakest area is ${sat.byDomain[0].label} at ${sat.byDomain[0].accuracy}%` : ''}.`,
    });
  } else if (ctx.grade >= 10) {
    priorities.push({ scope: 'SAT', weight: 0.8, reason: 'No test date set yet, so this is maintenance rather than preparation.' });
  }

  const apTests = ctx.profile.plannedTests.filter((t) => t.kind === 'AP' && t.date);
  for (const test of apTests) {
    const days = daysUntil(test.date!, ctx.today);
    if (days < 0 || days > 210) continue;
    // Students type course names loosely ("AP US History" vs the catalog's
    // "AP United States History"), so match on the canonical course.
    const course = findCourseByLooseName(test.subject);
    const scope = course?.name ?? test.subject ?? 'AP exam';
    if (priorities.some((p) => p.scope === scope)) continue;
    const unitStats = course ? apStats(ctx, course.id).byUnit : [];
    const weakest = unitStats.find((u) => u.band === 'weak' || u.band === 'shaky');
    priorities.push({
      scope,
      weight: days <= 60 ? 2.4 : days <= 120 ? 1.6 : 1,
      reason: weakest
        ? `${days} days out, and ${weakest.label} is at ${weakest.accuracy}%.`
        : `${days} days out. Steady coverage beats cramming here.`,
    });
  }

  // Unfinished AP units with real progress gaps.
  for (const [key, pct] of Object.entries(ctx.account.apUnitProgress)) {
    if (pct >= 80) continue;
    const [courseId, unitId] = key.split(':');
    const course = AP_COURSE_BY_ID.get(courseId);
    const unit = course?.units.find((u) => u.id === unitId);
    if (!course || !unit) continue;
    if (priorities.some((p) => p.scope === course.name)) continue;
    priorities.push({
      scope: course.name,
      weight: 1.1,
      reason: `Unit ${unit.number} (${unit.title}) is ${pct}% complete.`,
    });
  }

  if (!priorities.length) {
    priorities.push({ scope: 'General review', weight: 1, reason: 'Nothing urgent is scheduled, so this is upkeep.' });
  }

  /* Commitments reduce available days rather than being ignored. */
  const commitments = ctx.profile.activities
    .filter((a) => (a.hoursPerWeek ?? 0) >= 3)
    .map((a) => ({ label: a.name, minutes: Math.round((a.hoursPerWeek ?? 0) * 60) }));

  /* Distribute across the week. Heavier days midweek, lighter at weekends. */
  const dayCapacity = [0.8, 1.1, 1.1, 1.1, 1.1, 0.7, 1.1]; // Sun..Sat
  const capacityTotal = sum(dayCapacity);
  const weightTotal = sum(priorities.map((p) => p.weight));
  const blocks: StudyPlanBlock[] = [];

  for (let day = 0; day < 7; day++) {
    const dayMinutes = Math.round((totalMinutes * dayCapacity[day]) / capacityTotal);
    if (dayMinutes < 15) continue;
    // Rotate which priority leads each day so no subject is always last.
    const rotated = priorities.slice(day % priorities.length).concat(priorities.slice(0, day % priorities.length));
    let remaining = dayMinutes;
    for (const priority of rotated) {
      if (remaining < 15) break;
      const share = Math.round((dayMinutes * priority.weight) / weightTotal / 5) * 5;
      const minutes = clamp(share, 0, remaining);
      if (minutes < 15) continue;
      blocks.push({
        day,
        scope: priority.scope,
        minutes,
        focus: focusFor(priority.scope, ctx),
        reason: priority.reason,
      });
      remaining -= minutes;
    }
  }

  return {
    id: uid('plan'),
    label: `Week of ${weekOf}`,
    weekOf,
    blocks,
    totalMinutes: sum(blocks.map((b) => b.minutes)),
    inputs: { weeklyMinutes: totalMinutes, commitments, priorities },
    createdAt: new Date().toISOString(),
    edited: false,
  };
}

/** Matches a loosely typed course name against the AP catalog. */
export const findCourseByLooseName = resolveAPCourse;

function focusFor(scope: string, ctx: EngineContext): string {
  if (scope === 'SAT') {
    const weak = satStats(ctx).byDomain.find((d) => d.band === 'weak' || d.band === 'shaky');
    return weak ? `SAT — ${weak.label} drill` : 'SAT — mixed practice';
  }
  const course = findCourseByLooseName(scope);
  if (course) {
    const weak = apStats(ctx, course.id).byUnit.find((u) => u.band === 'weak' || u.band === 'shaky');
    const unfinished = course.units.find(
      (u) => (ctx.account.apUnitProgress[`${course.id}:${u.id}`] ?? 0) < 80,
    );
    if (weak) return `${course.name} — review ${weak.label}`;
    if (unfinished) return `${course.name} — Unit ${unfinished.number}: ${unfinished.title}`;
    return `${course.name} — practice questions`;
  }
  return scope;
}

/* --------------------------------------------------------- Summer paths */

export interface SummerPath {
  id: string;
  kind: 'research' | 'coursework' | 'project' | 'internship' | 'competition' | 'volunteer' | 'creative' | 'work' | 'rest';
  title: string;
  purpose: string;
  fitsYou: string;
  realityCheck: string;
  firstStep: string;
  route?: string;
  cost: 'free' | 'low' | 'varies' | 'paid';
}

export function summerPaths(ctx: EngineContext): SummerPath[] {
  const majorName = ctx.primaryMajorId ? MAJOR_BY_ID.get(ctx.primaryMajorId)?.name : undefined;
  const budgetTight = (ctx.constraints.maxCostPerYear ?? Infinity) < 30000;
  const paths: SummerPath[] = [];

  paths.push({
    id: 'summer-project',
    kind: 'project',
    title: 'Build or make one thing, properly finished',
    purpose:
      'A finished project is the clearest evidence of initiative available to you, and it is entirely within your control — no application, no selection committee.',
    fitsYou: majorName
      ? `You could build something in ${majorName} that you can still talk about honestly in two years.`
      : 'Pick the interest you would keep doing even if nobody asked you to.',
    realityCheck: 'The hard part is finishing. Scope it to something you could complete in six weeks, then actually complete it.',
    firstStep: 'Open the project generator and pick the smallest idea that still interests you.',
    route: '/app/projects',
    cost: 'free',
  });

  if (ctx.grade >= 10) {
    paths.push({
      id: 'summer-research',
      kind: 'research',
      title: 'Get into a lab or a research programme',
      purpose: 'Research teaches you what a field is actually like day to day, which is the single best test of whether you want to study it.',
      fitsYou: majorName ? `Relevant if you are serious about ${majorName}.` : 'Useful across almost any science or social science direction.',
      realityCheck: budgetTight
        ? 'Many named summer programmes charge thousands. Cold-emailing local labs is free and often more substantive — expect a low reply rate and email twenty.'
        : 'Named programmes are very competitive. Apply to several and have a fallback.',
      firstStep: 'Filter research options to paid and accessible ones, then draft one email.',
      route: '/app/research',
      cost: budgetTight ? 'free' : 'varies',
    });
  }

  paths.push({
    id: 'summer-course',
    kind: 'coursework',
    title: 'Take an actual college course',
    purpose: 'A real transcript grade from a real college course tells admissions something no summer camp does.',
    fitsYou: 'Particularly useful if you want to move ahead in a sequence, or test whether a subject holds up at college level.',
    realityCheck:
      'Community college courses are usually far cheaper than branded pre-college programmes and carry transferable credit. Check credit rules before enrolling.',
    firstStep: 'Look up your local community college summer catalogue.',
    cost: 'low',
  });

  paths.push({
    id: 'summer-job',
    kind: 'work',
    title: 'Work a paid job',
    purpose:
      'Paid work is a legitimate and well-regarded use of a summer. It demonstrates reliability, and for many students it is not optional.',
    fitsYou: 'If money matters, this is not a compromise — put it on your activity list with the hours.',
    realityCheck: 'Colleges read a summer job as a real commitment. It does not need justifying.',
    firstStep: 'Add it to your activity list with honest hours so the rest of your plan accounts for it.',
    route: '/app/activities',
    cost: 'paid',
  });

  if (ctx.grade <= 11) {
    paths.push({
      id: 'summer-deepen',
      kind: 'volunteer',
      title: 'Go deeper in something you already do',
      purpose:
        'Extending an existing commitment usually reads stronger than adding a new one, and it costs nothing.',
      fitsYou: ctx.profile.activities.length
        ? `You already have ${listJoin(ctx.profile.activities.slice(0, 2).map((a) => a.name))}. Taking one further over a summer is the lowest-friction option here.`
        : 'Once you have an activity you care about, extending it beats starting another.',
      realityCheck: 'Only worth it if you take on something genuinely new within it — more of the same is just more of the same.',
      firstStep: 'Open the activity depth analyser and see what the next step would be.',
      route: '/app/activities/depth',
      cost: 'free',
    });
  }

  if (ctx.grade >= 11) {
    paths.push({
      id: 'summer-applications',
      kind: 'creative',
      title: 'Get ahead on applications',
      purpose:
        'Drafting essays in July instead of October is the single most effective stress reduction available to a rising senior.',
      fitsYou: 'You are close enough to applications that this is real work, not premature.',
      realityCheck: 'Two weeks of focused drafting in summer saves a miserable autumn. It is not glamorous and it matters.',
      firstStep: 'Run the essay brainstormer and write one messy draft.',
      route: '/app/applications/essays',
      cost: 'free',
    });
  }

  paths.push({
    id: 'summer-rest',
    kind: 'rest',
    title: 'Rest, deliberately',
    purpose:
      'A genuinely restorative summer is not a wasted one. Burnout in grade 11 or 12 costs far more than one unstructured July.',
    fitsYou:
      ctx.committedHours > 30
        ? `You are carrying about ${Math.round(ctx.committedHours)} hours a week of commitments. Rest is the honest recommendation here.`
        : 'Worth considering if this year has been heavy.',
    realityCheck:
      'This does not mean doing nothing for three months. It means picking one light thing and protecting the rest of the time.',
    firstStep: 'Decide now what you will not do, so the summer does not fill itself by default.',
    cost: 'free',
  });

  return paths;
}

/* ------------------------------------------------- Next best actions ---- */

export function nextBestActions(ctx: EngineContext, limit = 5): Recommendation[] {
  const out: Recommendation[] = [];
  const now = new Date().toISOString();
  const blindSpots = findBlindSpots(ctx);
  const deadlines = deadlineIntelligence(ctx);

  for (const dl of deadlines.filter((d) => d.urgency === 'critical' || d.urgency === 'overdue').slice(0, 2)) {
    out.push({
      id: `action-deadline-${dl.deadline.id}`,
      kind: 'action',
      title: dl.deadline.title,
      summary: dl.message,
      priority: 'important',
      route: '/app/planner/deadlines',
      relevance: 100 - clamp(dl.daysAway, 0, 40),
      createdAt: now,
      explanation: explanation({
        whyThis: 'This deadline is within a week.',
        whyNow: dl.message,
        connection: dl.deadline.refType === 'college' ? 'Tied to a college on your list.' : 'You added this deadline.',
        requires: dl.blockers.length ? listJoin(dl.blockers) : 'Time blocked in the next few days.',
        alternatives: ['Decide not to do it and remove the deadline — that is a real option'],
        evidence: [`Due ${dl.deadline.date}`],
      }),
    });
  }

  for (const spot of blindSpots.filter((s) => s.priority === 'important').slice(0, 3)) {
    out.push({
      id: `action-${spot.id}`,
      kind: 'blind-spot',
      title: spot.title,
      summary: spot.action,
      priority: spot.priority,
      route: spot.route,
      relevance: 80,
      createdAt: now,
      explanation: explanation({
        whyThis: spot.finding,
        whyNow: `You are in grade ${ctx.grade}, with ${ctx.gradesRemaining} ${ctx.gradesRemaining === 1 ? 'year' : 'years'} left.`,
        connection: `Affects your ${spot.area}.`,
        requires: spot.action,
        alternatives: ['Leave it — not everything flagged here is worth doing'],
        evidence: spot.evidence,
      }),
    });
  }

  // Study momentum.
  const patterns = errorPatterns(ctx);
  if (patterns.length && out.length < limit) {
    out.push({
      id: `action-pattern-${patterns[0].id}`,
      kind: 'study',
      title: 'Work on one specific error pattern',
      summary: patterns[0].statement,
      priority: 'useful',
      route: '/app/sat/weaknesses',
      relevance: 62,
      createdAt: now,
      explanation: explanation({
        whyThis: patterns[0].statement,
        whyNow: 'Patterns are cheapest to fix while they are still recent.',
        connection: `Observed across ${countLabel(patterns[0].evidenceAttemptIds.length, 'attempt')} in ${patterns[0].scope}.`,
        requires: 'One targeted drill, roughly fifteen minutes.',
        alternatives: ['More mixed practice, which will not target this specifically'],
        evidence: [`${patterns[0].evidenceAttemptIds.length} attempts support this`],
        uncertainty: patterns[0].confidence === 'low' ? 'Based on few attempts — treat as a hypothesis.' : undefined,
      }),
    });
  }

  if (out.length < limit) {
    for (const spot of blindSpots.filter((s) => s.priority !== 'important').slice(0, limit - out.length)) {
      out.push({
        id: `action-${spot.id}`,
        kind: 'blind-spot',
        title: spot.title,
        summary: spot.action,
        priority: spot.priority,
        route: spot.route,
        relevance: 45,
        createdAt: now,
        explanation: explanation({
          whyThis: spot.finding,
          whyNow: 'Not urgent, but cheap to do now.',
          connection: `Affects your ${spot.area}.`,
          requires: spot.action,
          alternatives: ['Skip it'],
          evidence: spot.evidence,
        }),
      });
    }
  }

  return uniq(out.map((o) => o.id))
    .map((id) => out.find((o) => o.id === id)!)
    .filter((r) => !ctx.dismissed.has(r.id))
    .slice(0, limit);
}

/** Calendar events derived from deadlines, so the master calendar is complete. */
export function deadlineEvents(ctx: EngineContext): CalendarEvent[] {
  return ctx.account.deadlines.map((d) => ({
    id: `deadline-event-${d.id}`,
    title: d.title,
    date: d.date,
    kind: d.category === 'exam' ? 'exam' : 'deadline',
    scope: d.category,
    notes: d.notes,
    done: d.done,
    generated: true,
    createdAt: d.createdAt,
  }));
}

export { addDays, todayISO };
