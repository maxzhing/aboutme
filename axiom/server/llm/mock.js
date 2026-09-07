/**
 * TEST-ONLY deterministic provider.
 *
 * This is not a fallback and it never serves normal traffic: the server refuses
 * to start with it unless AXIOM_LLM_PROVIDER=mock is set explicitly. It exists
 * so the automated suite can drive the *real* application code — routing,
 * schema validation, quality control, grading, mastery updates, spaced review,
 * rendering — end to end without network access. It synthesises objects from
 * the same JSON schemas the live model is constrained to.
 */
import { logger } from '../util/log.js';

const log = logger('llm:mock');

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const WORDS = ['vector', 'gradient', 'balance', 'inverse', 'system', 'ratio', 'boundary', 'transfer'];

function promptText(messages) {
  return messages
    .map((m) => (typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join(' ')))
    .join('\n');
}

function pickEnum(values, key, text, seed) {
  const lower = text.toLowerCase();
  // Prefer an enum value the prompt actually mentions, so routing is meaningful.
  const mentioned = values.filter((v) => lower.includes(v.replace(/_/g, ' ')) || lower.includes(v));
  if (mentioned.length) return mentioned[0];
  if (key === 'verdict') return lower.includes('quality gate') ? 'pass' : 'correct';
  return values[seed % values.length];
}

function makeString(key, ctx) {
  const topic = ctx.topic;
  const n = ctx.seed % WORDS.length;
  switch (key) {
    case 'id':
      return `${ctx.arrayKey === 'cards' ? 'c' : 'q'}${ctx.index + 1}`;
    case 'key':
      return ['A', 'B', 'C', 'D'][ctx.index % 4];
    case 'answer':
      return ctx.questionType === 'multiple_choice' || ctx.questionType === 'true_false' ? 'B' : '42';
    case 'concept':
      return ctx.concepts[ctx.index % ctx.concepts.length] || topic;
    case 'topic':
      return topic;
    case 'subject':
      return ctx.subject;
    case 'title':
      return `${topic} — ${['core ideas', 'practice', 'checkpoint'][ctx.index % 3]}`;
    case 'prompt':
      return `Working with ${topic}: determine the ${WORDS[n]} for item ${ctx.index + 1}.`;
    case 'solution':
      return `Start from the definition of ${topic}. Apply it step by step; the result is 42.`;
    case 'markdown':
    case 'feedback':
    case 'detail':
    case 'summary':
    case 'say':
      return `Here is what matters about ${topic}: the ${WORDS[n]} determines the result. Now try it yourself.`;
    case 'text':
      return `Option ${['A', 'B', 'C', 'D'][ctx.index % 4]} for ${topic}`;
    case 'units':
      return '';
    case 'context':
    case 'assumption':
    case 'diagnostic_reason':
    case 'strategy_note':
    case 'exam_context':
    case 'answer_key_note':
    case 'hint':
      return '';
    default:
      return `${key.replace(/_/g, ' ')} for ${topic}`;
  }
}

function makeNumber(key, ctx) {
  switch (key) {
    case 'difficulty':
      return ctx.difficulty;
    case 'points':
    case 'max_score':
      return 1;
    case 'score':
      return ctx.correct ? 1 : 0;
    case 'earned':
      return ctx.correct ? 1 : 0;
    case 'estimated_seconds':
      return 90;
    case 'estimated_minutes':
    case 'minutes':
    case 'minutes_per_day':
      return ctx.minutes;
    case 'time_minutes':
      return ctx.minutes;
    case 'horizon_days':
    case 'days':
      return ctx.days;
    case 'day':
      return ctx.index + 1;
    case 'value':
      return (ctx.index + 1) * 10;
    case 'tolerance':
      return 0.01;
    default:
      return ctx.index + 1;
  }
}

function makeBoolean(key, ctx) {
  switch (key) {
    case 'needs_diagnostic':
      return ctx.text.toLowerCase().includes('diagnos');
    case 'reveal_solution':
      return ctx.attemptNumber >= 3;
    default:
      return false;
  }
}

function arrayLength(key, schema, ctx) {
  if (key === 'questions' || key === 'cards' || key === 'self_test') return ctx.count;
  if (key === 'days') return ctx.days;
  if (key === 'choices') return ctx.questionType === 'true_false' ? 2 : 4;
  if (key === 'problems') return 0;
  if (key === 'sections' || key === 'rubric' || key === 'accepted' || key === 'rows' || key === 'columns') return 0;
  if (key === 'nodes' || key === 'edges' || key === 'items' || key === 'series' || key === 'points') return 0;
  if (key === 'blocks' || key === 'checks' || key === 'steps') return 2;
  if (key === 'concepts') return Math.min(3, ctx.concepts.length);
  return 2;
}

function synth(schema, key, ctx) {
  if (!schema) return null;
  if (schema.anyOf) {
    const objectBranch = schema.anyOf.find((s) => s.type === 'object');
    const populate = ['activity'].includes(key);
    return populate && objectBranch ? synth(objectBranch, key, ctx) : null;
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.includes('null') && ['tolerance', 'clarifying_question'].includes(key)) return null;

  if (schema.enum) {
    if (key === 'error_type') return ctx.correct ? 'none' : 'conceptual';
    if (key === 'verdict' && ctx.grading) return ctx.correct ? 'correct' : 'incorrect';
    if (key === 'type' && ctx.arrayKey === 'questions') return ctx.questionType;
    return pickEnum(schema.enum, key, ctx.text, ctx.seed + ctx.index);
  }
  if (types.includes('object')) {
    const out = {};
    for (const [prop, sub] of Object.entries(schema.properties || {})) {
      out[prop] = synth(sub, prop, ctx);
    }
    return out;
  }
  if (types.includes('array')) {
    const len = arrayLength(key, schema, ctx);
    const out = [];
    for (let i = 0; i < len; i++) {
      out.push(synth(schema.items, schema.items?.type === 'string' ? key : key, { ...ctx, index: i, arrayKey: key }));
    }
    return out;
  }
  if (types.includes('number') || types.includes('integer')) {
    const value = makeNumber(key, ctx);
    return types.includes('integer') ? Math.round(value) : value;
  }
  if (types.includes('boolean')) return makeBoolean(key, ctx);
  return makeString(key, ctx);
}

function contextFrom(opts) {
  const text = promptText(opts.messages || []);
  const seed = hash(text);
  const topicMatch = text.match(/Topic:\s*(.+)/);
  const subjectMatch = text.match(/Subject:\s*(.+)/);
  const countMatch = text.match(/Question count:\s*(\d+)|Card count:\s*(\d+)/);
  const difficultyMatch = text.match(/Difficulty:\s*([\d.]+)/);
  const minutesMatch = text.match(/(?:Time available|Minutes per day):\s*(\d+)/);
  const daysMatch = text.match(/Days available:\s*(\d+)/);
  const conceptsMatch = text.match(/Focus concepts:\s*(.+)/);
  const attemptMatch = text.match(/attempt="(\d+)"/);
  const typeMatch = text.match(/^Type:\s*(\w+)/m);

  const answer = (text.match(/<student_answer[^>]*>([\s\S]*?)<\/student_answer>/) || [])[1] || '';

  return {
    text,
    seed,
    index: 0,
    arrayKey: '',
    topic: (topicMatch?.[1] || 'the topic').trim().slice(0, 60),
    subject: (subjectMatch?.[1] || 'General').trim().slice(0, 40),
    count: Number(countMatch?.[1] || countMatch?.[2] || 3),
    difficulty: Number(difficultyMatch?.[1] || 3),
    minutes: Number(minutesMatch?.[1] || 20),
    days: Number(daysMatch?.[1] || 3),
    concepts: (conceptsMatch?.[1] || '').split(',').map((s) => s.trim()).filter(Boolean),
    questionType: typeMatch?.[1] && typeMatch[1] !== 'undefined' ? typeMatch[1] : 'multiple_choice',
    attemptNumber: Number(attemptMatch?.[1] || 1),
    grading: text.includes('<student_answer'),
    correct: /CORRECT/i.test(answer) && !/INCORRECT/i.test(answer),
  };
}

export function createMockProvider() {
  log.warn('using the deterministic MOCK provider — no real model is being called');
  return {
    name: 'mock',
    model: 'mock-deterministic',
    async run(opts) {
      const ctx = contextFrom(opts);
      if (!ctx.concepts.length) ctx.concepts = [ctx.topic];
      if (!opts.schema) {
        const text = `Mock response about ${ctx.topic}.`;
        if (opts.onText) opts.onText(text, text);
        return { text, usage: {}, stopReason: 'end_turn', model: 'mock-deterministic' };
      }
      const object = synth(opts.schema, 'root', ctx);
      const text = JSON.stringify(object);
      if (opts.onText) opts.onText(text, text);
      if (opts.onPartial) opts.onPartial(object, text);
      return { text, object, usage: {}, stopReason: 'end_turn', model: 'mock-deterministic' };
    },
  };
}
