/**
 * Adapting Axiom's JSON schemas for OpenAI structured outputs.
 *
 * Anthropic constrains generation to a schema with no structural limits worth
 * worrying about. OpenAI's strict mode is stricter in both senses: it gives a
 * hard guarantee, but only for schemas inside its limits — roughly 100 total
 * properties and five levels of nesting — and it rejects the validation
 * keywords (`minimum`, `maxItems`, `pattern`) that it does not enforce.
 *
 * Axiom's schemas were written for the first world. A lesson is blocks, which
 * contain diagrams, which contain nodes; a tutor turn contains an activity
 * which contains a question which contains steps. Those run six or seven deep,
 * and flattening them to fit would make the product worse everywhere to satisfy
 * one provider.
 *
 * So this decides per schema. Where strict mode is reachable it is used and the
 * output is guaranteed. Where it is not, the request falls back to JSON mode
 * with the schema stated in the prompt — no guarantee, but Axiom already
 * carries the machinery for imperfect output: a tolerant prefix parser, a
 * coercion pass that fills and clamps against the same schema, and a quality
 * gate that re-solves generated questions. The difference is a weaker promise,
 * not a broken one, and `describeSchemaSupport` reports exactly which schemas
 * land on which side so it is visible rather than a surprise.
 */

/** Keywords OpenAI's strict mode rejects rather than ignores. */
const UNSUPPORTED = new Set([
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'pattern', 'format',
  'minItems', 'maxItems', 'uniqueItems',
  'minProperties', 'maxProperties',
  'default', 'examples', 'const', 'if', 'then', 'else', 'not',
]);

/**
 * Published limits, overridable because they are OpenAI's to change and a
 * wrong constant here should cost one environment variable, not a release.
 * Read defensively: this module also runs in the browser build, where there is
 * no `process`.
 */
const env = (name) => (typeof process !== 'undefined' ? process.env?.[name] : undefined);

export const LIMITS = {
  depth: Number(env('AXIOM_OPENAI_SCHEMA_DEPTH')) || 5,
  properties: Number(env('AXIOM_OPENAI_SCHEMA_PROPERTIES')) || 100,
  enums: 500,
};

/** Strip what strict mode rejects, and assert what it requires. */
function rewrite(node) {
  if (Array.isArray(node)) return node.map(rewrite);
  if (!node || typeof node !== 'object') return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED.has(key)) continue;
    if (key === 'properties') {
      out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rewrite(v)]));
    } else if (key === 'items' || key === 'additionalItems') {
      out[key] = rewrite(value);
    } else if (key === 'anyOf' || key === 'oneOf' || key === 'allOf') {
      out[key] = value.map(rewrite);
    } else {
      out[key] = value;
    }
  }

  // Strict mode requires every property listed in `required` and extras closed.
  if (out.properties) {
    out.required = Object.keys(out.properties);
    out.additionalProperties = false;
  }
  return out;
}

/**
 * Measure a schema the way the limits are stated.
 *
 * Counted conservatively: an object or an array's item schema each add a level,
 * and a union contributes its deepest branch without adding one itself. If the
 * real counting rule is looser, this errs toward JSON mode, which degrades a
 * guarantee rather than failing a request.
 */
export function measure(node, level = 1, seen = { depth: 0, properties: 0, enums: 0 }) {
  if (!node || typeof node !== 'object') return seen;
  seen.depth = Math.max(seen.depth, level);
  if (Array.isArray(node.enum)) seen.enums += node.enum.length;

  if (node.properties) {
    seen.properties += Object.keys(node.properties).length;
    for (const value of Object.values(node.properties)) measure(value, level + 1, seen);
  }
  if (node.items) measure(node.items, level + 1, seen);
  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    if (Array.isArray(node[key])) for (const branch of node[key]) measure(branch, level, seen);
  }
  return seen;
}

/**
 * Prepare a schema for a request.
 *
 * Returns the rewritten schema, whether strict mode can carry it, and — when it
 * cannot — the reasons, so the caller can say why rather than shrug.
 */
export function adaptSchema(schema, limits = LIMITS) {
  const adapted = rewrite(schema);
  const size = measure(adapted);

  const reasons = [];
  if (size.depth > limits.depth) reasons.push(`nested ${size.depth} levels deep, limit ${limits.depth}`);
  if (size.properties > limits.properties) reasons.push(`${size.properties} properties, limit ${limits.properties}`);
  if (size.enums > limits.enums) reasons.push(`${size.enums} enum values, limit ${limits.enums}`);

  return { schema: adapted, size, strict: reasons.length === 0, reasons };
}

/**
 * The instruction that replaces the guarantee when strict mode cannot be used.
 * JSON mode enforces valid JSON and nothing else, so the shape has to be asked
 * for in words — and asked for firmly, because this is the only thing standing
 * between the model and a differently-shaped document.
 */
export function schemaInstruction(schema) {
  return [
    'Return a single JSON object and nothing else — no prose, no code fence.',
    'It must match this JSON Schema exactly: every property present, no extra',
    'properties, arrays as arrays, nulls where the schema allows null.',
    '',
    '<schema>',
    JSON.stringify(schema),
    '</schema>',
  ].join('\n');
}

/** A readable report of which schemas strict mode can carry. Used by tests and the CLI. */
export function describeSchemaSupport(schemas, limits = LIMITS) {
  return Object.entries(schemas).map(([name, schema]) => {
    const { size, strict, reasons } = adaptSchema(schema, limits);
    return { name, depth: size.depth, properties: size.properties, strict, reasons: reasons.join('; ') };
  });
}
