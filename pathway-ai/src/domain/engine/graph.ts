import { INTEREST_BY_ID } from '@/data/interests';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { uniq } from '@/lib/format';
import type { EngineContext } from './context';

/* ==========================================================================
   Interest graph — section 65
   Interests → Skills → Activities → Projects → Majors → Colleges → Careers
   Built so unexpected routes surface (music → audio engineering → CS).
   ========================================================================== */

export type GraphNodeKind = 'interest' | 'skill' | 'activity' | 'project' | 'major' | 'college' | 'career';

export interface GraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  /** True when this came from the student rather than the catalog. */
  fromProfile: boolean;
  route?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** Why these are connected, shown on hover and focus. */
  reason: string;
}

export interface InterestGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Routes the student probably has not considered. */
  discoveries: { path: string[]; insight: string }[];
}

const KIND_ORDER: GraphNodeKind[] = ['interest', 'skill', 'activity', 'project', 'major', 'college', 'career'];

export function buildInterestGraph(ctx: EngineContext, maxColleges = 4): InterestGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const add = (node: GraphNode) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
    return node.id;
  };
  const link = (from: string, to: string, reason: string) => {
    if (!edges.some((e) => e.from === from && e.to === to)) edges.push({ from, to, reason });
  };

  /* Interests */
  for (const id of ctx.interestIds) {
    const interest = INTEREST_BY_ID.get(id);
    if (!interest) continue;
    add({ id: `interest:${id}`, kind: 'interest', label: interest.name, fromProfile: true, route: '/app/majors' });
    for (const key of interest.strengthKeys.slice(0, 2)) {
      add({ id: `skill:${key}`, kind: 'skill', label: skillLabel(key), fromProfile: false });
      link(`interest:${id}`, `skill:${key}`, `${interest.name} builds ${skillLabel(key).toLowerCase()}`);
    }
  }

  /* Activities */
  for (const activity of ctx.profile.activities) {
    const nodeId = add({
      id: `activity:${activity.id}`,
      kind: 'activity',
      label: activity.name,
      fromProfile: true,
      route: '/app/activities',
    });
    // Connect an activity to interests whose names it references.
    for (const id of ctx.interestIds) {
      const interest = INTEREST_BY_ID.get(id);
      if (!interest) continue;
      const nameHit = activity.name.toLowerCase().includes(interest.name.toLowerCase().split(' ')[0].toLowerCase());
      const descHit = (activity.description ?? '').toLowerCase().includes(interest.name.toLowerCase());
      const categoryHit =
        (interest.id === 'music' && activity.category === 'music') ||
        (interest.id === 'community-service' && (activity.category === 'volunteering' || activity.category === 'community')) ||
        (interest.id === 'computer-science' && /cod|program|software|robot/i.test(activity.name + (activity.description ?? '')));
      if (nameHit || descHit || categoryHit) {
        link(`interest:${id}`, nodeId, `${activity.name} is where your interest in ${interest.name} shows up in practice`);
      }
    }
  }

  /* Majors */
  const majorIds = uniq([...ctx.majorIds, ...topRelatedMajors(ctx, 4)]);
  for (const id of majorIds) {
    const major = MAJOR_BY_ID.get(id);
    if (!major) continue;
    const isStated = ctx.majorIds.includes(id);
    const nodeId = add({
      id: `major:${id}`,
      kind: 'major',
      label: major.name,
      fromProfile: isStated,
      route: `/app/majors/${id}`,
    });
    for (const signal of major.interestSignals) {
      if (nodes.has(`interest:${signal}`)) {
        link(`interest:${signal}`, nodeId, `${INTEREST_BY_ID.get(signal)?.name ?? signal} points toward ${major.name}`);
      }
      const skillKeys = INTEREST_BY_ID.get(signal)?.strengthKeys ?? [];
      for (const key of skillKeys) {
        if (nodes.has(`skill:${key}`)) link(`skill:${key}`, nodeId, `${skillLabel(key)} is core to ${major.name}`);
      }
    }
    // Activities that feed this major.
    for (const activity of ctx.profile.activities) {
      const feeds = major.competitions.some((comp) => activity.name.toLowerCase().includes(comp.toLowerCase().split(' ')[0].toLowerCase()));
      if (feeds) link(`activity:${activity.id}`, nodeId, `${activity.name} is common preparation for ${major.name}`);
    }
  }

  /* Colleges — the student's list first, then strong matches for stated majors. */
  const listIds = ctx.account.collegeList.map((e) => e.collegeId);
  const collegeIds = uniq([
    ...listIds,
    ...majorIds.flatMap((m) => MAJOR_BY_ID.get(m)?.exampleProgramColleges ?? []),
  ]).slice(0, maxColleges);
  for (const id of collegeIds) {
    const college = COLLEGE_BY_ID.get(id);
    if (!college) continue;
    const nodeId = add({
      id: `college:${id}`,
      kind: 'college',
      label: college.shortName ?? college.name,
      fromProfile: listIds.includes(id),
      route: `/app/colleges/${id}`,
    });
    for (const majorId of majorIds) {
      if (college.majors.includes(majorId)) {
        const strong = college.strengths.includes(majorId);
        link(`major:${majorId}`, nodeId, strong
          ? `${college.shortName ?? college.name} is known for ${MAJOR_BY_ID.get(majorId)?.name}`
          : `${college.shortName ?? college.name} offers ${MAJOR_BY_ID.get(majorId)?.name}`);
      }
    }
  }

  /* Careers */
  const careerIds = uniq([...ctx.careerIds, ...majorIds.flatMap((m) => MAJOR_BY_ID.get(m)?.careers ?? []).slice(0, 8)]);
  for (const id of careerIds.slice(0, 10)) {
    const career = CAREER_BY_ID.get(id);
    if (!career) continue;
    const nodeId = add({
      id: `career:${id}`,
      kind: 'career',
      label: career.name,
      fromProfile: ctx.careerIds.includes(id),
      route: `/app/careers/${id}`,
    });
    for (const majorId of majorIds) {
      if (MAJOR_BY_ID.get(majorId)?.careers.includes(id)) {
        link(`major:${majorId}`, nodeId, `${MAJOR_BY_ID.get(majorId)?.name} is a common route into ${career.name}`);
      }
    }
  }

  /* Discoveries: routes that cross clusters the student may not have joined up. */
  const discoveries: InterestGraph['discoveries'] = [];
  for (const interestId of ctx.interestIds) {
    const interest = INTEREST_BY_ID.get(interestId);
    if (!interest) continue;
    for (const majorId of majorIds) {
      const major = MAJOR_BY_ID.get(majorId);
      if (!major || ctx.majorIds.includes(majorId)) continue;
      if (!major.interestSignals.includes(interestId)) continue;
      const clusterA = interest.cluster;
      const familyB = major.family;
      // Cross-cluster combinations are the interesting ones.
      const crossing =
        (clusterA === 'Arts' && familyB !== 'Arts') ||
        (clusterA === 'Humanities' && /Engineering|Natural Sciences/.test(familyB)) ||
        (clusterA === 'STEM' && /Arts|Humanities|Business/.test(familyB));
      if (!crossing) continue;
      const career = major.careers.map((c) => CAREER_BY_ID.get(c)).find(Boolean);
      discoveries.push({
        path: [interest.name, major.name, career?.name ?? 'a range of careers'],
        insight: `You listed ${interest.name}, which is usually filed under ${clusterA}. It connects directly to ${major.name} — and from there to work like ${career?.name ?? 'several fields'}. Combinations that cross categories are often the most distinctive thing a student has.`,
      });
      if (discoveries.length >= 4) break;
    }
    if (discoveries.length >= 4) break;
  }

  return {
    nodes: Array.from(nodes.values()).sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)),
    edges,
    discoveries,
  };
}

function topRelatedMajors(ctx: EngineContext, count: number): string[] {
  const scores = new Map<string, number>();
  for (const major of MAJORS) {
    if (ctx.majorIds.includes(major.id) || major.id === 'undecided') continue;
    let score = major.interestSignals.filter((s) => ctx.signalSet.has(s)).length * 2;
    score += major.careers.filter((c) => ctx.careerIds.includes(c)).length * 3;
    score += ctx.majorIds.filter((m) => MAJOR_BY_ID.get(m)?.relatedMajors.includes(major.id)).length * 2;
    if (score > 0) scores.set(major.id, score);
  }
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => id);
}

function skillLabel(key: string): string {
  const labels: Record<string, string> = {
    quantitative: 'Quantitative reasoning',
    scientific: 'Scientific reasoning',
    'abstract-reasoning': 'Abstract reasoning',
    writing: 'Writing',
    languages: 'Languages',
    communication: 'Communication',
    analysis: 'Analysis',
    building: 'Building things',
    creative: 'Creative work',
    craft: 'Craft',
    performance: 'Performance',
    leadership: 'Leadership',
    service: 'Service',
    discipline: 'Discipline',
    'memory-systems': 'Detail and recall',
    'systems-thinking': 'Systems thinking',
  };
  return labels[key] ?? key;
}

/* -------------------------------------------------------------------------
   Four-year plan — section 25
   ---------------------------------------------------------------------- */

export interface YearPlan {
  grade: number;
  isCurrent: boolean;
  isPast: boolean;
  theme: string;
  focuses: { title: string; detail: string; done?: boolean }[];
}

export function buildFourYearPlan(ctx: EngineContext): YearPlan[] {
  const majorName = ctx.primaryMajorId ? MAJOR_BY_ID.get(ctx.primaryMajorId)?.name : undefined;
  const sustained = ctx.profile.activities.filter((a) => a.gradesInvolved.length >= 2);

  const plan: YearPlan[] = [];
  for (const grade of [9, 10, 11, 12]) {
    const isPast = grade < ctx.grade;
    const isCurrent = grade === ctx.grade;
    const focuses: YearPlan['focuses'] = [];

    switch (grade) {
      case 9:
        focuses.push(
          { title: 'Build the academic foundation', detail: 'Grades this year count, but the bigger job is establishing habits that survive grade 11.', done: isPast },
          { title: 'Try things and drop them', detail: 'This is the only year where quitting something is free. Use it.', done: isPast },
          { title: 'Start one thing you might keep', detail: sustained.length ? `You kept ${sustained[0].name}, which is exactly the point.` : 'Something you would do without being asked.', done: isPast && sustained.length > 0 },
        );
        break;
      case 10:
        focuses.push(
          { title: 'Go deeper in one or two things', detail: 'Narrowing now is what makes grade 11 and 12 depth possible.', done: isPast },
          { title: 'Take the PSAT seriously as practice', detail: 'Not the qualifying year yet — a free diagnostic under real conditions.', done: isPast && ctx.profile.scores.some((s) => s.kind === 'PSAT') },
          { title: majorName ? `Test whether ${majorName} holds up` : 'Explore two or three directions', detail: 'A short project or a summer course tells you more than reading about it.', done: false },
          { title: 'Begin standardised test preparation lightly', detail: 'Twenty minutes a week now is worth far more than cramming later.', done: isPast && ctx.account.attempts.length > 0 },
        );
        break;
      case 11:
        focuses.push(
          { title: 'The academic year that matters most', detail: 'This is the last full year colleges see, and usually the most rigorous.', done: isPast },
          { title: 'Take the SAT or ACT', detail: ctx.satTotal ? `You have a score of ${ctx.satTotal} recorded.` : 'Sit it at least once with time to retake.', done: Boolean(ctx.profile.scores.some((s) => s.kind === 'SAT' && s.official)) },
          { title: 'Take on real responsibility somewhere', detail: 'Leadership that involves decisions, not a title on a form.', done: ctx.profile.activities.some((a) => a.leadership) },
          { title: 'Build a college list with a real range', detail: 'Including options where admission is predictable and cost is manageable.', done: ctx.account.collegeList.length >= 5 },
          { title: 'Ask for recommendations in spring', detail: 'Before the queue forms in September.', done: ctx.account.recommendationPackets.length > 0 },
        );
        break;
      default:
        focuses.push(
          { title: 'Finish the applications', detail: 'Early deadlines land in early November, regular in early January.', done: ctx.account.collegeList.some((e) => e.stage === 'applied') },
          { title: 'Write the essays honestly', detail: 'Start in summer if you can. The first draft is the hardest part.', done: ctx.account.essays.length > 0 },
          { title: 'Apply for financial aid and scholarships', detail: 'The FAFSA and CSS Profile have their own deadlines, separate from applications.', done: false },
          { title: 'Keep your grades up', detail: 'Offers are conditional. A collapsed final semester is a real risk, not a myth.', done: false },
          { title: 'Decide well', detail: 'Compare actual aid offers, not reputations. Visit if you can.', done: ctx.account.collegeList.some((e) => e.decision === 'accepted') },
        );
    }

    plan.push({
      grade,
      isCurrent,
      isPast,
      theme:
        grade === 9
          ? 'Foundation and exploration'
          : grade === 10
            ? 'Narrowing and depth'
            : grade === 11
              ? 'The year that carries the most weight'
              : 'Applications and decisions',
      focuses,
    });
  }
  return plan;
}
