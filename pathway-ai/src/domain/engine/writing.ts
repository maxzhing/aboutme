import type { AuthenticityResult, BrainstormResult, RecommendationPacket } from '@/domain/types';
import { MAJOR_BY_ID } from '@/data/majors';
import { listJoin, uniq, wordCount } from '@/lib/format';
import { nowISO } from '@/lib/date';
import { uid } from '@/lib/id';
import type { EngineContext } from './context';

/* ==========================================================================
   Essay brainstorming, authenticity checking and recommendation packets
   Sections 30, 32, 64. The rule throughout: never write the student's essay,
   never invent an experience, never claim an accomplishment they did not state.
   ========================================================================== */

export const ESSAY_ETHICS_NOTE =
  'Pathway AI will not write your essay. It surfaces material from what you have already told us and asks questions — the writing, and the voice, have to be yours. Admissions readers are good at spotting writing that is not.';

export function brainstormEssay(ctx: EngineContext, prompt: string): BrainstormResult {
  const stories: BrainstormResult['stories'] = [];
  const { profile } = ctx;

  // Story seeds come only from things the student wrote down themselves.
  for (const activity of profile.activities) {
    if (activity.personalConnection) {
      stories.push({
        title: `Why ${activity.name} actually matters to you`,
        seed: activity.personalConnection,
        whyItWorks:
          'You wrote this yourself, and it explains motivation rather than listing achievement. Essays that explain why tend to read as more specific than essays that explain what.',
        fromProfile: `Your note on ${activity.name}`,
      });
    }
    if (activity.leadership && activity.accomplishments.length) {
      stories.push({
        title: `A specific moment in ${activity.name}`,
        seed: `You recorded: "${activity.accomplishments[0]}". What was the hardest single day of getting there, and what did you get wrong first?`,
        whyItWorks:
          'The interesting part of a leadership story is almost never the outcome. It is the decision you were unsure about.',
        fromProfile: `Accomplishment you recorded for ${activity.name}`,
      });
    }
    if (activity.category === 'family' || activity.category === 'job') {
      stories.push({
        title: `What ${activity.name} taught you that school did not`,
        seed: `You spend around ${activity.hoursPerWeek ?? '?'} hours a week on this. What does it require of you that nothing else does?`,
        whyItWorks:
          'Work and family responsibility are frequently left out of applications. They are often the most distinctive thing a student has to write about.',
        fromProfile: `${activity.name} on your activity list`,
      });
    }
  }

  if (profile.goals.idealExperience) {
    stories.push({
      title: 'The thing you said you want',
      seed: `You wrote: "${profile.goals.idealExperience.slice(0, 180)}${profile.goals.idealExperience.length > 180 ? '…' : ''}" What experience made you want that specifically?`,
      whyItWorks: 'Working backwards from a want to its origin usually produces a concrete story rather than an abstract one.',
      fromProfile: 'Your onboarding answer about your ideal college experience',
    });
  }

  const crossovers = ctx.majorIds.slice(0, 2).map((m) => MAJOR_BY_ID.get(m)?.name).filter(Boolean);
  if (crossovers.length >= 2) {
    stories.push({
      title: `Where ${crossovers[0]} and ${crossovers[1]} meet for you`,
      seed: `You are considering both ${listJoin(crossovers as string[])}. When did you first notice they were connected, rather than two separate things you happened to like?`,
      whyItWorks: 'An unusual combination is only interesting if you can say what the connection is. That is a story, not a statement.',
      fromProfile: 'Majors you listed',
    });
  }

  for (const award of profile.awards.slice(0, 2)) {
    stories.push({
      title: `What ${award.name} did not show`,
      seed: 'What went wrong on the way to this that nobody watching would know about?',
      whyItWorks: 'Awards are already on your activity list. The essay is for what the list cannot carry.',
      fromProfile: `Award you recorded: ${award.name}`,
    });
  }

  const themes = uniq([
    ...profile.activities.filter((a) => a.gradesInvolved.length >= 3).map((a) => `Sustained commitment to ${a.name}`),
    ...(profile.activities.some((a) => a.category === 'family') ? ['Responsibility at home'] : []),
    ...(profile.activities.some((a) => a.leadership) ? ['Taking responsibility for other people'] : []),
    ...(ctx.majorIds.length > 1 ? ['Combining fields that are usually kept apart'] : []),
    ...(profile.activities.some((a) => /found|start|creat/i.test(a.role ?? '')) ? ['Starting something that did not exist'] : []),
  ]);

  const structures: BrainstormResult['structures'] = [
    {
      name: 'Single scene, then widen',
      outline: [
        'Open inside one specific moment, in the present tense if it helps',
        'Stay there long enough that the reader can picture it',
        'Widen: what this moment was part of',
        'What changed in how you think, stated plainly',
        'Close without a moral',
      ],
    },
    {
      name: 'Problem and revision',
      outline: [
        'State what you believed or attempted',
        'Describe the specific way it failed',
        'Show what you did differently, concretely',
        'What you now know that you did not',
        'A forward look that is one sentence, not a paragraph',
      ],
    },
    {
      name: 'Two threads converging',
      outline: [
        'Introduce the first thing you care about',
        'Introduce the second, apparently unrelated',
        'The moment you noticed a connection',
        'What you did once you noticed',
        'What that says about how you approach things',
      ],
    },
  ];

  const questions = [
    'What is something you changed your mind about in the last two years, and what changed it?',
    'What do you do when nobody has assigned it?',
    'What would someone who works alongside you say you are like when things go wrong?',
    'What is a small, specific detail from this experience that only you would know?',
    'If you removed every achievement from this story, what would be left that is still worth telling?',
  ];

  const cautions = [
    'Prompts like this attract the same three or four stories from thousands of applicants. Specificity, not subject, is what makes yours different.',
    'Avoid summarising your activity list. The reader already has it.',
    'If a sentence would be equally true for another student, cut it or make it more specific.',
    'Do not manufacture hardship or growth that did not happen. It reads as false, and it is not necessary.',
  ];

  if (!stories.length) {
    stories.push({
      title: 'We do not have enough from you yet',
      seed: 'Add descriptions and personal notes to your activities, and answer the question about your ideal college experience. The brainstormer only works from things you have written.',
      whyItWorks: 'Everything here is drawn from your own words. We will not invent a story for you.',
      fromProfile: 'Your profile is sparse in the fields this tool reads',
    });
  }

  void prompt;
  return {
    id: uid('brain'),
    generatedAt: nowISO(),
    stories: stories.slice(0, 6),
    themes: themes.slice(0, 6),
    structures,
    questions,
    cautions,
  };
}

/* -------------------------------------------------------------------------
   Authenticity check — section 64
   ---------------------------------------------------------------------- */

const GENERIC_PHRASES: { pattern: RegExp; phrase: string; suggestion: string }[] = [
  { pattern: /ever since I was (a )?(little|young|small)/i, phrase: 'Ever since I was little…', suggestion: 'Start at a specific moment instead. What year, what room, what happened?' },
  { pattern: /passion for/i, phrase: '…passion for…', suggestion: 'Show the passion through what you did rather than naming it.' },
  { pattern: /I have always (loved|wanted|been)/i, phrase: 'I have always…', suggestion: 'Almost never literally true. What changed, and when?' },
  { pattern: /taught me (the value of|that|to)/i, phrase: '…taught me the value of…', suggestion: 'State what you now do differently instead of what you learned.' },
  { pattern: /step(ped)? out of my comfort zone/i, phrase: '…out of my comfort zone…', suggestion: 'Describe the specific discomfort. "Comfort zone" tells the reader nothing.' },
  { pattern: /make a difference in the world/i, phrase: '…make a difference…', suggestion: 'Name the difference. In what, for whom, measured how?' },
  { pattern: /hard work (and|,) dedication/i, phrase: 'hard work and dedication', suggestion: 'Show the hours. The phrase itself is invisible to readers.' },
  { pattern: /I realized that/i, phrase: 'I realized that…', suggestion: 'Realisations are more convincing when the reader gets there first.' },
  { pattern: /my (whole|entire) (life|world) changed/i, phrase: '…my whole life changed…', suggestion: 'Scale the claim to what actually happened.' },
  { pattern: /countless hours/i, phrase: 'countless hours', suggestion: 'You can count them. Do.' },
  { pattern: /overcome(ing)? (adversity|obstacles|challenges)/i, phrase: '…overcoming challenges…', suggestion: 'Name the specific obstacle rather than the category.' },
  { pattern: /(unique|diverse) perspective/i, phrase: '…unique perspective…', suggestion: 'Demonstrate the perspective; do not assert it.' },
  { pattern: /leader(ship)? skills/i, phrase: '…leadership skills…', suggestion: 'Describe one decision you made that someone else would have made differently.' },
  { pattern: /I am excited to (contribute|bring)/i, phrase: 'I am excited to contribute…', suggestion: 'Say specifically what you would do, at this college, in this programme.' },
];

const SUPERLATIVES = /\b(best|greatest|most important|life-?changing|incredible|amazing|profound|transformative)\b/gi;

export function checkAuthenticity(ctx: EngineContext, text: string): AuthenticityResult {
  const words = wordCount(text);
  const lower = text.toLowerCase();

  const genericPhrases = GENERIC_PHRASES.filter((g) => g.pattern.test(text)).map((g) => ({
    phrase: g.phrase,
    suggestion: g.suggestion,
  }));

  /* Connections to the student's actual recorded profile. */
  const profileConnections: string[] = [];
  for (const activity of ctx.profile.activities) {
    const key = activity.name.toLowerCase().split(/[\s(]/)[0];
    if (key.length > 3 && lower.includes(key)) {
      profileConnections.push(`Mentions ${activity.name}, which is on your activity list`);
    }
  }
  for (const award of ctx.profile.awards) {
    const key = award.name.toLowerCase().split(/[\s(]/)[0];
    if (key.length > 3 && lower.includes(key)) profileConnections.push(`References ${award.name}`);
  }
  for (const majorId of ctx.majorIds) {
    const name = MAJOR_BY_ID.get(majorId)?.name;
    if (name && lower.includes(name.toLowerCase())) profileConnections.push(`Mentions ${name}, a major you listed`);
  }

  /* Claims we cannot corroborate against anything the student recorded. */
  const unsupportedClaims: string[] = [];
  const awardLike = text.match(/\b(won|awarded|first place|national champion|published|founded|president of|captain of)\b[^.!?]{0,80}/gi) ?? [];
  for (const claim of awardLike) {
    const trimmed = claim.trim();
    const corroborated =
      ctx.profile.awards.some((a) => lower.includes(a.name.toLowerCase().split(' ')[0])) ||
      ctx.profile.activities.some((a) => a.accomplishments.some((acc) => lower.includes(acc.toLowerCase().slice(0, 18))));
    if (!corroborated) {
      unsupportedClaims.push(`"${trimmed}" — nothing in your recorded profile corresponds to this. If it is true, add it to your profile; if it is not, remove it.`);
    }
  }

  /* Specificity: concrete nouns, numbers, named things. */
  const numbers = (text.match(/\b\d+\b/g) ?? []).length;
  const properNouns = (text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).filter((w) => !/^(The|This|That|My|When|After|Before|But|And|In|On|At|It|We|They|She|He)$/.test(w)).length;
  const superlatives = (text.match(SUPERLATIVES) ?? []).length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const avgSentence = sentences.length ? words / sentences.length : 0;

  let specificityScore = 40;
  specificityScore += Math.min(numbers * 4, 16);
  specificityScore += Math.min(properNouns * 2.5, 22);
  specificityScore += Math.min(profileConnections.length * 6, 18);
  specificityScore -= genericPhrases.length * 7;
  specificityScore -= superlatives * 3;
  if (avgSentence > 32) specificityScore -= 6;
  specificityScore = Math.max(0, Math.min(100, Math.round(specificityScore)));

  /* Suggestions, ordered by what would help most. */
  const suggestions: string[] = [];
  if (words < 120) suggestions.push('This is still short. Authenticity checking gets much more useful past about 250 words.');
  if (genericPhrases.length >= 3) suggestions.push('Several stock phrases appear. Each one is a place where a specific detail could go instead.');
  if (!profileConnections.length && words > 200) {
    suggestions.push('Nothing in this draft connects to anything in your profile. That is not automatically wrong, but it is worth checking whether the essay is about you or about a type of person.');
  }
  if (numbers === 0 && words > 200) suggestions.push('There are no numbers anywhere. Hours, counts, dates and measurements make a story concrete.');
  if (properNouns < 3 && words > 200) suggestions.push('Very few named things. Name the place, the piece, the person, the tool.');
  if (superlatives >= 3) suggestions.push('Superlatives are doing work the details should do. Cut most of them and see whether anything is lost.');
  if (avgSentence > 32) suggestions.push('Your average sentence is long. Varying sentence length gives the reader somewhere to breathe.');
  if (!suggestions.length) suggestions.push('This reads as specific and grounded. The remaining work is line-level, not structural.');

  return {
    id: uid('auth'),
    runAt: nowISO(),
    wordCount: words,
    specificityScore,
    genericPhrases,
    unsupportedClaims: unsupportedClaims.slice(0, 5),
    profileConnections: uniq(profileConnections).slice(0, 6),
    suggestions,
  };
}

/* -------------------------------------------------------------------------
   Activity list descriptions — section 31
   Concise rewriting only. We never add an accomplishment.
   ---------------------------------------------------------------------- */

export interface ActivityDescriptionSuggestion {
  activityId: string;
  original: string;
  tightened: string;
  characterCount: number;
  notes: string[];
}

export function tightenActivityDescription(ctx: EngineContext, activityId: string, limit = 150): ActivityDescriptionSuggestion | undefined {
  const activity = ctx.profile.activities.find((a) => a.id === activityId);
  if (!activity) return undefined;
  const original = activity.description ?? '';
  const notes: string[] = [];

  let text = original
    .replace(/^I (am|was|have been) (a |the )?/i, '')
    .replace(/\bI\s+/g, '')
    .replace(/\b(really|very|quite|extremely|incredibly)\s+/gi, '')
    .replace(/\bin order to\b/gi, 'to')
    .replace(/\bresponsible for\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (text && text[0] === text[0].toLowerCase()) text = text[0].toUpperCase() + text.slice(1);

  if (original.length > limit && text.length > limit) {
    const clauses = text.split(/[;.]\s*/).filter(Boolean);
    text = '';
    for (const clause of clauses) {
      if ((text + clause).length > limit - 2) break;
      text += (text ? '; ' : '') + clause;
    }
    notes.push(`Trimmed to fit a ${limit}-character limit. Check that nothing essential was cut.`);
  }

  if (!activity.accomplishments.length) {
    notes.push('You have not recorded accomplishments for this activity, so none were added. We never invent them.');
  } else {
    notes.push(`You recorded ${activity.accomplishments.length} accomplishment(s) separately — consider whether one belongs in this description.`);
  }
  if (!/\d/.test(text)) notes.push('No numbers here. If you can quantify something honestly, it usually helps.');
  notes.push('This only shortens and tightens your own words. Read it before using it.');

  return { activityId, original, tightened: text || original, characterCount: text.length, notes };
}

/* -------------------------------------------------------------------------
   Recommendation packet — section 32
   ---------------------------------------------------------------------- */

export interface PacketContent {
  studentName: string;
  grade: number;
  intendedMajors: string[];
  recommender: string;
  relationship: string;
  academicInterests: string[];
  activities: { name: string; role?: string; years: number; hours?: number; description?: string }[];
  achievements: string[];
  memories: string[];
  goals?: string;
  note: string;
}

export function buildRecommendationPacket(ctx: EngineContext, packet: RecommendationPacket): PacketContent {
  const included = packet.includeActivityIds.length
    ? ctx.profile.activities.filter((a) => packet.includeActivityIds.includes(a.id))
    : ctx.profile.activities.filter((a) => a.onApplicationList);
  const awards = packet.includeAwardIds.length
    ? ctx.profile.awards.filter((a) => packet.includeAwardIds.includes(a.id))
    : ctx.profile.awards;

  return {
    studentName: ctx.profile.displayName,
    grade: ctx.grade,
    intendedMajors: ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m),
    recommender: packet.recommenderName,
    relationship: packet.relationship,
    academicInterests: ctx.interestIds.slice(0, 6),
    activities: included.map((a) => ({
      name: a.name,
      role: a.role,
      years: a.gradesInvolved.length,
      hours: a.hoursPerWeek,
      description: a.description,
    })),
    achievements: awards.map((a) => `${a.name}${a.year ? ` (${a.year})` : ''} — ${a.level} level`),
    memories: packet.memories,
    goals: packet.goalsNote,
    note:
      'Everything in this packet comes from what you entered. Nothing has been added, embellished or inferred. Give it to your recommender as background — it is not a draft of their letter.',
  };
}
