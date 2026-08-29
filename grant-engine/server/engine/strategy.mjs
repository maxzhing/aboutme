/**
 * Personalized funding strategy.
 *
 * Picks five distinct roles out of the result set rather than five copies of the
 * top-ranked grant. A pick is only made when a real candidate exists -- if there
 * is no easy application in the set, the strategy says so instead of promoting
 * an unsuitable one.
 */

import { STATUS } from './eligibility.mjs';
import { DIFFICULTY } from './assessment.mjs';
import { valueOf } from '../lib/evidence.mjs';
import { URGENCY } from './deadline.mjs';

const viable = (result) => result.eligibility.status !== STATUS.INELIGIBLE && result.score.overall > 0;

export function buildStrategy(results, { excludedCount = 0 } = {}) {
  const candidates = results.filter(viable);
  const picks = [];
  const used = new Set();

  const take = (key, title, why, chooser) => {
    const choice = chooser(candidates.filter((r) => !used.has(r.id)));
    if (!choice) {
      picks.push({ key, title, grantId: null, why, note: 'No opportunity in this search fills this role. That is a real gap, not an omission.' });
      return;
    }
    used.add(choice.id);
    picks.push({
      key,
      title,
      grantId: choice.id,
      grantName: valueOf(choice.record.grantName),
      funder: valueOf(choice.record.funder),
      score: choice.score.overall,
      why,
      note: chooser.note ? chooser.note(choice) : null,
    });
  };

  take(
    'immediate',
    'BEST IMMEDIATE OPPORTUNITY',
    'The opportunity to investigate first: the strongest match whose deadline is close enough to act on now.',
    Object.assign(
      (list) => {
        const soon = list.filter((r) => [URGENCY.CRITICAL, URGENCY.SOON, URGENCY.COMFORTABLE].includes(r.deadlineInfo.urgency));
        return best(soon.length ? soon : list);
      },
      { note: (r) => `${r.deadlineInfo.display} — ${r.deadlineInfo.note}` },
    ),
  );

  take(
    'high_value',
    'BEST HIGH-VALUE OPPORTUNITY',
    'The largest realistic award among opportunities you have a genuine basis to apply for.',
    Object.assign(
      (list) => {
        const withAward = list.filter((r) => valueOf(r.record.awardMaximum) !== null && r.score.overall >= 45);
        if (!withAward.length) return null;
        return withAward.sort((a, b) => valueOf(b.record.awardMaximum) - valueOf(a.record.awardMaximum))[0];
      },
      { note: (r) => `Awards up to $${Number(valueOf(r.record.awardMaximum)).toLocaleString('en-US')}.` },
    ),
  );

  take(
    'easy',
    'BEST EASY APPLICATION',
    'A strong match with a low application burden — the best return on your time.',
    Object.assign(
      (list) => {
        const easy = list.filter((r) => r.difficulty.level === DIFFICULTY.EASY && r.score.overall >= 45);
        return best(easy);
      },
      { note: (r) => r.difficulty.factors[0] },
    ),
  );

  take(
    'long_term',
    'BEST LONG-TERM OPPORTUNITY',
    'Worth preparing for now even though you cannot apply immediately — because of a future deadline, a status you need to obtain, or a track record you need to build.',
    Object.assign(
      (list) => {
        const future = list.filter(
          (r) => r.deadlineInfo.urgency === URGENCY.FUTURE ||
            (r.eligibility.status === STATUS.UNCERTAIN && r.score.overall >= 50) ||
            r.difficulty.level === DIFFICULTY.DIFFICULT,
        );
        return best(future);
      },
      {
        note: (r) => r.eligibility.status === STATUS.UNCERTAIN
          ? 'Resolve the open eligibility questions first; if they clear, this becomes a strong target.'
          : 'Start preparing the heavier requirements well before the cycle opens.',
      },
    ),
  );

  const backups = candidates
    .filter((r) => !used.has(r.id) && r.score.overall >= 40)
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, 4)
    .map((r) => ({
      grantId: r.id,
      grantName: valueOf(r.record.grantName),
      funder: valueOf(r.record.funder),
      score: r.score.overall,
      eligibility: r.eligibility.status,
      deadline: r.deadlineInfo.display,
    }));

  return {
    picks,
    backups,
    summary: buildSummary(candidates, results, excludedCount),
  };
}

function best(list) {
  if (!list.length) return null;
  return [...list].sort((a, b) => b.score.overall - a.score.overall)[0];
}

function buildSummary(candidates, results, excludedCount) {
  // Opportunities eliminated earlier in the pipeline never reach this function,
  // so the count has to be supplied rather than derived from what survived.
  const ineligible = excludedCount + (results.length - candidates.length);
  const eligible = candidates.filter((r) => r.eligibility.status === STATUS.ELIGIBLE).length;
  const uncertain = candidates.filter((r) => r.eligibility.status === STATUS.UNCERTAIN).length;
  if (candidates.length === 0) {
    return `No opportunity in this search survived verification and eligibility checking. ${ineligible} were excluded, each with a stated reason. That is a real result: it usually means the profile needs a status change (such as a fiscal sponsor) before this kind of funding is open to you.`;
  }
  return `${eligible} opportunit${eligible === 1 ? 'y appears' : 'ies appear'} to fit your profile outright and ${uncertain} need${uncertain === 1 ? 's' : ''} a detail confirmed before it can be assessed. ${ineligible} ${ineligible === 1 ? 'was' : 'were'} excluded — for failing a mandatory requirement, or for being expired, unverifiable, or not actually a grant.`;
}
