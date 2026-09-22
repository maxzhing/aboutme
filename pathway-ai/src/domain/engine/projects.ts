import type { Explanation, ProjectTemplate } from '@/domain/types';
import { PROJECT_TEMPLATES } from '@/data/projects';
import { MAJOR_BY_ID } from '@/data/majors';
import { INTEREST_BY_ID } from '@/data/interests';
import { listJoin, uniq } from '@/lib/format';
import type { EngineContext } from './context';
import { explanation } from './explain';

/* ==========================================================================
   Project generator — section 26
   Suggestions are framed around what the student already does, and the app
   never invents an accomplishment or implies a project is résumé material.
   ========================================================================== */

export interface ProjectSuggestion {
  template: ProjectTemplate;
  score: number;
  /** Rewritten for this student, connecting their specific combination. */
  framing: string;
  matchedFrom: string[];
  explanation: Explanation;
  feasibility: 'comfortable' | 'a-stretch' | 'too-much';
}

export function generateProjects(ctx: EngineContext, limit = 8): ProjectSuggestion[] {
  const majorNames = ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m);

  return PROJECT_TEMPLATES.map((template) => {
    const majorHits = template.majorTags.filter((m) => ctx.majorIds.includes(m));
    const interestHits = template.interestTags.filter((t) => ctx.signalSet.has(t));
    let score = majorHits.length * 26 + interestHits.length * 12;

    // A project sitting at the intersection of two things the student does is the best kind.
    if (majorHits.length >= 2 || (majorHits.length && interestHits.length >= 2)) score += 20;

    // Time feasibility against what they actually have free.
    const feasibility: ProjectSuggestion['feasibility'] =
      template.hoursPerWeek <= ctx.constraints.availableWeeklyHours
        ? 'comfortable'
        : template.hoursPerWeek <= ctx.constraints.availableWeeklyHours + 4
          ? 'a-stretch'
          : 'too-much';
    if (feasibility === 'too-much') score -= 22;
    if (feasibility === 'comfortable') score += 8;

    // Difficulty relative to grade — do not suggest a 14-week engineering build to a grade 9 with no background.
    if (template.difficulty >= 4 && ctx.grade <= 9) score -= 12;
    if (template.difficulty <= 2 && ctx.grade >= 12) score -= 6;

    // Feedback and saved state.
    for (const fb of ctx.account.feedback.filter((f) => f.targetId === template.id)) {
      if (fb.kind === 'not-interested') score -= 100;
      if (fb.kind === 'already-doing') score -= 80;
      if (fb.kind === 'interested' || fb.kind === 'saved') score += 28;
    }

    // Does it build on something already in their life?
    const existing = ctx.profile.activities.find((a) =>
      template.skills.some((s) => (a.description ?? '').toLowerCase().includes(s.toLowerCase().split(' ')[0])) ||
      template.interestTags.some((t) => a.name.toLowerCase().includes((INTEREST_BY_ID.get(t)?.name ?? t).toLowerCase())),
    );
    if (existing) score += 14;

    const matchedFrom = uniq([
      ...majorHits.map((m) => MAJOR_BY_ID.get(m)?.name ?? m),
      ...interestHits.map((t) => INTEREST_BY_ID.get(t)?.name ?? t),
    ]);

    const framing = existing
      ? `You already do ${existing.name}. This would extend that rather than starting something unrelated.`
      : matchedFrom.length >= 2
        ? `This sits where your interest in ${listJoin(matchedFrom.slice(0, 2))} overlaps — which is usually where the most personal projects come from.`
        : matchedFrom.length === 1
          ? `Connects to your interest in ${matchedFrom[0]}.`
          : 'A broadly useful project, though it does not connect strongly to what you have told us yet.';

    return {
      template,
      score,
      framing,
      matchedFrom,
      feasibility,
      explanation: explanation({
        whyThis: framing,
        whyNow:
          ctx.grade <= 10
            ? 'Grade 9 and 10 are the best time for this — nobody is watching yet, so a project that fails teaches you something for free.'
            : ctx.grade === 11
              ? 'Something finished by the end of grade 11 can be written about honestly in your applications.'
              : 'Only worth starting now if you can genuinely finish it alongside applications.',
        connection: majorNames.length ? `Relevant to ${listJoin(majorNames)}.` : 'Relevant to the interests you listed.',
        requires: `About ${template.hoursPerWeek} hours a week for ${template.estimatedWeeks} weeks. Tools: ${listJoin(template.tools)}.`,
        alternatives: [
          'A smaller version — one milestone rather than all of them',
          'Extending an activity you already have instead of starting something new',
        ],
        uncertainty:
          feasibility !== 'comfortable'
            ? `This asks for more time than the roughly ${ctx.constraints.availableWeeklyHours} free hours a week we estimate you have.`
            : undefined,
        evidence: uniq([
          ...(majorNames.length ? [`Majors: ${listJoin(majorNames)}`] : []),
          ...(matchedFrom.length ? [`Interests: ${listJoin(matchedFrom)}`] : []),
          `Free time estimate: ~${ctx.constraints.availableWeeklyHours} hrs/week`,
        ]),
      }),
    };
  })
    .filter((s) => s.score > -40)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------
   Activity depth analyser — section 11
   ---------------------------------------------------------------------- */

export interface DepthAnalysis {
  activityId: string;
  /** 0–100 depth reading, presented as a description rather than a grade. */
  depthScore: number;
  dimensions: { label: string; state: 'strong' | 'present' | 'thin' | 'absent'; note: string }[];
  /** Concrete next steps rooted in this activity, never "join another club". */
  deepeningIdeas: { title: string; why: string; effort: 'small' | 'medium' | 'large' }[];
  summary: string;
}

export function analyseActivityDepth(ctx: EngineContext, activityId: string): DepthAnalysis | undefined {
  const activity = ctx.profile.activities.find((a) => a.id === activityId);
  if (!activity) return undefined;

  const years = activity.gradesInvolved.length;
  const hours = activity.hoursPerWeek ?? 0;
  const weeks = activity.weeksPerYear ?? 0;
  const annualHours = hours * weeks;

  const dimensions: DepthAnalysis['dimensions'] = [
    {
      label: 'Duration',
      state: years >= 3 ? 'strong' : years === 2 ? 'present' : 'thin',
      note:
        years >= 3
          ? `${years} years is genuine continuity.`
          : years === 2
            ? 'Two years reads as commitment. A third changes it from an interest to a through-line.'
            : 'One year is a start. What matters now is whether you continue.',
    },
    {
      label: 'Intensity',
      state: annualHours >= 200 ? 'strong' : annualHours >= 80 ? 'present' : annualHours > 0 ? 'thin' : 'absent',
      note: annualHours
        ? `About ${Math.round(annualHours)} hours a year.`
        : 'No hours recorded — add them so this reads accurately.',
    },
    {
      label: 'Responsibility',
      state: activity.leadership ? 'strong' : activity.role ? 'present' : 'absent',
      note: activity.leadership
        ? `You hold a defined leadership role${activity.role ? ` as ${activity.role}` : ''}.`
        : activity.role
          ? `You have a role (${activity.role}) but not a leadership one. Responsibility matters more than the title.`
          : 'No role recorded. Even "member" is worth stating; a specific responsibility is worth more.',
    },
    {
      label: 'Skill development',
      state: (activity.description ?? '').length > 120 ? 'present' : 'thin',
      note:
        (activity.description ?? '').length > 120
          ? 'Your description shows what you actually do, which is what makes skill visible.'
          : 'Your description is short. What can you do now that you could not two years ago?',
    },
    {
      label: 'Evidence of impact',
      state: activity.accomplishments.length >= 2 ? 'strong' : activity.accomplishments.length ? 'present' : 'absent',
      note: activity.accomplishments.length
        ? `You recorded ${activity.accomplishments.length}. These are your words — we never add to them.`
        : 'Nothing recorded. If something changed because you were there, write it down while you remember it.',
    },
    {
      label: 'Personal connection',
      state: activity.personalConnection ? 'strong' : 'absent',
      note: activity.personalConnection
        ? 'You have written why this matters to you, which is what makes an essay about it possible.'
        : 'Not recorded. This is the field that matters most when you write applications, and the easiest to forget.',
    },
  ];

  const weights: Record<DepthAnalysis['dimensions'][number]['state'], number> = { strong: 1, present: 0.6, thin: 0.3, absent: 0 };
  const depthScore = Math.round((dimensions.reduce((n, d) => n + weights[d.state], 0) / dimensions.length) * 100);

  const deepeningIdeas: DepthAnalysis['deepeningIdeas'] = [];

  if (!activity.personalConnection) {
    deepeningIdeas.push({
      title: 'Write down why this matters to you, in your own words',
      why: 'Two honest sentences now save an hour of staring at an essay prompt in eighteen months.',
      effort: 'small',
    });
  }
  if (!activity.accomplishments.length) {
    deepeningIdeas.push({
      title: 'Record what has actually changed because you were involved',
      why: 'Not awards — changes. Someone learned something, something works that did not, a process is better.',
      effort: 'small',
    });
  }
  if (!activity.leadership && years >= 2) {
    deepeningIdeas.push({
      title: 'Take on one defined responsibility inside this, not a new activity',
      why: `You have been part of ${activity.name} for ${years} years. Owning one specific thing within it is worth more than joining something else.`,
      effort: 'medium',
    });
  }
  if (activity.leadership) {
    deepeningIdeas.push({
      title: 'Build something that outlasts you here',
      why: 'Documentation, a trained successor, or a programme that runs without you. This is the difference between holding a role and leaving something behind.',
      effort: 'large',
    });
  }
  if (activity.category === 'competition' || activity.category === 'club') {
    deepeningIdeas.push({
      title: 'Teach what you have learned to newer members',
      why: 'Teaching exposes the gaps in your own understanding faster than competing does, and it is visible work.',
      effort: 'medium',
    });
  }
  if (activity.category === 'music' || activity.category === 'art') {
    deepeningIdeas.push({
      title: 'Organise something public — a recital, an exhibition, a recording',
      why: 'Performing or exhibiting on your own initiative is a different kind of evidence from participating in someone else’s programme.',
      effort: 'large',
    });
  }
  if (activity.category === 'volunteering' || activity.category === 'community') {
    deepeningIdeas.push({
      title: 'Find out whether what you do is working, and measure it',
      why: 'Most service goes unmeasured. Asking the organisation what actually helps is more useful than adding hours.',
      effort: 'medium',
    });
  }
  if (activity.category === 'research' || activity.category === 'project') {
    deepeningIdeas.push({
      title: 'Write it up properly and put it somewhere public',
      why: 'An unwritten project is invisible. A written one can be read, cited, and talked about in an interview.',
      effort: 'medium',
    });
  }

  const summary =
    depthScore >= 75
      ? `${activity.name} is a genuinely deep commitment. The useful question now is what you leave behind, not what you add.`
      : depthScore >= 50
        ? `${activity.name} has real substance. The gaps are mostly things you have not written down yet, not things you have not done.`
        : `${activity.name} is early. Depth comes from staying with it and taking on something specific — not from adding another activity alongside it.`;

  return { activityId, depthScore, dimensions, deepeningIdeas: deepeningIdeas.slice(0, 4), summary };
}
