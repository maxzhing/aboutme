import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { adaptSchema, measure, schemaInstruction, describeSchemaSupport } from '../server/llm/openai-schema.js';
import * as schemas from '../server/schemas/index.js';

const OBJECT_SCHEMAS = Object.fromEntries(
  Object.entries(schemas).filter(([, value]) => value && typeof value === 'object' && value.type === 'object'),
);

describe('adapting a schema for OpenAI strict mode', () => {
  test('strips the keywords strict mode rejects, at every depth', () => {
    const { schema } = adaptSchema({
      type: 'object',
      properties: {
        n: { type: 'number', minimum: 1, maximum: 5 },
        list: { type: 'array', minItems: 2, maxItems: 9, items: { type: 'string', pattern: '^a', maxLength: 3 } },
        nested: { type: 'object', properties: { s: { type: 'string', format: 'email', default: 'x' } } },
      },
    });
    assert.equal(schema.properties.n.minimum, undefined);
    assert.equal(schema.properties.n.maximum, undefined);
    assert.equal(schema.properties.list.minItems, undefined);
    assert.equal(schema.properties.list.items.pattern, undefined);
    assert.equal(schema.properties.list.items.maxLength, undefined);
    assert.equal(schema.properties.nested.properties.s.format, undefined);
    assert.equal(schema.properties.nested.properties.s.default, undefined);
  });

  test('keeps everything that carries meaning', () => {
    const { schema } = adaptSchema({
      type: 'object',
      description: 'A thing.',
      properties: {
        kind: { type: 'string', enum: ['a', 'b'], description: 'Which one.' },
        maybe: { anyOf: [{ type: 'object', properties: { x: { type: 'string' } } }, { type: 'null' }] },
      },
    });
    assert.equal(schema.description, 'A thing.');
    assert.deepEqual(schema.properties.kind.enum, ['a', 'b']);
    assert.equal(schema.properties.kind.description, 'Which one.');
    assert.equal(schema.properties.maybe.anyOf.length, 2, 'nullable unions survive');
    assert.equal(schema.properties.maybe.anyOf[0].additionalProperties, false, 'including inside the union');
  });

  test('closes every object and requires every property', () => {
    const { schema } = adaptSchema({
      type: 'object',
      properties: { a: { type: 'string' }, b: { type: 'object', properties: { c: { type: 'string' } }, required: [] } },
      required: ['a'],
    });
    assert.deepEqual(schema.required, ['a', 'b'], 'strict mode has no optional properties');
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.b.required, ['c']);
    assert.equal(schema.properties.b.additionalProperties, false);
  });

  test('a property literally named "format" is not mistaken for the keyword', () => {
    const { schema } = adaptSchema({
      type: 'object',
      properties: { exam_format: { type: 'object', properties: { minimum: { type: 'string' } } } },
    });
    assert.ok(schema.properties.exam_format, 'the property survives');
    assert.ok(schema.properties.exam_format.properties.minimum, 'so does one named like a keyword');
  });

  test('measures depth, properties and enum values', () => {
    const size = measure({
      type: 'object',
      properties: {
        a: { type: 'string', enum: ['x', 'y'] },
        b: { type: 'array', items: { type: 'object', properties: { c: { type: 'string' } } } },
      },
    });
    assert.equal(size.properties, 3);
    assert.equal(size.enums, 2);
    assert.equal(size.depth, 4, 'root, b, the item, then c');
  });
});

describe('deciding when strict mode can be used', () => {
  test('a small schema gets the guarantee', () => {
    const { strict, reasons } = adaptSchema({
      type: 'object',
      properties: { say: { type: 'string' } },
    });
    assert.equal(strict, true);
    assert.deepEqual(reasons, []);
  });

  test('a schema past a limit is refused, with the reason', () => {
    const deep = { type: 'object', properties: { a: { type: 'string' } } };
    let node = deep;
    for (let i = 0; i < 8; i++) node = { type: 'object', properties: { next: node } };
    const { strict, reasons } = adaptSchema(node);
    assert.equal(strict, false);
    assert.match(reasons.join(' '), /nested \d+ levels deep/);
  });

  test('the limits are overridable, because they are not ours to fix', () => {
    const deep = { type: 'object', properties: { a: { type: 'object', properties: { b: { type: 'string' } } } } };
    assert.equal(adaptSchema(deep, { depth: 1, properties: 100, enums: 500 }).strict, false);
    assert.equal(adaptSchema(deep, { depth: 9, properties: 100, enums: 500 }).strict, true);
  });

  test('the fallback instruction carries the real schema', () => {
    const instruction = schemaInstruction({ type: 'object', properties: { say: { type: 'string' } } });
    assert.ok(instruction.includes('<schema>'));
    assert.ok(instruction.includes('"say"'));
    assert.match(instruction, /single JSON object and nothing else/);
  });
});

describe('Axiom’s own schemas against those limits', () => {
  const support = describeSchemaSupport(OBJECT_SCHEMAS);
  const by = (name) => support.find((row) => row.name === name);

  test('every schema is measured, and none is unaccounted for', () => {
    assert.ok(support.length >= 12, `expected the full set, saw ${support.length}`);
    for (const row of support) assert.ok(row.depth >= 1 && row.properties >= 1, `${row.name} was not measured`);
  });

  test('the short schemas keep the guarantee', () => {
    // These are the ones where a wrong shape would be most expensive: routing
    // decides what the whole session does, grading feeds the mastery model,
    // and quality control is what stops a broken question reaching a learner.
    for (const name of ['routeSchema', 'gradeSchema', 'qcSchema', 'flashcardSchema', 'insightsSchema', 'sourceSchema']) {
      const row = by(name);
      assert.ok(row, `${name} is missing`);
      assert.equal(row.strict, true, `${name} should fit strict mode (${row.reasons})`);
    }
  });

  test('the deep teaching schemas are known to need the fallback', () => {
    // Not an accident and not a regression: a lesson is blocks containing
    // diagrams containing nodes, and flattening that to satisfy one provider
    // would make the product worse for both. Asserted so it stays visible.
    for (const name of ['lessonSchema', 'tutorTurnSchema', 'practiceSchema', 'studyGuideSchema', 'courseSchema']) {
      const row = by(name);
      assert.ok(row, `${name} is missing`);
      assert.equal(row.strict, false, `${name} unexpectedly fits strict mode — the fallback note can be dropped`);
      assert.match(row.reasons, /levels deep|properties/);
    }
  });

  test('every adapted schema is still valid JSON and still describes itself', () => {
    for (const [name, schema] of Object.entries(OBJECT_SCHEMAS)) {
      const { schema: adapted } = adaptSchema(schema);
      assert.doesNotThrow(() => JSON.parse(JSON.stringify(adapted)), `${name} must survive serialisation`);
      assert.equal(adapted.type, 'object');
      assert.deepEqual(
        Object.keys(adapted.properties),
        Object.keys(schema.properties),
        `${name} must keep every property it had`,
      );
    }
  });
});
