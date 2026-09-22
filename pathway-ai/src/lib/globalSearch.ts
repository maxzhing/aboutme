import { searchItems, type Scored } from './search';
import type { IconName } from '@/components/ui/Icon';

/* ==========================================================================
   Global search index — sections 38 and 48.

   One flat index across every entity so the palette and the search page share
   it. The catalog is imported dynamically: a visitor who never opens the
   palette should not download 600 kB of college data to read the landing page.
   ========================================================================== */

export interface SearchEntry {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  route: string;
  icon: IconName;
  keywords: string[];
}

type Catalog = {
  COLLEGES: typeof import('@/data/colleges')['COLLEGES'];
  MAJORS: typeof import('@/data/majors')['MAJORS'];
  CAREERS: typeof import('@/data/careers')['CAREERS'];
  AP_COURSES: typeof import('@/data/ap')['AP_COURSES'];
  OPPORTUNITIES: typeof import('@/data/opportunities')['OPPORTUNITIES'];
  SCHOLARSHIPS: typeof import('@/data/scholarships')['SCHOLARSHIPS'];
  RESEARCH_PROGRAMS: typeof import('@/data/research')['RESEARCH_PROGRAMS'];
  PROJECT_TEMPLATES: typeof import('@/data/projects')['PROJECT_TEMPLATES'];
  SAT_MATH_DOMAINS: typeof import('@/data/questions')['SAT_MATH_DOMAINS'];
  SAT_VERBAL_DOMAINS: typeof import('@/data/questions')['SAT_VERBAL_DOMAINS'];
};

function build(catalog: Catalog): SearchEntry[] {
  const {
    COLLEGES, MAJORS, CAREERS, AP_COURSES, OPPORTUNITIES,
    SCHOLARSHIPS, RESEARCH_PROGRAMS, PROJECT_TEMPLATES,
    SAT_MATH_DOMAINS, SAT_VERBAL_DOMAINS,
  } = catalog;
  const out: SearchEntry[] = [];

  for (const c of COLLEGES) {
    out.push({
      id: `college:${c.id}`,
      title: c.name,
      subtitle: `${c.city}, ${c.state} · ${c.control} · ${c.sizeBand}`,
      kind: 'College',
      route: `/app/colleges/${c.id}`,
      icon: 'graduation',
      keywords: [c.shortName ?? '', c.state, c.region, ...c.strengths, ...c.tags],
    });
  }
  for (const m of MAJORS) {
    out.push({
      id: `major:${m.id}`,
      title: m.name,
      subtitle: m.family,
      kind: 'Major',
      route: `/app/majors/${m.id}`,
      icon: 'book',
      keywords: [m.family, ...m.skills, ...m.careers],
    });
  }
  for (const c of CAREERS) {
    out.push({
      id: `career:${c.id}`,
      title: c.name,
      subtitle: c.summary.slice(0, 80),
      kind: 'Career',
      route: `/app/careers/${c.id}`,
      icon: 'building',
      keywords: [...c.industries, ...c.skills],
    });
  }
  for (const c of AP_COURSES) {
    out.push({
      id: `ap:${c.id}`,
      title: c.name,
      subtitle: `${c.family} · ${c.units.length} units`,
      kind: 'AP course',
      route: `/app/ap/${c.id}`,
      icon: 'flask',
      keywords: [c.family, ...c.questionTypes],
    });
    for (const u of c.units) {
      out.push({
        id: `apunit:${u.id}`,
        title: `${c.name} — Unit ${u.number}: ${u.title}`,
        subtitle: u.description.slice(0, 80),
        kind: 'AP unit',
        route: `/app/ap/${c.id}/${u.id}`,
        icon: 'layers',
        keywords: [...u.concepts.slice(0, 6), ...u.bigIdeas],
      });
    }
  }
  for (const o of OPPORTUNITIES) {
    out.push({
      id: `opp:${o.id}`,
      title: o.name,
      subtitle: `${o.category.replace('-', ' ')} · ${o.format}`,
      kind: 'Activity',
      route: `/app/activities?open=${o.id}`,
      icon: 'users',
      keywords: [o.organization ?? '', ...o.skillsBuilt, ...o.majorTags],
    });
  }
  for (const s of SCHOLARSHIPS) {
    out.push({
      id: `sch:${s.id}`,
      title: s.name,
      subtitle: `${s.sponsor} · ${s.amountText}`,
      kind: 'Scholarship',
      route: `/app/scholarships?open=${s.id}`,
      icon: 'coins',
      keywords: [s.sponsor, ...s.majorTags],
    });
  }
  for (const r of RESEARCH_PROGRAMS) {
    out.push({
      id: `res:${r.id}`,
      title: r.name,
      subtitle: `${r.host} · ${r.kind.replace('-', ' ')}`,
      kind: 'Research',
      route: `/app/research?open=${r.id}`,
      icon: 'microscope',
      keywords: [r.host, ...r.subjects],
    });
  }
  for (const p of PROJECT_TEMPLATES) {
    out.push({
      id: `proj:${p.id}`,
      title: p.title,
      subtitle: p.objective.slice(0, 80),
      kind: 'Project',
      route: `/app/projects?open=${p.id}`,
      icon: 'rocket',
      keywords: [...p.skills, ...p.majorTags],
    });
  }
  for (const d of [...SAT_MATH_DOMAINS, ...SAT_VERBAL_DOMAINS]) {
    out.push({
      id: `satdomain:${d}`,
      title: `SAT — ${d}`,
      subtitle: 'Practice questions in this domain',
      kind: 'SAT topic',
      route: `/app/sat/practice?domain=${encodeURIComponent(d)}`,
      icon: 'target',
      keywords: ['sat', 'practice', d],
    });
  }

  return out;
}

/** Populated by `ensureSearchIndex`. Empty until the catalog has loaded. */
let SEARCH_INDEX: SearchEntry[] = [];
let loading: Promise<void> | undefined;

/** Loads the catalog and builds the index. Safe to call repeatedly. */
export function ensureSearchIndex(): Promise<void> {
  if (SEARCH_INDEX.length) return Promise.resolve();
  loading ??= Promise.all([
    import('@/data/colleges'),
    import('@/data/majors'),
    import('@/data/careers'),
    import('@/data/ap'),
    import('@/data/opportunities'),
    import('@/data/scholarships'),
    import('@/data/research'),
    import('@/data/projects'),
    import('@/data/questions'),
  ]).then(([colleges, majors, careers, ap, opportunities, scholarships, research, projects, questions]) => {
    SEARCH_INDEX = build({
      COLLEGES: colleges.COLLEGES,
      MAJORS: majors.MAJORS,
      CAREERS: careers.CAREERS,
      AP_COURSES: ap.AP_COURSES,
      OPPORTUNITIES: opportunities.OPPORTUNITIES,
      SCHOLARSHIPS: scholarships.SCHOLARSHIPS,
      RESEARCH_PROGRAMS: research.RESEARCH_PROGRAMS,
      PROJECT_TEMPLATES: projects.PROJECT_TEMPLATES,
      SAT_MATH_DOMAINS: questions.SAT_MATH_DOMAINS,
      SAT_VERBAL_DOMAINS: questions.SAT_VERBAL_DOMAINS,
    });
  });
  return loading;
}

/** True once catalog entries are searchable, so callers can show a hint. */
export function searchIndexReady(): boolean {
  return SEARCH_INDEX.length > 0;
}

export const SEARCH_ACTIONS: SearchEntry[] = [
  { id: 'act:home', title: 'Home', subtitle: 'Your dashboard', kind: 'Go to', route: '/app', icon: 'home', keywords: ['dashboard', 'today'] },
  { id: 'act:dna', title: 'Your Student DNA', subtitle: 'Strengths, majors, development areas', kind: 'Go to', route: '/app/path/dna', icon: 'brain', keywords: ['profile', 'strengths'] },
  { id: 'act:blind', title: 'Find my blind spots', subtitle: 'What your profile is missing', kind: 'Action', route: '/app/path/blind-spots', icon: 'lens', keywords: ['missing', 'gaps', 'weaknesses'] },
  { id: 'act:match', title: 'Find my colleges', subtitle: 'Personalised college matching', kind: 'Action', route: '/app/colleges/match', icon: 'compass', keywords: ['match', 'fit', 'find colleges'] },
  { id: 'act:compare', title: 'Compare colleges', subtitle: 'Side-by-side comparison board', kind: 'Action', route: '/app/colleges/compare', icon: 'grid', keywords: ['comparison'] },
  { id: 'act:map', title: 'College fit map', subtitle: 'Plot colleges on two dimensions', kind: 'Action', route: '/app/colleges/map', icon: 'map', keywords: ['visualise', 'scatter'] },
  { id: 'act:cost', title: 'Financial planning', subtitle: 'Cost, aid and budget', kind: 'Action', route: '/app/colleges/cost', icon: 'wallet', keywords: ['money', 'aid', 'budget', 'net price'] },
  { id: 'act:list', title: 'My college list', subtitle: 'Track colleges by stage', kind: 'Go to', route: '/app/colleges/list', icon: 'bookmark', keywords: ['saved', 'list'] },
  { id: 'act:applan', title: 'Build my AP plan', subtitle: 'Course recommendations by year', kind: 'Action', route: '/app/ap/plan', icon: 'flask', keywords: ['ap plan', 'courses'] },
  { id: 'act:apweak', title: 'AP weak areas', subtitle: 'Where your practice shows gaps', kind: 'Action', route: '/app/ap/weak-areas', icon: 'chart', keywords: ['ap weaknesses'] },
  { id: 'act:satpractice', title: 'SAT practice', subtitle: 'Adaptive and timed drills', kind: 'Action', route: '/app/sat/practice', icon: 'target', keywords: ['sat', 'drill', 'practice'] },
  { id: 'act:satweak', title: 'My weak areas', subtitle: 'SAT weakness tracker', kind: 'Action', route: '/app/sat/weaknesses', icon: 'lens', keywords: ['weaknesses', 'sat'] },
  { id: 'act:satscores', title: 'SAT score history', subtitle: 'Track practice scores over time', kind: 'Go to', route: '/app/sat/scores', icon: 'trending-up', keywords: ['scores', 'progress'] },
  { id: 'act:study', title: 'Build my study plan', subtitle: 'A realistic weekly schedule', kind: 'Action', route: '/app/planner/study-plan', icon: 'calendar', keywords: ['study plan', 'schedule'] },
  { id: 'act:deadlines', title: 'My deadlines', subtitle: 'What is coming up', kind: 'Go to', route: '/app/planner/deadlines', icon: 'clock', keywords: ['deadlines', 'due'] },
  { id: 'act:calendar', title: 'Master calendar', subtitle: 'Everything in one view', kind: 'Go to', route: '/app/planner/calendar', icon: 'calendar', keywords: ['calendar'] },
  { id: 'act:summer', title: 'What should I do this summer?', subtitle: 'Summer pathways', kind: 'Action', route: '/app/planner/summer', icon: 'sun', keywords: ['summer'] },
  { id: 'act:fouryear', title: 'Four-year plan', subtitle: 'Your roadmap through high school', kind: 'Go to', route: '/app/path/four-year', icon: 'map', keywords: ['roadmap', 'plan'] },
  { id: 'act:whatif', title: 'What if?', subtitle: 'Simulate changes to your profile', kind: 'Action', route: '/app/path/what-if', icon: 'sliders', keywords: ['simulate', 'scenario'] },
  { id: 'act:graph', title: 'Interest graph', subtitle: 'How your interests connect', kind: 'Go to', route: '/app/path/graph', icon: 'link', keywords: ['graph', 'connections'] },
  { id: 'act:activities', title: 'Find activities for me', subtitle: 'Personalised opportunities', kind: 'Action', route: '/app/activities', icon: 'users', keywords: ['extracurricular'] },
  { id: 'act:depth', title: 'Activity depth analyser', subtitle: 'How to go deeper in what you do', kind: 'Action', route: '/app/activities/depth', icon: 'roots', keywords: ['depth', 'analyse'] },
  { id: 'act:mine', title: 'My activities', subtitle: 'Everything you do', kind: 'Go to', route: '/app/activities/mine', icon: 'list', keywords: ['my activities'] },
  { id: 'act:projects', title: 'What should I build?', subtitle: 'Project generator', kind: 'Action', route: '/app/projects', icon: 'rocket', keywords: ['project', 'build'] },
  { id: 'act:research', title: 'Find research', subtitle: 'Research opportunities', kind: 'Action', route: '/app/research', icon: 'microscope', keywords: ['research', 'lab'] },
  { id: 'act:scholarships', title: 'Find scholarships', subtitle: 'Scholarship search', kind: 'Action', route: '/app/scholarships', icon: 'coins', keywords: ['scholarship', 'money'] },
  { id: 'act:apps', title: 'Application dashboard', subtitle: 'Checklists by college', kind: 'Go to', route: '/app/applications', icon: 'note', keywords: ['applications', 'checklist'] },
  { id: 'act:essays', title: 'Essay brainstormer', subtitle: 'Find what to write about', kind: 'Action', route: '/app/applications/essays', icon: 'pencil', keywords: ['essay', 'personal statement'] },
  { id: 'act:auth', title: 'Does this sound like me?', subtitle: 'Authenticity check', kind: 'Action', route: '/app/applications/essays', icon: 'quote', keywords: ['authenticity', 'voice'] },
  { id: 'act:activitylist', title: 'Activity list builder', subtitle: 'Prepare your application activity list', kind: 'Action', route: '/app/applications/activity-list', icon: 'list', keywords: ['activity list'] },
  { id: 'act:recs', title: 'Recommendation packets', subtitle: 'Organise material for recommenders', kind: 'Action', route: '/app/applications/recommendations', icon: 'users', keywords: ['recommendation', 'letters'] },
  { id: 'act:counselor', title: 'Ask Pathway AI', subtitle: 'Your AI counselor', kind: 'Action', route: '/app/counselor', icon: 'sparkles', keywords: ['chat', 'ask', 'counselor'] },
  { id: 'act:weekly', title: 'Weekly review', subtitle: 'What happened and what is next', kind: 'Go to', route: '/app/path/weekly', icon: 'chart', keywords: ['review', 'week'] },
  { id: 'act:achievements', title: 'Achievements', subtitle: 'Consistency and milestones', kind: 'Go to', route: '/app/path/achievements', icon: 'trophy', keywords: ['badges', 'streak'] },
  { id: 'act:settings', title: 'Settings', subtitle: 'Profile, appearance, privacy', kind: 'Go to', route: '/app/settings/profile', icon: 'settings', keywords: ['preferences'] },
  { id: 'act:memory', title: 'What the AI remembers', subtitle: 'Edit learned preferences', kind: 'Go to', route: '/app/settings/memory', icon: 'brain', keywords: ['memory', 'preferences'] },
  { id: 'act:privacy', title: 'Privacy and data', subtitle: 'Export or delete your data', kind: 'Go to', route: '/app/settings/data', icon: 'shield', keywords: ['export', 'delete', 'privacy'] },
  { id: 'act:parent', title: 'Parent view', subtitle: 'Share selected information', kind: 'Go to', route: '/app/settings/sharing', icon: 'users', keywords: ['parent', 'guardian', 'share'] },
  { id: 'act:admin', title: 'Admin — content', subtitle: 'Update catalog records with sources', kind: 'Go to', route: '/app/admin', icon: 'shield', keywords: ['admin', 'content'] },
];

const FIELDS = [
  { get: (e: SearchEntry) => e.title, weight: 1 },
  { get: (e: SearchEntry) => e.subtitle, weight: 0.55 },
  { get: (e: SearchEntry) => e.keywords, weight: 0.45 },
  { get: (e: SearchEntry) => e.kind, weight: 0.3 },
];

export function globalSearch(query: string, limit = 30): Scored<SearchEntry>[] {
  return searchItems(query, [...SEARCH_ACTIONS, ...SEARCH_INDEX], FIELDS, limit);
}
