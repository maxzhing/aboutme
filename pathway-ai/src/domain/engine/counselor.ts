import type { ChatMessage, LearnedPreference } from '@/domain/types';
import { COLLEGES, COLLEGE_BY_ID, REGIONS } from '@/data/colleges';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { AP_COURSES, AP_COURSE_BY_ID } from '@/data/ap';
import { CAREER_BY_ID } from '@/data/careers';
import { countLabel, listJoin, percent, uniq } from '@/lib/format';
import { daysUntil } from '@/lib/date';
import type { EngineContext } from './context';
import { matchColleges, matchForCollege } from './collegeMatch';
import { buildAPPlan } from './apPlanner';
import { findOpportunities, findScholarships } from './opportunities';
import { findBlindSpots, deadlineIntelligence, summerPaths } from './planning';
import { satStats, errorPatterns } from './practice';
import { generateProjects } from './projects';
import { buildStudentDNA } from './dna';

/* ==========================================================================
   Pathway AI Counselor — sections 33, 39, 43, 63, 80
   The counselor composes answers from the same engine the rest of the app
   uses. It does not invent facts, it names what it does not know, and it
   records preferences the student states so later answers respect them.
   ========================================================================== */

export interface CounselorReply {
  content: string;
  citedProfileFields: string[];
  suggestions: string[];
  links: { label: string; route: string }[];
  learned: string[];
}

type Intent =
  | 'admission-chance'
  | 'colleges'
  | 'ap-course'
  | 'activities'
  | 'sat'
  | 'summer'
  | 'missing'
  | 'major'
  | 'career'
  | 'essay'
  | 'money'
  | 'deadlines'
  | 'project'
  | 'schedule'
  | 'about-me'
  | 'preference'
  | 'greeting'
  | 'capability'
  | 'unknown';

interface Detected {
  intent: Intent;
  /** Entities recognised in the question. */
  collegeId?: string;
  majorId?: string;
  apCourseId?: string;
  careerId?: string;
  /** Preference statements to record. */
  preference?: Omit<LearnedPreference, 'id' | 'createdAt' | 'active'>;
}

const STATE_NAMES: Record<string, string> = {
  california: 'CA', texas: 'TX', 'new york': 'NY', florida: 'FL', massachusetts: 'MA', illinois: 'IL',
  pennsylvania: 'PA', michigan: 'MI', georgia: 'GA', virginia: 'VA', washington: 'WA', 'north carolina': 'NC',
  ohio: 'OH', arizona: 'AZ', colorado: 'CO', indiana: 'IN', wisconsin: 'WI', minnesota: 'MN', maryland: 'MD',
  'new jersey': 'NJ', 'rhode island': 'RI', connecticut: 'CT', vermont: 'VT', tennessee: 'TN',
};

const NAME_STOPWORDS = new Set(['university', 'college', 'of', 'the', 'at', 'institute', 'state', 'school', 'and', 'polytechnic']);

/**
 * Matches a college by full name, short name, or the distinctive words in its
 * name — so "Carnegie Mellon" and "tell me about Georgia Tech" both resolve.
 */
function findCollege(q: string) {
  const exact = COLLEGES.find((c) => q.includes(c.name.toLowerCase()));
  if (exact) return exact;
  const short = COLLEGES.find((c) => {
    const s = c.shortName?.toLowerCase();
    return Boolean(s && s.length > 2 && new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q));
  });
  if (short) return short;
  let best: { college: (typeof COLLEGES)[number]; hits: number } | undefined;
  for (const c of COLLEGES) {
    const words = c.name
      .toLowerCase()
      .replace(/[^a-z\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((w) => w.length > 3 && !NAME_STOPWORDS.has(w));
    if (!words.length) continue;
    const hits = words.filter((w) => q.includes(w)).length;
    // Require either every distinctive word, or at least two of them.
    if (hits && (hits === words.length || hits >= 2) && (!best || hits > best.hits)) {
      best = { college: c, hits };
    }
  }
  return best?.college;
}

function detect(text: string, ctx: EngineContext): Detected {
  const q = text.toLowerCase().trim();

  /* Preference statements first — these are instructions, not questions. */
  const negative = /(don'?t want|do not want|not interested in|no thanks|avoid|stay away from|rather not|i can'?t afford|i cannot afford|can'?t afford|cannot afford|too expensive|too far)/i.test(q);
  if (negative) {
    for (const [name, code] of Object.entries(STATE_NAMES)) {
      if (q.includes(name)) {
        return {
          intent: 'preference',
          preference: { statement: `Do not suggest colleges in ${name.replace(/\b\w/g, (c) => c.toUpperCase())}`, kind: 'exclude-state', value: code, source: 'chat' },
        };
      }
    }
    for (const region of REGIONS) {
      if (q.includes(region.toLowerCase())) {
        return {
          intent: 'preference',
          preference: { statement: `Do not suggest colleges in the ${region}`, kind: 'exclude-region', value: region, source: 'chat' },
        };
      }
    }
    const costMatch = q.match(/\$?\s?(\d{1,3}),?(\d{3})/);
    if (costMatch && /afford|cost|budget|expensive|pay|tuition|year/.test(q)) {
      const value = Number(`${costMatch[1]}${costMatch[2]}`);
      return {
        intent: 'preference',
        preference: { statement: `Keep annual cost at or below $${value.toLocaleString()}`, kind: 'max-cost', value, source: 'chat' },
      };
    }
    if (/expensive|afford|cost/.test(q)) {
      return {
        intent: 'preference',
        preference: { statement: 'Prefer low-cost and well-aided options', kind: 'note', value: 'cost-sensitive', source: 'chat' },
      };
    }
    if (/far|distance|close to home|near home/.test(q)) {
      return {
        intent: 'preference',
        preference: { statement: 'Prefer colleges closer to home', kind: 'note', value: 'distance-sensitive', source: 'chat' },
      };
    }
    if (/time|busy|hours|commit/.test(q)) {
      return {
        intent: 'preference',
        preference: { statement: 'Prefer lower-time-commitment opportunities', kind: 'max-hours', value: Math.max(2, ctx.constraints.availableWeeklyHours - 3), source: 'chat' },
      };
    }
  }

  /* Entity recognition. */
  const college = findCollege(q);
  const apCourse = AP_COURSES.find((c) => q.includes(c.name.toLowerCase().replace('ap ', 'ap ')) || q.includes(c.name.toLowerCase().replace('ap ', '')));
  const major = MAJORS.find((m) => m.id !== 'undecided' && q.includes(m.name.toLowerCase()));
  const career = Array.from(CAREER_BY_ID.values()).find((c) => q.includes(c.name.toLowerCase()));

  /* Asking about odds of admission. Answered honestly and never estimated. */
  const asksChances = /(chance|chances|odds|likelihood|probability|will i (get|be) (in|into|accepted|admitted)|can i get (in|into)|do i have a shot|am i good enough|would i get in|likely to (get|be) (in|accepted|admitted)|reach school for me|safety for me|match for me|predict my)/i.test(q);
  if (asksChances) return { intent: 'admission-chance', collegeId: college?.id };

  if (/^(hi|hey|hello|yo)\b/.test(q) || q === 'hi' || q === 'hello') return { intent: 'greeting' };
  if (/what can you do|how do you work|what are you|help me with/.test(q)) return { intent: 'capability' };
  if (/what am i missing|blind spot|what should i work on|weakness(es)? in my (profile|application)|what'?s missing/.test(q)) return { intent: 'missing' };
  if (/summer/.test(q)) return { intent: 'summer' };
  if (/deadline|due|when (do|does|should) i (apply|submit|register)/.test(q)) return { intent: 'deadlines' };
  if (/essay|personal statement|write about|supplement/.test(q)) return { intent: 'essay' };
  if (/scholarship|financial aid|afford|cost|net price|tuition|money|fafsa|loan|pay(ing)? for/.test(q)) return { intent: 'money', collegeId: college?.id };
  if (/\bsat\b|\bact\b|test score|standardi[sz]ed|digital sat/.test(q)) return { intent: 'sat' };
  // Practice-performance questions are SAT questions unless they name an AP course.
  if (/practice (result|score|question|attempt)|my (weak|weakness|weaknesses|weak areas?|error|mistake)|what (am|are) i getting wrong|where do i keep|accuracy/.test(q)) {
    return { intent: apCourse ? 'ap-course' : 'sat', apCourseId: apCourse?.id };
  }
  if (/should i take|ap plan|which ap|what ap|course load|schedule next year/.test(q) || (apCourse && /take|should|worth/.test(q))) {
    return { intent: 'ap-course', apCourseId: apCourse?.id };
  }
  // College keywords win over "research", which appears in both contexts.
  const mentionsCollege = /college|universit|school list|where should i apply|apply to|campus|which schools/.test(q);
  if (/activit|club|extracurricular|competition|volunteer|internship/.test(q) && !mentionsCollege) {
    return { intent: 'activities' };
  }
  if (/\bresearch\b/.test(q) && !mentionsCollege) return { intent: 'activities' };
  if (/project|build|make something/.test(q)) return { intent: 'project' };
  if (/study plan|how (should|do) i study|schedule my|time management|plan my week/.test(q)) return { intent: 'schedule' };
  if (/career|job|become a|work as/.test(q) || career) return { intent: 'career', careerId: career?.id };
  if (/major|study what|what should i study|degree/.test(q) || (major && !/college|university|school/.test(q))) {
    return { intent: 'major', majorId: major?.id };
  }
  if (mentionsCollege || /\bfit\b/.test(q) || college) {
    return { intent: 'colleges', collegeId: college?.id };
  }
  if (/about me|my profile|my strengths|who am i|my dna|summar(y|ise|ize) me/.test(q)) return { intent: 'about-me' };

  // Any recognised college already returned above, so only these two can remain.
  return { intent: 'unknown', majorId: major?.id, apCourseId: apCourse?.id };
}

function profileHeader(ctx: EngineContext): string[] {
  const fields: string[] = [`Grade ${ctx.grade}`];
  if (ctx.majorIds.length) fields.push(`Majors: ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}`);
  if (ctx.gpa4) fields.push(`GPA ${ctx.gpa4.toFixed(2)}`);
  if (ctx.satTotal) fields.push(`SAT ${ctx.satTotal}`);
  if (ctx.profile.academics.state) fields.push(`State: ${ctx.profile.academics.state}`);
  if (ctx.constraints.maxCostPerYear) fields.push(`Budget: $${ctx.constraints.maxCostPerYear.toLocaleString()}/yr`);
  return fields;
}

const NO_PROFILE_NOTE =
  'I can answer this much better once your profile has more in it. Right now I am working from very little.';

export function answer(ctx: EngineContext, question: string): CounselorReply {
  const detected = detect(question, ctx);
  const cited = profileHeader(ctx);
  const learned: string[] = [];
  let content = '';
  let suggestions: string[] = [];
  let links: { label: string; route: string }[] = [];

  switch (detected.intent) {
    case 'greeting': {
      const dna = buildStudentDNA(ctx);
      content = `Hello. I have your profile in front of me — grade ${ctx.grade}${
        ctx.majorIds.length ? `, leaning toward ${listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}` : ', no major named yet'
      }.\n\nYou can ask me things like "should I take AP Physics?", "what am I missing?", or "what should I do this summer?" — I will answer from what you have actually told me rather than in general.${
        dna.missingInputs.length ? `\n\nOne thing worth knowing: ${dna.missingInputs[0].toLowerCase()}.` : ''
      }`;
      suggestions = ['What am I missing?', 'What colleges should I research?', 'What should I do this summer?'];
      break;
    }

    case 'capability': {
      content = `I work from your profile — your courses, scores, activities, preferences and constraints — and I use the same engine as the rest of this app, so my answers match what you see on the other pages.\n\n**What I can do**\n\n- Explain why a college does or does not fit you, dimension by dimension\n- Say whether a specific AP course makes sense for you, including whether you are ready\n- Find activities and research that fit your time, budget and location\n- Tell you what your practice data says about your weaknesses\n- Build a study plan around your actual commitments\n- Point out what your profile is missing\n\n**What I will not do**\n\n- Predict whether you will be admitted anywhere. Nobody can, and any tool claiming to is selling something\n- Write your essay for you\n- Invent an accomplishment, award or activity\n- Present demo data as verified fact — I flag it when I am not sure`;
      suggestions = ['What am I missing?', 'Explain my college matches', 'What should I focus on this term?'];
      break;
    }

    case 'preference': {
      if (detected.preference) {
        learned.push(detected.preference.statement);
        content = `Noted — I have recorded that: **${detected.preference.statement}**.\n\nEvery recommendation from now on will respect it. You can see and edit everything I remember in Settings, and turning one off immediately changes what I suggest.`;
        links = [{ label: 'What the AI remembers', route: '/app/settings/memory' }];
        suggestions = ['Show me colleges again', 'What else do you remember about me?'];
      }
      break;
    }

    case 'colleges': {
      if (detected.collegeId) {
        const college = COLLEGE_BY_ID.get(detected.collegeId)!;
        const match = matchColleges(ctx, { respectExclusions: false }).find((m) => m.collegeId === detected.collegeId);
        if (!match) break;
        const lines = match.dimensions
          .map((d) => `**${d.label}: ${d.band}**  \n${d.reasons.slice(0, 2).join('. ') || 'Limited data.'}${d.gaps.length ? `  \nWatch: ${d.gaps[0]}` : ''}`)
          .join('\n\n');
        content = `**${college.name}** — ${match.headline}\n\n${lines}\n\n${match.academicContext.gpaNote ?? ''} ${match.academicContext.testNote ?? ''}\n\n_${match.academicContext.disclaimer}_\n\nOne thing to be clear about: the figures in this app are demo data. Check ${college.admissionsUrl ?? 'the admissions site'} before acting on any of it.`;
        links = [
          { label: `Open ${college.shortName ?? college.name}`, route: `/app/colleges/${college.id}` },
          { label: 'Compare with your list', route: '/app/colleges/compare' },
        ];
        suggestions = [`What would make ${college.shortName ?? college.name} a better fit?`, 'Show me similar colleges', 'What does it cost?'];
      } else {
        const matches = matchColleges(ctx, { limit: 5 });
        if (!ctx.majorIds.length && !ctx.profile.collegePrefs.priorities.length) {
          content = `${NO_PROFILE_NOTE}\n\nWithout a major or any stated preferences, any list I give you is just a ranking of well-known names, which is not useful. Tell me two things you might study and three things that matter to you in a college, and I can do something real with that.`;
          links = [{ label: 'Set your preferences', route: '/app/settings/profile' }];
          suggestions = ['Help me pick a major', 'What should I care about in a college?'];
        } else {
          const lines = matches
            .map((m, i) => {
              const c = COLLEGE_BY_ID.get(m.collegeId)!;
              const best = m.dimensions.slice().sort((a, b) => b.score - a.score)[0];
              return `${i + 1}. **${c.shortName ?? c.name}** (${c.city}, ${c.state}) — ${best.reasons[0] ?? m.headline}`;
            })
            .join('\n');
          content = `Based on ${listJoin(cited.slice(0, 3))}, these are worth researching first:\n\n${lines}\n\nI ordered these by how well they match what you have told me, across academic, personal, opportunity and financial fit separately. **That ordering is not a ranking of quality, and it is definitely not a ranking of your chances.**\n\n${
            ctx.constraints.maxCostPerYear
              ? `I have kept your $${ctx.constraints.maxCostPerYear.toLocaleString()} budget in view, but average net price is an average — run each net price calculator.`
              : 'You have not set a budget, which is the single biggest gap in this list. Cost usually decides more than fit does.'
          }`;
          links = [
            { label: 'See full matches with reasoning', route: '/app/colleges/match' },
            { label: 'Fit map', route: '/app/colleges/map' },
          ];
          suggestions = ['Why did you pick these?', 'Show me cheaper options', 'What am I missing from my list?'];
        }
      }
      break;
    }

    case 'ap-course': {
      const plan = buildAPPlan(ctx);
      if (detected.apCourseId) {
        const course = AP_COURSE_BY_ID.get(detected.apCourseId)!;
        const item = Object.values(plan.byGrade).flat().find((i) => i.courseId === course.id);
        const offered = !ctx.profile.academics.schoolOffersAP.length || ctx.profile.academics.schoolOffersAP.includes(course.id);
        if (!item) {
          content = `**${course.name}** does not come out as a priority for you.\n\nIt supports ${listJoin(course.supportsMajors.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}, and you listed ${
            ctx.majorIds.length ? listJoin(ctx.majorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m)) : 'no major yet'
          }. That does not make it a bad course — it makes it a course you would take because you want to, which is a perfectly good reason. It is a ${course.workload}/5 workload.${
            offered ? '' : '\n\nAlso worth noting: you have not listed this among the AP courses your school offers.'
          }`;
        } else {
          const tierText =
            item.tier === 'recommended'
              ? 'Yes — this is core preparation for you, not a prestige pick.'
              : item.tier === 'useful'
                ? 'It would help, but it is not essential.'
                : item.tier === 'optional'
                  ? 'Only if you have room. Your grade is already near the workload you said you could carry.'
                  : 'Probably not, at least not yet.';
          content = `**Should you take ${course.name}?** ${tierText}\n\n**Readiness:** ${item.readinessNote}\n\n**Why:** ${item.explanation.whyThis}\n\n**Why now:** ${item.explanation.whyNow}\n\n**What it requires:** ${item.explanation.requires}\n\n**Alternatives:** ${item.explanation.alternatives.join('; ')}${
            item.explanation.uncertainty ? `\n\n_${item.explanation.uncertainty}_` : ''
          }`;
        }
        links = [
          { label: `Open ${course.name}`, route: `/app/ap/${course.id}` },
          { label: 'Your full AP plan', route: '/app/ap/plan' },
        ];
        suggestions = ['Show me my whole AP plan', 'What else should I take next year?'];
      } else {
        const next = plan.byGrade[ctx.grade] ?? [];
        const recommended = next.filter((i) => i.tier === 'recommended');
        content = recommended.length
          ? `For grade ${ctx.grade}, these come out as core rather than optional:\n\n${recommended
              .map((i) => `- **${AP_COURSE_BY_ID.get(i.courseId)?.name}** — ${i.explanation.whyThis} (${i.readiness === 'ready' ? 'you are ready' : i.readinessNote})`)
              .join('\n')}\n\nTotal workload for the year: about ${plan.loadByGrade[ctx.grade]} against a ceiling of what you said you could carry (${ctx.profile.rigorTolerance}).\n\n${plan.notes[plan.notes.length - 1]}`
          : `Nothing comes out as essential for grade ${ctx.grade} based on what you have told me. ${
              ctx.majorIds.length ? '' : 'That is mostly because you have not named a major — the planner works from that.'
            }`;
        links = [{ label: 'Open your AP plan', route: '/app/ap/plan' }];
        suggestions = ['Should I take AP Calculus BC?', 'Is that too heavy a load?'];
      }
      break;
    }

    case 'activities': {
      const scored = findOpportunities(ctx, {}, 4);
      if (!scored.length) {
        content = 'I could not find anything that fits your constraints. Loosening the time or cost filters would open things up.';
        break;
      }
      content = `Given ${listJoin(cited.slice(0, 3))} and roughly ${ctx.constraints.availableWeeklyHours} free hours a week, these fit:\n\n${scored
        .map((s) => `- **${s.opportunity.name}** — ${s.reasons[0] ?? 'broadly relevant'}. ${s.opportunity.cost === 'free' ? 'Free.' : s.opportunity.cost === 'stipend' ? 'Paid.' : `Cost: ${s.opportunity.cost}.`}${s.blockers.length ? ` _Watch: ${s.blockers[0]}_` : ''}`)
        .join('\n')}\n\nI deliberately did not just list everything. Adding activities is usually the wrong move — depth in what you already do reads better than breadth. If none of these connect to something you genuinely care about, the honest answer is to skip them.`;
      links = [
        { label: 'Find activities', route: '/app/activities' },
        { label: 'Analyse what you already do', route: '/app/activities/depth' },
      ];
      suggestions = ['How do I go deeper in what I already do?', 'Find me research instead', 'Only free options'];
      break;
    }

    case 'sat': {
      const stats = satStats(ctx);
      const patterns = errorPatterns(ctx);
      const nextTest = ctx.profile.plannedTests.find((t) => t.kind === 'SAT');
      if (!stats.total) {
        content = `You have not answered any practice questions here yet, so I have nothing to work from.\n\nThe most useful next step is a diagnostic — one timed set tells me far more than anything you could describe. ${
          nextTest?.date ? `Your test is ${daysUntil(nextTest.date, ctx.today)} days away.` : 'You also have no test date recorded.'
        }`;
        links = [{ label: 'Start a diagnostic', route: '/app/sat/practice' }];
        suggestions = ['Start a 10-minute practice', 'When should I take the SAT?'];
      } else {
        const weak = stats.byDomain.filter((d) => d.attempted >= 2).slice(0, 2);
        content = `Across ${countLabel(stats.total, 'question')} you are at ${percent(stats.accuracy)} overall.\n\n**Weakest areas**\n${weak
          .map((d) => `- ${d.label}: ${percent(d.accuracy)} (${d.correct}/${d.attempted}), median ${d.medianSec}s against a ${d.targetSec}s target`)
          .join('\n')}\n\n${patterns.length ? `**A pattern I can actually point at:** ${patterns[0].statement}` : ''}\n\n${
          nextTest?.date ? `Your test is ${daysUntil(nextTest.date, ctx.today)} days away, so targeted drills on the weakest area beat mixed practice right now.` : 'You have no test date recorded — setting one changes how I would sequence this.'
        }\n\n_Practice accuracy here is not a score prediction. Only a full timed official practice test gives a number worth planning around._`;
        links = [
          { label: 'Your weak areas', route: '/app/sat/weaknesses' },
          { label: 'Targeted practice', route: '/app/sat/practice' },
        ];
        suggestions = [`Drill ${weak[0]?.label ?? 'my weakest area'}`, 'Show my score history', 'Build me a study plan'];
      }
      break;
    }

    case 'summer': {
      const paths = summerPaths(ctx);
      content = `There is no single right answer here, so let me give you the real options rather than one recommendation.\n\n${paths
        .slice(0, 4)
        .map((p) => `**${p.title}**  \n${p.purpose} ${p.fitsYou}  \n_Reality check: ${p.realityCheck}_`)
        .join('\n\n')}\n\nOne of these is rest, and I mean it. ${
        ctx.committedHours > 25 ? `You are carrying about ${Math.round(ctx.committedHours)} hours a week already.` : ''
      }`;
      links = [{ label: 'Summer planner', route: '/app/planner/summer' }];
      suggestions = ['Find me research programmes', 'What projects could I build?', 'I need to work — does that hurt me?'];
      break;
    }

    case 'missing': {
      const spots = findBlindSpots(ctx);
      if (!spots.length) {
        content = 'Nothing stands out as a gap right now. That is a real answer, not a hedge — I would rather say nothing than invent work for you.';
        break;
      }
      content = `Here is what I see, in order of how much it matters:\n\n${spots
        .slice(0, 5)
        .map((s) => `**${s.title}** _(${s.priority})_  \n${s.finding}  \n→ ${s.action}`)
        .join('\n\n')}\n\nI have deliberately not padded this list. If something is not here, it is because I do not think it needs your attention.`;
      links = [{ label: 'Full blind spot analysis', route: '/app/path/blind-spots' }];
      suggestions = ['Help me fix the first one', 'What is going well?'];
      break;
    }

    case 'major': {
      const dna = buildStudentDNA(ctx);
      if (detected.majorId) {
        const major = MAJOR_BY_ID.get(detected.majorId)!;
        const match = dna.majorMatches.find((m) => m.majorId === detected.majorId);
        content = `**${major.name}** — ${major.summary}\n\n${
          match ? `In your profile this reads as a **${match.tier.replace('-', ' ')}**: ${match.why.join('. ')}.` : 'This does not currently connect strongly to what you have told me.'
        }\n\n**What you would actually study:** ${major.whatYouStudy.slice(0, 3).join('; ')}.\n\n**Preparation it expects:** mathematics ${major.mathIntensity}/5, writing ${major.writingIntensity}/5, laboratory ${major.labIntensity}/5. Recommended AP courses: ${listJoin(major.recommendedAP.map((id) => AP_COURSE_BY_ID.get(id)?.name ?? id)) || 'none in particular'}.\n\n**Where it leads:** ${listJoin(major.careers.slice(0, 4).map((c) => CAREER_BY_ID.get(c)?.name ?? c))}. No major guarantees any of those.`;
        links = [{ label: `Open ${major.name}`, route: `/app/majors/${major.id}` }];
        suggestions = [`Compare ${major.name} with something similar`, `What colleges are strong in ${major.name}?`];
      } else {
        const top = dna.majorMatches.slice(0, 4);
        content = top.length
          ? `From your interests, courses and activities, these come out strongest:\n\n${top
              .map((m) => `- **${MAJOR_BY_ID.get(m.majorId)?.name}** _(${m.tier.replace('-', ' ')})_ — ${m.why[0] ?? 'matches your stated interests'}`)
              .join('\n')}\n\nBeing undecided is fine. Most students change direction at least once, and naming two or three possibilities is enough for planning — it is not a commitment.`
          : `${NO_PROFILE_NOTE} Add some interests and I can say something useful here.`;
        links = [{ label: 'Explore majors', route: '/app/majors' }];
        suggestions = ['Compare two majors', 'What careers do these lead to?'];
      }
      break;
    }

    case 'career': {
      if (detected.careerId) {
        const career = CAREER_BY_ID.get(detected.careerId)!;
        content = `**${career.name}** — ${career.summary}\n\n**Day to day:** ${career.dayToDay.slice(0, 3).join('; ')}.\n\n**Education:** ${career.typicalEducation}\n\n**Routes in:** ${listJoin(career.relatedMajors.map((m) => MAJOR_BY_ID.get(m)?.name ?? m))}.\n\n**High school preparation that actually helps:** ${career.highSchoolPrep.join('; ')}.\n\n_${career.pathNote}_`;
        links = [{ label: `Open ${career.name}`, route: `/app/careers/${career.id}` }];
        suggestions = [`What should I study for ${career.name}?`, 'Show me related careers'];
      } else {
        const dna = buildStudentDNA(ctx);
        content = dna.careerPaths.length
          ? `From the majors that match you, these are reachable:\n\n${dna.careerPaths
              .slice(0, 5)
              .map((c) => `- **${CAREER_BY_ID.get(c.careerId)?.name}** — ${c.why}`)
              .join('\n')}\n\nCareer paths are less determined by your major than people assume. The preparation matters more than the label.`
          : 'Tell me a couple of majors or interests and I can map careers from them.';
        links = [{ label: 'Career explorer', route: '/app/careers' }];
        suggestions = ['Tell me about being a software engineer', 'What majors lead to medicine?'];
      }
      break;
    }

    case 'essay': {
      content = `I will help you find what to write about — I will not write it.\n\nThe brainstormer works only from things you have already written down: your activity descriptions, your notes about why they matter to you, and your answer about what you want from college. ${
        ctx.profile.activities.some((a) => a.personalConnection)
          ? 'You have written personal notes on some activities, which is exactly the material it uses.'
          : 'Right now you have not written personal notes on any activity, so it has very little to work with. That is the highest-value thing you could fix today.'
      }\n\nThere is also an authenticity check: paste a draft and it flags stock phrases, claims that do not match anything in your profile, and places where a specific detail would do more work than an adjective.`;
      links = [
        { label: 'Essay brainstormer', route: '/app/applications/essays' },
        { label: 'Does this sound like me?', route: '/app/applications/authenticity' },
      ];
      suggestions = ['What could I write about?', 'Check a draft for me'];
      break;
    }

    /* ------------------------------------------------------------------
       The one question this app refuses to answer. It is refused with
       something useful rather than a bare "I can't", and the refusal comes
       first so it cannot be skimmed past.
       ------------------------------------------------------------------ */
    case 'admission-chance': {
      const college = detected.collegeId ? COLLEGE_BY_ID.get(detected.collegeId) : undefined;
      const name = college ? college.shortName ?? college.name : 'a given college';
      const match = detected.collegeId ? matchForCollege(ctx, detected.collegeId) : undefined;

      const preparation: string[] = [];
      if (match?.academicContext.gpaNote) preparation.push(match.academicContext.gpaNote);
      if (match?.academicContext.testNote) preparation.push(match.academicContext.testNote);
      if (college?.acceptanceRate !== undefined) {
        preparation.push(
          `${name} admitted about ${Math.round(college.acceptanceRate)}% of everyone who applied. That is a fact about the applicant pool, not about you.`,
        );
      }

      content = `**I cannot tell you that, and I am not going to estimate it.**

Nobody can. Admission decisions turn on an application nobody has read yet — your essays, what your teachers say about you, your context, and what that college happens to need in the year you apply. Two students with identical numbers get different answers all the time, and that is not a flaw in the process being hidden from you.

Any tool that gives you a percentage for ${name} is making it up. If you have seen one, it was working from test scores and GPA, which are the parts of an application that explain the least.

**What I can tell you instead**${
        preparation.length ? `\n\n${preparation.map((p) => `- ${p}`).join('\n')}` : '\n\nAdd your GPA and any test scores and I can tell you how your preparation compares to students this college has admitted before.'
      }

${
        match
          ? `Across the four fit dimensions, ${name} reads as **${match.overallBand}** overall for you: ${match.dimensions
              .map((d) => `${d.label.toLowerCase()} ${d.band}`)
              .join(', ')}. ${match.concerns.length ? `Worth knowing: ${match.concerns[0]}` : ''}`
          : ''
      }

**What actually moves the needle**

1. Apply somewhere you would genuinely be happy, several times over. A list where every outcome is survivable is the only real protection.
2. Write an essay that sounds like you. It is the one part of the application nobody else can supply.
3. Go deep on one or two things rather than wide on six. It reads as real because it is.
4. Get the financial side right early. More students are stopped by cost than by admission.

_Fit is not probability. Everywhere in this app, a fit band describes how well a college matches what you have told me — never your likelihood of getting in._`;

      links = [
        detected.collegeId ? { label: `Open ${name}`, route: `/app/colleges/${detected.collegeId}` } : { label: 'Your matches', route: '/app/colleges/match' },
        { label: 'What am I missing?', route: '/app/path/blind-spots' },
      ];
      suggestions = [
        detected.collegeId ? `What is ${name} actually strong in?` : 'What colleges fit me?',
        'What am I missing?',
        'How do I build a balanced list?',
      ];
      break;
    }

    case 'money': {
      const scholarships = findScholarships(ctx).slice(0, 3);
      const matches = matchColleges(ctx, { limit: 30 });
      const askedAbout = detected.collegeId ? COLLEGE_BY_ID.get(detected.collegeId) : undefined;
      const affordable = matches.filter((m) => {
        const c = COLLEGE_BY_ID.get(m.collegeId);
        return ctx.constraints.maxCostPerYear && (c?.avgNetPrice ?? Infinity) <= ctx.constraints.maxCostPerYear;
      });
      const collegeLine = askedAbout
        ? `**${askedAbout.shortName ?? askedAbout.name}** publishes an average net price of ${
            askedAbout.avgNetPrice !== undefined ? `$${askedAbout.avgNetPrice.toLocaleString()}` : 'no figure we hold'
          }${
            ctx.constraints.maxCostPerYear && askedAbout.avgNetPrice !== undefined
              ? askedAbout.avgNetPrice <= ctx.constraints.maxCostPerYear
                ? `, which is inside the $${ctx.constraints.maxCostPerYear.toLocaleString()} budget you set`
                : `, which is $${(askedAbout.avgNetPrice - ctx.constraints.maxCostPerYear).toLocaleString()} above the budget you set`
              : ''
          }. ${askedAbout.meetsFullNeed ? 'It states that it meets full demonstrated need, so your figure could be far lower than that average.' : ''}${
            askedAbout.netPriceCalculatorUrl
              ? ' Run its net price calculator before you decide anything — that is the only number that applies to your family.'
              : ' We do not hold a verified calculator link for it; find one on its financial aid site rather than trusting this average.'
          }\n\n`
        : '';

      content = `${collegeLine}${
        ctx.constraints.maxCostPerYear
          ? `You set a budget of about $${ctx.constraints.maxCostPerYear.toLocaleString()} a year. ${affordable.length} colleges in this catalog have an average net price at or below it.`
          : 'You have not set a budget. That is the single most useful thing you could add — cost decides more outcomes than fit does.'
      }\n\n**Three things worth knowing**\n\n1. Sticker price is close to meaningless. Colleges that meet full demonstrated need frequently cost less than an in-state public for a family with need.\n2. Every US college must publish a net price calculator. Run it for every college on your list — it takes about ten minutes each and it is the only number that matters.\n3. Local scholarships from community foundations have tiny applicant pools compared with national ones.\n\n${
        scholarships.length
          ? `**Scholarships worth your time**\n${scholarships.map((s) => `- **${s.scholarship.name}** — ${s.scholarship.amountText}. ${s.reasons[0] ?? ''}${s.eligibilityUnknown.length ? ` _${s.eligibilityUnknown[0]}_` : ''}`).join('\n')}`
          : ''
      }\n\n_Amounts and deadlines here are demo data. Confirm everything with the sponsor._`;
      links = [
        ...(askedAbout ? [{ label: `Open ${askedAbout.shortName ?? askedAbout.name}`, route: `/app/colleges/${askedAbout.id}` }] : []),
        { label: 'Financial planning', route: '/app/colleges/cost' },
        { label: 'Find scholarships', route: '/app/scholarships' },
      ];
      suggestions = ['Which colleges meet full need?', 'Set my budget', 'Show scholarships I qualify for'];
      break;
    }

    case 'deadlines': {
      const intel = deadlineIntelligence(ctx);
      if (!intel.length) {
        content = 'You have no deadlines recorded. Adding your college and test dates is what makes the planner useful.';
        links = [{ label: 'Add deadlines', route: '/app/planner/deadlines' }];
        break;
      }
      content = `${intel
        .slice(0, 4)
        .map((d) => `**${d.deadline.title}** — ${d.message}${d.blockers.length ? `\n  Blocked on: ${listJoin(d.blockers)}` : ''}`)
        .join('\n\n')}\n\n_Dates marked as estimates come from our demo catalog. Confirm each one on the official site before you plan around it._`;
      links = [{ label: 'Deadline tracker', route: '/app/planner/deadlines' }];
      suggestions = ['What should I do first?', 'Add a deadline'];
      break;
    }

    case 'project': {
      const projects = generateProjects(ctx, 3);
      content = projects.length
        ? `These come from where your interests overlap, which is usually where the most personal projects come from:\n\n${projects
            .map((p) => `**${p.template.title}**  \n${p.framing}  \n_About ${p.template.hoursPerWeek} hrs/week for ${p.template.estimatedWeeks} weeks — ${p.feasibility === 'comfortable' ? 'fits your available time' : p.feasibility === 'a-stretch' ? 'a stretch on your current time' : 'more time than you appear to have'}._`)
            .join('\n\n')}\n\nThe hard part of any of these is finishing. One finished small thing beats three abandoned ambitious ones.`
        : 'Add a couple of interests and I can generate project ideas that actually connect to them.';
      links = [{ label: 'Project generator', route: '/app/projects' }];
      suggestions = ['Something smaller', 'How do I start?'];
      break;
    }

    case 'schedule': {
      content = `I build study plans from your actual commitments rather than an ideal week.\n\nRight now I have: about ${Math.round(ctx.committedHours)} hours a week of activities, ${ctx.profile.academics.weeklyStudyHours ?? 8} hours you said you could study, and ${
        ctx.profile.plannedTests.length ? `${countLabel(ctx.profile.plannedTests.length, 'upcoming test')}` : 'no upcoming tests recorded'
      }.\n\nThe planner weights subjects by how close the test is and where your practice data shows weakness, then spreads it across the week with lighter weekends. You can edit any block — it is a starting point, not a prescription.`;
      links = [{ label: 'Build my study plan', route: '/app/planner/study' }];
      suggestions = ['Build it now', 'I have less time than that'];
      break;
    }

    case 'about-me': {
      const dna = buildStudentDNA(ctx);
      content = `Here is what your profile says, as I read it.\n\n**Strengths**\n${dna.academicStrengths
        .slice(0, 4)
        .map((s) => `- ${s.subject}: ${s.band.replace('-', ' ')} — ${s.evidence[0] ?? 'from your stated interests'}`)
        .join('\n')}\n\n**What stands out**\n${dna.profileStrengths.slice(0, 3).map((s) => `- ${s.title}: ${s.detail}`).join('\n')}\n\n**Where there is room**\n${dna.developmentOpportunities
        .slice(0, 2)
        .map((d) => `- ${d.title}: ${d.detail}`)
        .join('\n')}\n\n${dna.missingInputs.length ? `**What I still do not know:** ${listJoin(dna.missingInputs.slice(0, 3))}.` : ''}`;
      links = [{ label: 'Your Student DNA', route: '/app/path/dna' }];
      suggestions = ['What am I missing?', 'What should I do next?'];
      break;
    }

    default: {
      const spots = findBlindSpots(ctx).slice(0, 2);
      content = `I am not sure what you are asking, so let me not guess.\n\nI can answer questions about colleges, majors, careers, AP courses, the SAT, activities, research, scholarships, projects, deadlines, essays and your schedule — and I answer from your profile rather than in general.${
        spots.length ? `\n\nIf it helps, the thing I would raise unprompted right now is: **${spots[0].title}** — ${spots[0].finding}` : ''
      }`;
      suggestions = ['What am I missing?', 'What colleges fit me?', 'Should I take AP Physics?', 'What should I do this summer?'];
      break;
    }
  }

  return { content: content.trim(), citedProfileFields: cited, suggestions, links, learned };
}

/** Starter prompts shown when the chat is empty, tailored to the profile. */
export function starterPrompts(ctx: EngineContext): string[] {
  const out: string[] = [];
  if (!ctx.majorIds.length) out.push('Help me figure out what to study');
  else out.push(`What colleges are strong in ${MAJOR_BY_ID.get(ctx.majorIds[0])?.name}?`);
  out.push('What am I missing?');
  if (ctx.grade <= 11) out.push('What should I do this summer?');
  else out.push('What should I prioritise for applications?');
  if (ctx.satTotal) out.push('What do my practice results say about my weaknesses?');
  else out.push('How should I start preparing for the SAT?');
  out.push('Should I take AP Calculus BC?');
  return uniq(out).slice(0, 5);
}

export function chatContextSummary(ctx: EngineContext, chat: ChatMessage[]): string {
  const learned = ctx.account.learnedPreferences.filter((p) => p.active);
  return [
    `${chat.length} messages in this conversation`,
    learned.length ? `${countLabel(learned.length, 'remembered preference')}` : 'No preferences recorded yet',
  ].join(' · ');
}
