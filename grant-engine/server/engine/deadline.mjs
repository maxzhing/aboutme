/**
 * Deadline intelligence: countdowns, urgency banding and the filters the
 * dashboard exposes. All computed from a *verified* deadline only -- an
 * unverified date never produces a countdown, because a confident-looking
 * "4 DAYS LEFT" on a fabricated date is exactly the failure this system exists
 * to prevent.
 */

import { valueOf } from '../lib/evidence.mjs';
import { daysUntil } from './eligibility.mjs';

export const URGENCY = Object.freeze({
  CRITICAL: 'critical',   // one week or less
  SOON: 'soon',           // within a month
  COMFORTABLE: 'comfortable',
  FUTURE: 'future',       // more than a year out
  ROLLING: 'rolling',     // no fixed deadline stated
  UNKNOWN: 'unknown',     // could not be verified
  PASSED: 'passed',
});

export function deadlineInfo(record, { now = new Date() } = {}) {
  const deadline = valueOf(record.deadline);
  if (!deadline) {
    const rolling = valueOf(record.isRolling) === true;
    return {
      deadline: null,
      daysRemaining: null,
      urgency: rolling ? URGENCY.ROLLING : URGENCY.UNKNOWN,
      display: rolling ? '♾️ Open indefinitely' : '📅 Deadline not verified',
      note: rolling
        ? 'The funder accepts applications on a rolling basis.'
        : 'No deadline could be confirmed from a primary source. Check the funder\'s page before planning around this.',
    };
  }

  const days = daysUntil(deadline, now);
  if (days === null) {
    return { deadline, daysRemaining: null, urgency: URGENCY.UNKNOWN, display: '📅 Deadline unclear', note: 'The deadline found could not be read as a date.' };
  }
  if (days < 0) {
    return {
      deadline,
      daysRemaining: days,
      urgency: URGENCY.PASSED,
      display: `⛔ Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`,
      note: 'This opportunity is no longer accepting applications.',
    };
  }
  if (days <= 7) {
    return {
      deadline,
      daysRemaining: days,
      urgency: URGENCY.CRITICAL,
      display: `🔥 ${days} DAY${days === 1 ? '' : 'S'} LEFT`,
      note: 'Apply only if your materials are essentially ready.',
    };
  }
  if (days <= 31) {
    return { deadline, daysRemaining: days, urgency: URGENCY.SOON, display: `⏳ ${days} DAYS LEFT`, note: 'Tight but achievable if you start now.' };
  }
  if (days <= 365) {
    return { deadline, daysRemaining: days, urgency: URGENCY.COMFORTABLE, display: `📅 ${days} DAYS LEFT`, note: 'Enough time to prepare a competitive application.' };
  }
  return { deadline, daysRemaining: days, urgency: URGENCY.FUTURE, display: `🗓️ ${days} days out`, note: 'A future cycle. Terms may change before it opens.' };
}

/** Filter presets exposed in the UI. */
export const DEADLINE_FILTERS = Object.freeze({
  closing_this_week: { label: 'Closing this week', test: (info) => info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 7 },
  closing_this_month: { label: 'Closing this month', test: (info) => info.daysRemaining !== null && info.daysRemaining >= 0 && info.daysRemaining <= 31 },
  open_indefinitely: { label: 'Open indefinitely', test: (info) => info.urgency === URGENCY.ROLLING },
  future: { label: 'Future opportunities', test: (info) => info.daysRemaining !== null && info.daysRemaining > 31 },
});

export function applyDeadlineFilter(results, filterKey) {
  const filter = DEADLINE_FILTERS[filterKey];
  if (!filter) return results;
  return results.filter((result) => filter.test(result.deadlineInfo));
}

/**
 * Sort by match quality and by urgency together. Neither alone is right: the
 * best grant is useless if it closed yesterday, and the most urgent grant is
 * noise if the applicant is not eligible.
 */
export function sortResults(results, mode = 'balanced') {
  const copy = [...results];
  if (mode === 'deadline') {
    return copy.sort((a, b) => {
      const left = a.deadlineInfo.daysRemaining;
      const right = b.deadlineInfo.daysRemaining;
      if (left === null && right === null) return b.score.overall - a.score.overall;
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right || b.score.overall - a.score.overall;
    });
  }
  if (mode === 'match') {
    return copy.sort((a, b) => b.score.overall - a.score.overall);
  }
  // Balanced: match score, nudged up for opportunities that are closing soon.
  return copy.sort((a, b) => balancedRank(b) - balancedRank(a));
}

function balancedRank(result) {
  const days = result.deadlineInfo.daysRemaining;
  let urgencyBonus = 0;
  if (days !== null && days >= 0) {
    if (days <= 7) urgencyBonus = 6;
    else if (days <= 31) urgencyBonus = 4;
    else if (days <= 120) urgencyBonus = 1;
  }
  return result.score.overall + urgencyBonus;
}

/** Working-backwards timeline for the application assistant. */
export function buildTimeline(deadline, { now = new Date() } = {}) {
  const days = daysUntil(deadline, now);
  if (days === null || days < 0) return [];
  const at = (offset, task) => {
    const date = new Date(Date.parse(`${deadline}T12:00:00Z`) - offset * 86_400_000);
    return { date: date.toISOString().slice(0, 10), daysBeforeDeadline: offset, task, past: date < now };
  };
  // Compress the schedule when there is not much runway.
  const scale = days >= 60 ? 1 : days >= 30 ? 0.5 : days >= 14 ? 0.25 : 0.12;
  const step = (base) => Math.max(1, Math.round(base * scale));
  return [
    at(step(45), 'Read the full guidelines and confirm every eligibility requirement with the funder if anything is ambiguous.'),
    at(step(35), 'Gather required documents (registration/EIN letter, budget, financials, letters of support).'),
    at(step(28), 'Draft the project narrative against the funder\'s stated priorities, in their language.'),
    at(step(18), 'Build the budget and budget narrative; confirm any matching-funds commitment in writing.'),
    at(step(10), 'Get an outside reader to review the full application for clarity and for unanswered questions.'),
    at(step(4), 'Final edit, assemble attachments, and complete the funder\'s portal registration.'),
    at(step(1), 'Submit. Portals fail at deadline — never plan to submit on the final day.'),
  ].filter((entry, index, all) => all.findIndex((other) => other.date === entry.date) === index);
}
