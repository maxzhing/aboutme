/**
 * In-page transport: the engine runs here, in the browser, over the bundled
 * corpus. No network of any kind.
 *
 * Saved grants, the tracker and answered profiles live in localStorage, so they
 * survive a reload but never leave the machine. Alerts are the one feature that
 * genuinely cannot exist offline — there is nothing to re-check against — and
 * the interface is told so rather than being shown an empty list that implies
 * the feature is working.
 */

import { runLocalSearch, STAGES, browserCapabilities } from './engine.mjs';
import { buildApplicationPacket } from '../server/engine/assistant.mjs';
import { applyAnswer } from '../server/engine/followups.mjs';
import { normalizeProfile, APPLICANT_TYPES, ORGANIZATION_STATUSES, FUNDING_PURPOSES, US_STATES } from '../server/engine/profile.mjs';
import { WEIGHTS, COMPONENT_LABELS } from '../server/engine/score.mjs';
import { DEADLINE_FILTERS } from '../server/engine/deadline.mjs';
import { CONFIDENCE_MEANING } from '../server/engine/confidence.mjs';

const KEY = 'gme-local-v1';

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(patch) {
  const next = { ...readStore(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the session still works, it just will
    // not persist. Failing loudly here would be worse than losing a bookmark.
  }
  return next;
}

const collection = (name) => ({
  all: () => readStore()[name] || [],
  put(entry) {
    const items = readStore()[name] || [];
    const index = items.findIndex((item) => item.id === entry.id);
    if (index === -1) items.push(entry);
    else items[index] = { ...items[index], ...entry };
    writeStore({ [name]: items });
    return entry;
  },
  remove(id) {
    const items = (readStore()[name] || []).filter((item) => item.id !== id);
    writeStore({ [name]: items });
    return true;
  },
});

const savedGrants = collection('saved');
const trackerEntries = collection('tracker');

/** Runs are held in memory only; they are large and rebuilt in under a second. */
const runs = new Map();

const TRACKER_STAGES = ['considering', 'preparing', 'drafting', 'submitted', 'awarded', 'declined'];

export const localTransport = {
  mode: 'local',

  features: {
    alerts: false,
    alertsNote: 'Alerts work by re-searching live sources on a schedule and telling you what changed. '
      + 'This single file has no live sources to re-check, so there is nothing to alert you about. '
      + 'Run the full engine (npm start) with a search provider configured to use saved profiles and alerts.',
  },

  async capabilities() {
    return {
      capabilities: browserCapabilities(),
      degraded: Object.values(browserCapabilities()).filter((c) => !c.available).map((c) => `${c.name}: ${c.note}`),
      stages: STAGES,
      scoreWeights: Object.entries(WEIGHTS).map(([key, weight]) => ({ key, label: COMPONENT_LABELS[key], weight })),
      deadlineFilters: Object.entries(DEADLINE_FILTERS).map(([key, filter]) => ({ key, label: filter.label })),
      confidenceMeanings: CONFIDENCE_MEANING,
      vocabulary: {
        applicantTypes: APPLICANT_TYPES,
        organizationStatuses: ORGANIZATION_STATUSES,
        fundingPurposes: FUNDING_PURPOSES,
        states: US_STATES,
      },
    };
  },

  async search(profile, sort, onStage = () => {}, signal) {
    const run = await runLocalSearch({ profile, sort }, { onStage });
    if (signal?.aborted) {
      const abort = new Error('aborted');
      abort.name = 'AbortError';
      throw abort;
    }
    runs.set(run.id, run);
    return run;
  },

  async answer(runId, answers, sort) {
    const previous = runs.get(runId);
    if (!previous) throw new Error('That search is no longer in memory. Run it again.');
    let profile = previous.profile;
    for (const answer of answers) profile = applyAnswer(profile, answer.questionId, answer.field, answer.value);
    const run = await runLocalSearch({ profile: normalizeProfile(profile), sort }, {});
    run.previousRunId = runId;
    runs.set(run.id, run);
    return run;
  },

  async assistant(runId, grantId) {
    const run = runs.get(runId);
    if (!run) throw new Error('That search is no longer in memory. Run it again.');
    const result = run.results.find((entry) => entry.id === grantId);
    if (!result) throw new Error('That opportunity is not in this run.');
    return buildApplicationPacket(result, run.profile);
  },

  saved: {
    async list() {
      return { saved: savedGrants.all() };
    },
    async add(payload) {
      return { saved: savedGrants.put({ ...payload, id: `saved:${payload.grantId}` }) };
    },
    async remove(id) {
      return { deleted: savedGrants.remove(id) };
    },
  },

  tracker: {
    async list() {
      return { entries: trackerEntries.all(), stages: TRACKER_STAGES };
    },
    async put(entry) {
      const stage = TRACKER_STAGES.includes(entry.stage) ? entry.stage : 'considering';
      return { entry: trackerEntries.put({ ...entry, stage, id: entry.id || `track:${entry.grantId}` }) };
    },
    async remove(id) {
      return { deleted: trackerEntries.remove(id) };
    },
  },

  alerts: {
    async list() {
      return { alerts: [], unread: 0 };
    },
    async markRead() {
      return { ok: true };
    },
  },

  profiles: {
    async list() {
      return { profiles: [] };
    },
    async save() {
      throw new Error(
        'Saved profiles and alerts need the engine server: they work by re-searching live sources on a '
        + 'schedule and telling you what changed. This single-file build has no live sources to re-check. '
        + 'Run the full engine (npm start) to use alerts.',
      );
    },
    async sweep() {
      throw new Error('Alerts need the engine server, which re-searches live sources on a schedule.');
    },
  },
};
