import type { DailyBriefing, WeeklyReview } from '@/domain/types';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { OPPORTUNITY_BY_ID } from '@/data/opportunities';
import { AP_COURSE_BY_ID } from '@/data/ap';
import { addDays, daysUntil, formatDate, startOfWeek, todayISO } from '@/lib/date';
import { countLabel, firstName, percent, sum } from '@/lib/format';
import type { EngineContext } from './context';
import { deadlineIntelligence, nextBestActions } from './planning';
import { findOpportunities } from './opportunities';
import { satStats } from './practice';

/* ==========================================================================
   Daily briefing and weekly review — sections 49, 50
   Short, concrete, and never exaggerated.
   ========================================================================== */

const KNOWLEDGE_ITEMS: { text: string; source?: { label: string; url?: string; publisher?: string } }[] = [
  {
    text: 'Net price calculators are required on US college websites. The published sticker price is often nothing like what a family actually pays.',
    source: { label: 'Net Price Calculator Center', url: 'https://collegecost.ed.gov/net-price', publisher: 'U.S. Department of Education' },
  },
  {
    text: 'Colleges that meet full demonstrated need can end up costing less than an in-state public. Ruling one out on sticker price alone is a common and expensive mistake.',
    source: { label: 'Federal Student Aid', url: 'https://studentaid.gov/', publisher: 'U.S. Department of Education' },
  },
  {
    text: 'Depth in one or two activities is read very differently from breadth across eight. Admissions readers see thousands of long lists.',
  },
  {
    text: 'Local scholarships administered by community foundations have far smaller applicant pools than national ones, and almost nobody applies.',
  },
  {
    text: 'Most students change their intended major at least once. Naming one now is useful for planning, not a commitment.',
  },
  {
    text: 'Test-optional does not mean test-blind. A score below a college’s published range can usually be withheld; a test-blind college ignores it either way.',
    source: { label: 'College Scorecard', url: 'https://collegescorecard.ed.gov/', publisher: 'U.S. Department of Education' },
  },
  {
    text: 'Asking a teacher for a recommendation in spring of grade 11 gives them a summer to write it. Asking in October means competing with everyone else.',
  },
  {
    text: 'A job or caring for family members belongs on your activity list. Leaving it off makes your time look unexplained.',
  },
  {
    text: 'AP credit policies vary enormously between colleges and even between schools within one university. Check before assuming a 5 saves you a semester.',
    source: { label: 'AP Credit Policy Search', url: 'https://apstudents.collegeboard.org/getting-credit-placement', publisher: 'College Board' },
  },
  {
    text: 'Cold-emailing twenty local labs with a specific, short message produces more research placements than applying to one famous summer programme.',
  },
];

export function buildDailyBriefing(ctx: EngineContext): DailyBriefing {
  const name = firstName(ctx.profile.displayName || 'there');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? `Good morning, ${name}` : hour < 18 ? `Good afternoon, ${name}` : `Good evening, ${name}`;

  const actions = nextBestActions(ctx, 5);
  const deadlines = deadlineIntelligence(ctx);
  const nextDeadline = deadlines.find((d) => d.daysAway >= 0);

  const priorities: DailyBriefing['priorities'] = [];

  // Today's study blocks come first, since they are the concrete ask.
  const todayEvents = ctx.account.calendarEvents.filter((e) => e.date === ctx.today && !e.done && e.kind === 'study');
  for (const event of todayEvents.slice(0, 2)) {
    priorities.push({
      label: event.title,
      detail: event.notes ?? `From your study plan${event.scope ? ` — ${event.scope}` : ''}`,
      route: event.scope === 'SAT' ? '/app/sat/practice' : '/app/ap',
      minutes: event.minutes,
    });
  }
  for (const action of actions.slice(0, 3 - priorities.length)) {
    priorities.push({ label: action.title, detail: action.summary, route: action.route });
  }
  if (!priorities.length) {
    priorities.push({
      label: 'Nothing urgent today',
      detail: 'Your plan is clear. A short practice session or twenty minutes of college research is a reasonable use of the time.',
      route: '/app/sat/practice',
      minutes: 20,
    });
  }

  // Stable within a day, varied across days.
  const dayIndex = Math.floor(new Date(ctx.today).getTime() / 86_400_000);
  const knowledge = KNOWLEDGE_ITEMS[dayIndex % KNOWLEDGE_ITEMS.length];

  const topOpportunity = findOpportunities(ctx, {}, 5)[0];

  return {
    date: ctx.today,
    greeting,
    priorities: priorities.slice(0, 3),
    oneThingToKnow: { text: knowledge.text, source: knowledge.source },
    oneOpportunity: topOpportunity
      ? {
          id: topOpportunity.opportunity.id,
          name: topOpportunity.opportunity.name,
          why: topOpportunity.reasons[0] ?? 'Worth a look given what you have told us.',
          route: '/app/activities',
        }
      : undefined,
    oneDeadline: nextDeadline
      ? {
          id: nextDeadline.deadline.id,
          title: nextDeadline.deadline.title,
          date: nextDeadline.deadline.date,
          daysAway: nextDeadline.daysAway,
          route: '/app/planner/deadlines',
        }
      : undefined,
    recommendedAction: actions[0]
      ? { label: actions[0].title, route: actions[0].route ?? '/app' }
      : { label: 'Run a 10-minute practice set', route: '/app/sat/practice' },
  };
}

export function buildWeeklyReview(ctx: EngineContext, weekOffset = 0): WeeklyReview {
  const weekOf = addDays(startOfWeek(ctx.today), weekOffset * -7);
  const weekEnd = addDays(weekOf, 6);
  const inWeek = (iso: string) => iso >= weekOf && iso <= weekEnd;

  const attempts = ctx.account.attempts.filter((a) => inWeek(a.createdAt.slice(0, 10)));
  const graded = attempts.filter((a) => a.correct !== null);
  const correct = graded.filter((a) => a.correct).length;
  const accuracy = graded.length ? Math.round((correct / graded.length) * 100) : 0;

  const priorWeekStart = addDays(weekOf, -7);
  const priorAttempts = ctx.account.attempts.filter((a) => {
    const d = a.createdAt.slice(0, 10);
    return d >= priorWeekStart && d < weekOf && a.correct !== null;
  });
  const priorAccuracy = priorAttempts.length
    ? Math.round((priorAttempts.filter((a) => a.correct).length / priorAttempts.length) * 100)
    : undefined;

  const completedEvents = ctx.account.calendarEvents.filter((e) => inWeek(e.date) && e.done);
  const missedEvents = ctx.account.calendarEvents.filter((e) => inWeek(e.date) && !e.done && e.date < ctx.today);
  const studyMinutes = sum(completedEvents.map((e) => e.minutes ?? 0));

  const collegesAdded = ctx.account.collegeList.filter((e) => inWeek(e.addedAt.slice(0, 10)));
  const goalsDone = ctx.profile.goals.personalGoals.filter((g) => g.done);
  const activeDays = ctx.account.activityLog.filter((d) => inWeek(d)).length;

  const accomplished: string[] = [];
  if (attempts.length) accomplished.push(`Answered ${countLabel(attempts.length, 'practice question')} at ${percent(accuracy)} accuracy.`);
  if (studyMinutes) accomplished.push(`Completed ${Math.round(studyMinutes / 60 * 10) / 10} hours of planned study.`);
  if (collegesAdded.length) {
    accomplished.push(
      `Added ${countLabel(collegesAdded.length, 'college')} to your list: ${collegesAdded
        .map((e) => COLLEGE_BY_ID.get(e.collegeId)?.shortName ?? e.collegeId)
        .join(', ')}.`,
    );
  }
  if (activeDays) accomplished.push(`Opened Pathway on ${countLabel(activeDays, 'day')} this week.`);
  if (!accomplished.length) accomplished.push('Nothing recorded in the app this week. That is data, not a judgement.');

  const improved: string[] = [];
  if (priorAccuracy !== undefined && graded.length >= 4 && priorAttempts.length >= 4) {
    const delta = accuracy - priorAccuracy;
    if (delta >= 5) improved.push(`Practice accuracy rose from ${percent(priorAccuracy)} to ${percent(accuracy)}.`);
    else if (delta <= -5) improved.push(`Practice accuracy fell from ${percent(priorAccuracy)} to ${percent(accuracy)}. One week is noisy — worth watching, not worth panicking about.`);
    else improved.push(`Practice accuracy held steady around ${percent(accuracy)}.`);
  }
  const stats = satStats(ctx);
  const best = stats.byDomain.filter((d) => d.attempted >= 3).slice(-1)[0];
  if (best && best.accuracy >= 80) improved.push(`${best.label} is now your strongest area at ${percent(best.accuracy)}.`);

  const unfinished: string[] = [];
  if (missedEvents.length) {
    unfinished.push(`${countLabel(missedEvents.length, 'planned session')} passed without being marked done: ${missedEvents.slice(0, 3).map((e) => e.title).join(', ')}.`);
  }
  const overdue = ctx.account.deadlines.filter((d) => !d.done && daysUntil(d.date, ctx.today) < 0);
  if (overdue.length) unfinished.push(`${countLabel(overdue.length, 'deadline')} has passed without being marked done.`);
  if (!unfinished.length) unfinished.push('Nothing planned was left unfinished.');

  const patterns: string[] = [];
  if (missedEvents.length >= 3 && completedEvents.length < missedEvents.length) {
    patterns.push('More study sessions were missed than completed. That usually means the plan is too ambitious rather than that you are failing it — try lowering the weekly total.');
  }
  const weakest = stats.byDomain.find((d) => d.attempted >= 3 && d.band === 'weak');
  if (weakest) patterns.push(`${weakest.label} keeps coming back as your weakest area (${percent(weakest.accuracy)} over ${weakest.attempted} questions).`);
  const slow = stats.byDomain.find((d) => d.attempted >= 4 && d.accuracy >= 70 && d.medianSec > d.targetSec * 1.4);
  if (slow) patterns.push(`You get ${slow.label} right but take about ${Math.round((slow.medianSec / slow.targetSec) * 100 - 100)}% longer than target.`);
  if (activeDays >= 5) patterns.push(`You showed up on ${activeDays} days. Consistency matters more than any single long session.`);
  if (!patterns.length) patterns.push('Not enough activity this week to see a pattern.');

  const nextWeek: string[] = [];
  const actions = nextBestActions(ctx, 3);
  for (const action of actions) nextWeek.push(`${action.title} — ${action.summary}`);
  const unfinishedUnit = Object.entries(ctx.account.apUnitProgress).find(([, pct]) => pct > 0 && pct < 80);
  if (unfinishedUnit) {
    const [key] = unfinishedUnit;
    const [courseId, unitId] = key.split(':');
    const course = AP_COURSE_BY_ID.get(courseId);
    const unit = course?.units.find((u) => u.id === unitId);
    if (course && unit) nextWeek.push(`Finish ${course.name} Unit ${unit.number}: ${unit.title}.`);
  }
  if (goalsDone.length < ctx.profile.goals.personalGoals.length) {
    const open = ctx.profile.goals.personalGoals.find((g) => !g.done);
    if (open) nextWeek.push(`Your own goal, still open: ${open.text}`);
  }
  if (!nextWeek.length) nextWeek.push('Keep the current plan running. Nothing new is needed.');

  return {
    weekOf,
    accomplished,
    improved: improved.length ? improved : ['Not enough data this week to say anything about change.'],
    unfinished,
    patterns,
    nextWeek: nextWeek.slice(0, 4),
    stats: [
      { label: 'Questions answered', value: String(attempts.length) },
      { label: 'Accuracy', value: graded.length ? percent(accuracy) : '—' },
      { label: 'Study completed', value: studyMinutes ? `${Math.round(studyMinutes / 6) / 10} hrs` : '—' },
      { label: 'Active days', value: `${activeDays}/7` },
      { label: 'Week of', value: formatDate(weekOf, 'short') },
    ],
  };
}

export { todayISO, OPPORTUNITY_BY_ID };
