import { llm } from '../llm/index.js';
import { renderPrompt, systemPrompt } from '../prompts.js';
import { routeSchema } from '../schemas/index.js';
import { coerce } from './validate.js';
import { buildProfile, profileContext } from './profile.js';
import { sourceBlocks, sourceContext } from './sources.js';
import { createSession, upsertConcept, logEvent } from '../store.js';
import { nextDifficulty } from './difficulty.js';

/** Work out what learning experience the request actually calls for. */
export async function routeRequest({ learnerId, request, sourceIds = [], profile: given }) {
  const profile = given || buildProfile(learnerId);

  const { object } = await llm().run({
    label: 'route',
    system: [{ text: systemPrompt(), cache: true }],
    messages: [
      {
        role: 'user',
        content: [
          ...sourceBlocks(sourceIds, learnerId),
          {
            type: 'text',
            text: renderPrompt('route', {
              request,
              learner_context: profileContext(profile),
              source_context: sourceContext(sourceIds, learnerId),
            }),
          },
        ],
      },
    ],
    schema: routeSchema,
    effort: 'medium',
    maxTokens: 4000,
  });

  const route = coerce(object, routeSchema);
  route.concepts = (route.concepts || []).filter(Boolean).slice(0, 8);
  return route;
}

/** Route a request and open a session around it. */
export async function startSession({ learnerId, request, sourceIds = [] }) {
  const profile = buildProfile(learnerId);
  const route = await routeRequest({ learnerId, request, sourceIds, profile });

  const concepts = route.concepts.map((name) =>
    upsertConcept(learnerId, { name, subject: route.subject || 'General' }),
  );

  // Start at the difficulty this learner has actually earned on these concepts.
  const known = concepts.filter((c) => c.attempts > 0);
  const difficulty = known.length
    ? known.reduce((sum, c) => sum + nextDifficulty(c, { streak: c.streak }), 0) / known.length
    : route.difficulty;

  const session = createSession(learnerId, {
    title: route.title || request.slice(0, 60),
    mode: route.mode,
    subject: route.subject,
    topic: route.topic,
    plan: route,
    state: {
      phase: route.needs_diagnostic ? 'diagnose' : 'teach',
      focusConcept: route.concepts[0] || route.topic,
      conceptIds: concepts.map((c) => c.id),
      difficulty: Math.round(difficulty * 2) / 2,
      strategy: profile.strategy?.strategy || 'diagnose',
      turnCount: 0,
      sourceIds,
      timeMinutes: route.time_minutes,
      pendingQuestion: null,
      attemptNumber: 1,
    },
  });

  logEvent(learnerId, 'session_started', { sessionId: session.id, intent: route.intent, topic: route.topic });
  return { session, route, concepts };
}
