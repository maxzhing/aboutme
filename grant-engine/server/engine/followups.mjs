/**
 * Smart follow-up questions.
 *
 * Every unresolved eligibility check knows the one question that would resolve
 * it. This module collects those across all results, merges duplicates, and
 * ranks them by how much they would actually change the outcome -- so the user
 * is asked the fewest questions that unlock the most opportunities.
 */

import { STATUS } from './eligibility.mjs';
import { valueOf } from '../lib/evidence.mjs';

/**
 * @param {Array} results  scored results, including uncertain ones
 * @param {object} profile
 * @returns {Array} questions ordered by impact
 */
export function collectFollowUpQuestions(results, profile) {
  const byId = new Map();

  for (const result of results) {
    if (result.eligibility.status !== STATUS.UNCERTAIN) continue;
    for (const question of result.eligibility.openQuestions) {
      if (alreadyAnswered(question, profile)) continue;
      const existing = byId.get(question.id);
      if (existing) {
        existing.unlocks.push(summarize(result));
        existing.potentialScore = Math.max(existing.potentialScore, result.score.rawScore);
        continue;
      }
      byId.set(question.id, {
        ...question,
        unlocks: [summarize(result)],
        potentialScore: result.score.rawScore,
      });
    }
  }

  return [...byId.values()]
    .map((question) => ({
      ...question,
      impact: question.unlocks.length * 10 + question.potentialScore / 10,
      prompt: buildPrompt(question),
    }))
    .sort((a, b) => b.impact - a.impact);
}

function summarize(result) {
  return {
    grantId: result.id,
    grantName: valueOf(result.record.grantName),
    funder: valueOf(result.record.funder),
    potentialScore: result.score.rawScore,
  };
}

function alreadyAnswered(question, profile) {
  if (question.field === 'answeredQuestions') return profile.answeredQuestions?.[question.id] !== undefined;
  const value = profile[question.field];
  return value !== null && value !== undefined && value !== '';
}

/**
 * The user-facing phrasing. It always states what the answer would buy, so the
 * question reads as useful rather than bureaucratic.
 */
function buildPrompt(question) {
  const count = question.unlocks.length;
  if (count === 1) {
    return `${question.unlocks[0].grantName || 'One opportunity'} could be a strong match, but I need one detail first: ${question.text}`;
  }
  return `Answering this would resolve eligibility for ${count} opportunities at once: ${question.text}`;
}

/** Apply an answer to a profile without inventing anything else. */
export function applyAnswer(profile, questionId, field, value) {
  const updated = { ...profile, answeredQuestions: { ...(profile.answeredQuestions || {}) } };
  if (field === 'answeredQuestions') {
    updated.answeredQuestions[questionId] = value;
    return updated;
  }
  if (!(field in updated)) return updated;
  updated[field] = value;
  updated.answeredQuestions[questionId] = value;
  if (field === 'is501c3' && value === true) updated.organizationStatus = 'nonprofit_501c3';
  return updated;
}
