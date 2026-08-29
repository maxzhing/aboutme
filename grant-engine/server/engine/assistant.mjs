/**
 * Application assistant.
 *
 * Produces a working packet for one selected grant: what must be true, what must
 * be gathered, what to write, and when to do each piece.
 *
 * Two hard rules:
 *   - Requirements are reported only from verified evidence. A document list we
 *     did not read is reported as "not published", never filled in from what
 *     funders "usually" ask for. Standard-practice suggestions are separated
 *     into their own clearly-labelled section.
 *   - Nothing about the applicant is invented. The proposal outline is a
 *     structure with prompts, not prose written in the applicant's voice about
 *     facts we do not have.
 */

import { valueOf, isVerified, citationsOf } from '../lib/evidence.mjs';
import { buildTimeline } from './deadline.mjs';
import { RESULT, STATUS } from './eligibility.mjs';
import { money } from './score.mjs';

export function buildApplicationPacket(result, profile, { now = new Date() } = {}) {
  const record = result.record;
  const deadline = valueOf(record.deadline);

  return {
    grantId: result.id,
    grantName: valueOf(record.grantName),
    funder: valueOf(record.funder),
    applicationUrl: valueOf(record.applicationUrl) || valueOf(record.officialUrl),
    deadline: deadline || null,
    deadlineDisplay: result.deadlineInfo.display,
    fundingAmount: describeAward(record),
    eligibilityChecklist: buildEligibilityChecklist(result),
    requiredDocuments: buildDocumentList(record),
    applicationQuestions: buildApplicationQuestions(record),
    projectRequirements: buildProjectRequirements(record, result),
    strategy: buildApplicationStrategy(result, profile),
    timeline: deadline ? buildTimeline(deadline, { now }) : [],
    proposalOutline: buildProposalOutline(result, profile),
    budgetOutline: buildBudgetOutline(profile, record),
    missingInformation: buildMissingInformation(result, profile),
    sources: citationsOf(record),
    lastVerified: record.lastVerified || null,
    disclaimer:
      'Everything above marked "verified" is quoted from the funder\'s own materials. Anything marked "standard practice" is general guidance, not this funder\'s stated requirement — confirm it against their guidelines before you rely on it. The funding decision is always the funder\'s.',
  };
}

function describeAward(record) {
  const min = valueOf(record.awardMinimum);
  const max = valueOf(record.awardMaximum);
  if (min === null && max === null) return 'Award size is not published in any source we could verify.';
  if (min !== null && max !== null) return `${money(min)} – ${money(max)}`;
  if (max !== null) return `Up to ${money(max)}`;
  return `From ${money(min)}`;
}

/** Each eligibility check becomes a checkbox the applicant can actually action. */
function buildEligibilityChecklist(result) {
  return result.eligibility.checks
    .filter((check) => check.result !== RESULT.NOT_APPLICABLE)
    .map((check) => ({
      requirement: check.label,
      status: check.result,
      satisfied: check.result === RESULT.PASS,
      blocking: check.blocking,
      detail: check.reason,
      evidence: check.evidence,
      action:
        check.result === RESULT.PASS ? 'Nothing to do — keep documentation on hand.'
          : check.result === RESULT.FAIL ? 'This blocks the application. Do not submit until it is resolved with the funder.'
            : check.result === RESULT.UNKNOWN_APPLICANT ? `Confirm this before starting: ${check.question?.text || check.label}`
              : 'The funder does not state this. Ask them directly if it could affect you.',
    }));
}

function buildDocumentList(record) {
  const documents = valueOf(record.requiredDocuments);
  if (Array.isArray(documents) && documents.length) {
    return {
      verified: true,
      source: record.requiredDocuments.sourceUrl,
      items: documents.map((item) => ({ item, verified: true })),
      note: 'Taken from the funder\'s published requirements.',
    };
  }
  return {
    verified: false,
    source: null,
    items: [],
    note: 'This funder does not publish a document list in the sources we could read. The items below are standard practice across grantmakers, not this funder\'s stated requirements — verify against their guidelines.',
    standardPractice: [
      'Organizational or personal identification (EIN letter, IRS determination letter, or government ID for individual applicants)',
      'Project narrative or proposal',
      'Line-item budget and budget justification',
      'Most recent financial statements or, for individuals, a simple statement of need',
      'Letters of support or partnership commitments',
      'Board list or key personnel biographies',
      'Proof of any matching funds',
    ],
  };
}

function buildApplicationQuestions(record) {
  const questions = valueOf(record.applicationQuestions);
  if (Array.isArray(questions) && questions.length) {
    return { verified: true, items: questions, note: 'These are the funder\'s actual application questions.' };
  }
  return {
    verified: false,
    items: [],
    note: 'The funder\'s application form is not readable without logging in, so their exact questions are unknown. Grant applications almost always ask the following — draft answers now and adapt them to the real form.',
    standardPractice: [
      'What problem are you addressing, and for whom?',
      'What exactly will you do with this money?',
      'Who will be served, how many, and how will you reach them?',
      'What will be different because of this work, and how will you measure it?',
      'Why is your organization (or you) the right one to do this?',
      'What is the total project cost, and what other funding is committed?',
      'How will the work continue after this grant ends?',
    ],
  };
}

function buildProjectRequirements(record, result) {
  const requirements = [];
  const push = (label, detail, evidence, verified) => requirements.push({ label, detail, evidence, verified });

  if (isVerified(record.fundingPurpose)) {
    const purposes = valueOf(record.fundingPurpose);
    push('Eligible activities', Array.isArray(purposes) ? purposes.join(', ') : String(purposes), { sourceUrl: record.fundingPurpose.sourceUrl }, true);
  }
  if (valueOf(record.matchingRequired) === true) {
    push('Matching funds', 'A matching contribution is required. Secure written commitment before applying.', { sourceUrl: record.matchingRequired.sourceUrl, quote: record.matchingRequired.quote }, true);
  }
  for (const check of result.eligibility.checks) {
    if (check.id === 'partnership' && check.result !== RESULT.NOT_STATED) {
      push('Partner organization', check.reason, check.evidence, true);
    }
    if (check.id === 'previous_experience' && check.result !== RESULT.NOT_STATED) {
      push('Track record', check.reason, check.evidence, true);
    }
  }
  if (requirements.length === 0) {
    push('Project requirements', 'No specific project requirements were stated in the sources we could verify. Read the full guidelines before writing.', null, false);
  }
  return requirements;
}

function buildApplicationStrategy(result, profile) {
  const points = [];
  const record = result.record;

  if (result.eligibility.status === STATUS.UNCERTAIN) {
    points.push({
      point: 'Resolve eligibility before you write anything',
      detail: `Contact the funder and settle: ${result.eligibility.openQuestions.map((q) => q.text).join(' ')} A week of writing is wasted if the answer is no.`,
    });
  }

  const matched = result.score.components.missionAlignment.rationale;
  points.push({
    point: 'Mirror the funder\'s own language',
    detail: `${matched} Use their terms for this work in your narrative — reviewers score against their published priorities, not your phrasing.`,
  });

  const need = profile.fundingNeeded;
  const min = valueOf(record.awardMinimum);
  const max = valueOf(record.awardMaximum);
  if (need !== null && max !== null && need > max) {
    points.push({
      point: 'Ask for a scoped piece, not the whole project',
      detail: `You need ${money(need)} but this program caps awards at ${money(max)}. Present a defined component that ${money(max)} fully completes, and name your other funding sources for the rest.`,
    });
  } else if (need !== null && min !== null && need < min) {
    points.push({
      point: 'Your request is below this funder\'s floor',
      detail: `Their smallest award is ${money(min)}. Either expand the scope to justify that amount honestly, or spend your time on a program whose range fits.`,
    });
  }

  if (result.competition.level === 'High') {
    points.push({ point: 'Assume a competitive field', detail: `${result.competition.basis} Lead with what is measurably distinctive about your project in the first paragraph.` });
  } else if (result.competition.level === 'Unknown') {
    points.push({ point: 'Ask the funder about the field size', detail: 'Program officers will usually tell you how many applications they receive and how many they fund. That single call is the cheapest research you can do.' });
  }

  if (result.confidence.level === 'LOW') {
    points.push({
      point: 'Verify the basics yourself first',
      detail: `We could not independently confirm: ${result.confidence.unverifiedFields.join(', ')}. Check these on the funder's own page before investing time.`,
    });
  }

  return points;
}

function buildProposalOutline(result, profile) {
  const purposeText = (profile.fundingPurpose || []).map((p) => p.replace(/_/g, ' ')).join(', ') || 'the work you described';
  return [
    { section: 'Summary', guidance: 'Two or three sentences: who you are, what you will do, who it serves, and how much you are asking for. Written last, read first.' },
    { section: 'Statement of need', guidance: 'The specific problem in your specific place, with a source for any number you cite. Do not use national statistics as a stand-in for local evidence.' },
    { section: 'Project description', guidance: `What you will actually do, concretely: activities, participants, schedule, location. This is where ${purposeText} gets described in operational detail.` },
    { section: 'Goals and measurable outcomes', guidance: 'Two or three outcomes with numbers attached and a stated method of measurement. Reviewers discount outcomes that cannot be measured.' },
    { section: 'Capacity', guidance: 'Why you can deliver this: relevant experience, partners, and who does the work. If you are new, say so and show the concrete preparation you have already done.' },
    { section: 'Budget narrative', guidance: 'Justify each line against the activities above. Every number in the budget should be traceable to a sentence in the project description.' },
    { section: 'Sustainability', guidance: 'What happens after the grant period. Even one honest sentence beats an implausible plan.' },
    { section: 'Evaluation', guidance: 'How you will know it worked, who collects the data, and when you will report it.' },
  ];
}

function buildBudgetOutline(profile, record) {
  const need = profile.fundingNeeded;
  const max = valueOf(record.awardMaximum);
  const target = need !== null && max !== null ? Math.min(need, max) : need ?? max;
  const purposes = profile.fundingPurpose || [];

  const lines = [];
  const add = (category, guidance) => lines.push({ category, guidance });

  if (purposes.includes('staff_salaries')) add('Personnel', 'Role, hourly or annual rate, and percentage of time on this project. Show the arithmetic.');
  if (purposes.includes('equipment')) add('Equipment', 'Itemize with real quotes or catalogue prices. Reviewers check these.');
  if (purposes.includes('materials_supplies')) add('Materials and supplies', 'Per-participant cost times number of participants is the clearest way to present this.');
  if (purposes.includes('program_delivery')) add('Program delivery', 'Venue, transportation, food, instructor time — the actual cost of running each session.');
  if (purposes.includes('travel_conference')) add('Travel', 'Itemize transport, lodging, registration and per diem separately.');
  if (purposes.includes('capital_project')) add('Capital costs', 'Contractor estimates, permits and a contingency line of 5–10%.');
  if (purposes.includes('scholarship_tuition')) add('Tuition and fees', 'Use the institution\'s published cost of attendance and attach it.');
  if (lines.length === 0) add('Direct project costs', 'Itemize every cost this grant would pay for, with the basis for each figure.');

  add('Indirect or administrative costs', 'Only if the funder permits it — many cap this or exclude it entirely. Check their guidelines before including a line.');
  add('Other committed funding', 'List other confirmed and pending sources. Funders want to see they are not the only one.');

  return {
    targetRequest: target !== null && target !== undefined ? money(target) : 'Not yet determined',
    note: need !== null && max !== null && need > max
      ? `Your ${money(need)} need exceeds this program's ${money(max)} cap, so the budget must show a scoped piece funded here and name the sources covering the rest.`
      : 'The request total must exactly match the sum of the line items. Mismatched totals are a common automatic rejection.',
    lines,
  };
}

function buildMissingInformation(result, profile) {
  const missing = [];

  for (const question of result.eligibility.openQuestions) {
    missing.push({ item: question.text, why: question.why, blocking: true, askOf: 'you' });
  }
  for (const field of result.confidence.unverifiedFields) {
    missing.push({ item: `Confirm the ${field.toLowerCase()} on the funder's own page`, why: 'We could not verify it from a primary source.', blocking: false, askOf: 'the funder' });
  }
  if (!profile.fundingNeeded) {
    missing.push({ item: 'A specific dollar amount for your request', why: 'Every application requires a number, and it must match your budget.', blocking: false, askOf: 'you' });
  }
  if (!valueOf(result.record.requiredDocuments)) {
    missing.push({ item: 'The funder\'s actual required-document list', why: 'It was not published in the pages we could read; request it from the program contact.', blocking: false, askOf: 'the funder' });
  }
  return missing;
}
