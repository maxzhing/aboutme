/**
 * Grant alerts.
 *
 * A saved profile is re-run on a schedule and the new results are diffed against
 * what the user has already seen. Only genuinely new information produces an
 * alert: a newly discovered strong match, an opportunity that has just opened, a
 * deadline coming into range, or a change to a grant the user is tracking.
 *
 * Alerts are held for the user to read; nothing is emailed or pushed from here.
 */

import { config } from '../lib/config.mjs';
import { runSearch } from './pipeline.mjs';
import { valueOf } from '../lib/evidence.mjs';
import { STATUS } from './eligibility.mjs';

export const ALERT_KIND = Object.freeze({
  NEW_MATCH: 'new_match',
  NEWLY_OPENED: 'newly_opened',
  DEADLINE_APPROACHING: 'deadline_approaching',
  CHANGED: 'changed',
  CLOSED: 'closed',
});

/**
 * Run one sweep for one saved profile and record any alerts it produces.
 * Returns the alerts created.
 */
export async function sweepProfile(savedProfile, { store, now = new Date() } = {}) {
  const run = await runSearch({ profile: savedProfile.profile }, { store, now });
  const seen = new Set(savedProfile.seenGrantIds || []);
  const previous = new Map((savedProfile.lastSnapshot || []).map((entry) => [entry.id, entry]));
  const alerts = [];

  const add = (kind, result, message) => {
    alerts.push({
      id: `alert:${savedProfile.id}:${result.id}:${kind}:${Date.now()}`,
      profileId: savedProfile.id,
      profileName: savedProfile.name,
      kind,
      grantId: result.id,
      grantName: valueOf(result.record.grantName),
      funder: valueOf(result.record.funder),
      score: result.score.overall,
      eligibility: result.eligibility.status,
      confidence: result.confidence.level,
      deadline: result.deadlineInfo.display,
      applicationUrl: valueOf(result.record.applicationUrl) || valueOf(result.record.officialUrl),
      message,
      createdAt: new Date().toISOString(),
      read: false,
    });
  };

  const snapshot = [];

  for (const result of run.results) {
    const deadline = valueOf(result.record.deadline);
    snapshot.push({
      id: result.id,
      score: result.score.overall,
      eligibility: result.eligibility.status,
      deadline,
      awardMaximum: valueOf(result.record.awardMaximum),
    });

    const before = previous.get(result.id);
    const isStrong = result.score.overall >= config.alerts.strongMatchThreshold &&
      result.eligibility.status !== STATUS.INELIGIBLE;

    if (!seen.has(result.id) && isStrong) {
      add(ALERT_KIND.NEW_MATCH, result, `🚨 NEW ${result.score.overall}% MATCH FOUND — ${valueOf(result.record.grantName)} from ${valueOf(result.record.funder) || 'an identified funder'}. ${result.score.components.missionAlignment.rationale}`);
    } else if (before) {
      if (before.eligibility === STATUS.UNCERTAIN && result.eligibility.status === STATUS.ELIGIBLE) {
        add(ALERT_KIND.NEWLY_OPENED, result, `Eligibility for ${valueOf(result.record.grantName)} is now confirmed: ${result.eligibility.summary}`);
      }
      if (before.deadline !== deadline && deadline) {
        add(ALERT_KIND.CHANGED, result, `The deadline for ${valueOf(result.record.grantName)} changed from ${before.deadline || 'unstated'} to ${deadline}.`);
      }
      if (before.awardMaximum !== valueOf(result.record.awardMaximum) && valueOf(result.record.awardMaximum) !== null) {
        add(ALERT_KIND.CHANGED, result, `The maximum award for ${valueOf(result.record.grantName)} changed to $${Number(valueOf(result.record.awardMaximum)).toLocaleString('en-US')}.`);
      }
    }

    const days = result.deadlineInfo.daysRemaining;
    const wasFurtherOut = before?.deadline ? true : false;
    if (isStrong && days !== null && days >= 0 && days <= 14 && wasFurtherOut && seen.has(result.id)) {
      add(ALERT_KIND.DEADLINE_APPROACHING, result, `${result.deadlineInfo.display} — ${valueOf(result.record.grantName)} closes soon and is one of your stronger matches.`);
    }
  }

  // Anything previously surfaced that has now been excluded.
  for (const [id, before] of previous) {
    if (snapshot.some((entry) => entry.id === id)) continue;
    const exclusion = run.excluded.find((entry) => entry.id === id);
    if (!exclusion) continue;
    alerts.push({
      id: `alert:${savedProfile.id}:${id}:closed:${Date.now()}`,
      profileId: savedProfile.id,
      profileName: savedProfile.name,
      kind: ALERT_KIND.CLOSED,
      grantId: id,
      grantName: exclusion.grantName,
      funder: exclusion.funder,
      message: `${exclusion.grantName} is no longer available: ${exclusion.reasons[0]?.reason || 'it no longer passes verification.'}`,
      createdAt: new Date().toISOString(),
      read: false,
      previousScore: before.score,
    });
  }

  if (store) {
    for (const alert of alerts) store.alerts.put(alert);
    store.profiles.patch(savedProfile.id, {
      lastSweptAt: new Date().toISOString(),
      lastRunId: run.id,
      lastSnapshot: snapshot,
      seenGrantIds: [...new Set([...seen, ...snapshot.map((entry) => entry.id)])],
    });
  }

  return { alerts, run };
}

/**
 * Background sweeper. Intentionally sequential: hitting funder sites from many
 * profiles at once is both rude and a good way to get blocked.
 */
export function startAlertSweeper({ store, intervalHours = config.alerts.intervalHours, logger = console } = {}) {
  if (!config.alerts.enabled) return { stop() {} };

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const due = store.profiles.find((profile) => {
        if (!profile.alertsEnabled) return false;
        const last = Date.parse(profile.lastSweptAt || '');
        return !Number.isFinite(last) || Date.now() - last >= intervalHours * 3_600_000;
      });
      for (const profile of due) {
        try {
          const { alerts } = await sweepProfile(profile, { store });
          if (alerts.length) logger.log(`[alerts] ${profile.name}: ${alerts.length} new alert(s)`);
        } catch (error) {
          logger.error(`[alerts] sweep failed for ${profile.id}: ${error.message}`);
        }
      }
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, Math.max(5 * 60_000, (intervalHours * 3_600_000) / 6));
  timer.unref?.();
  setTimeout(tick, 30_000).unref?.();
  return { stop: () => clearInterval(timer), tick };
}
