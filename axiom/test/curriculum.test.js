import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CURRICULA, findCurriculum, catalogue, cloneBlueprint } from '../curriculum/index.js';
import { courseSchema } from '../server/schemas/index.js';
import { coerce } from '../server/engine/validate.js';
import { courseReadiness, bandFor } from '../server/engine/readiness.js';

describe('the verified curriculum library', () => {
  test('every blueprint survives the schema the model is held to', () => {
    for (const blueprint of CURRICULA) {
      const coerced = coerce(cloneBlueprint(blueprint), courseSchema);
      assert.ok(coerced.title, `${blueprint.key} keeps its title`);
      assert.equal(coerced.units.length, blueprint.units.length, `${blueprint.key} keeps every unit`);
      for (const [i, unit] of coerced.units.entries()) {
        assert.equal(
          unit.concepts.length,
          blueprint.units[i].concepts.length,
          `${blueprint.key} unit ${unit.idx} keeps every concept`,
        );
      }
    }
  });

  test('working unit weights partition the paper, and the published range is kept', () => {
    for (const blueprint of CURRICULA) {
      const total = blueprint.units.reduce((sum, u) => sum + u.exam_weight_percent, 0);
      assert.ok(Math.abs(total - 100) < 0.5, `${blueprint.key} weights total ${total}`);
      for (const unit of blueprint.units) {
        assert.ok(unit.published_weight, `${blueprint.key} unit ${unit.idx} keeps what was published`);
        // Scaling must stay close to the transcribed midpoint, or the source
        // has been transcribed wrong rather than merely rounded.
        assert.ok(
          Math.abs(unit.exam_weight_percent - unit.midpoint_weight) < 4,
          `${blueprint.key} unit ${unit.idx} moved ${unit.midpoint_weight}% -> ${unit.exam_weight_percent}%`,
        );
      }
    }
  });

  test('exam sections add up to the whole paper', () => {
    for (const blueprint of CURRICULA) {
      const total = blueprint.exam_format.sections.reduce((sum, s) => sum + s.weight_percent, 0);
      assert.ok(Math.abs(total - 100) < 1.5, `${blueprint.key} sections total ${total}%`);
      const minutes = blueprint.exam_format.sections.reduce((sum, s) => sum + s.minutes, 0);
      assert.ok(minutes <= blueprint.exam_format.total_minutes + 1, `${blueprint.key} section timings exceed the paper`);
    }
  });

  test('score bands descend and bottom out at zero', () => {
    for (const blueprint of CURRICULA) {
      const bands = blueprint.score_bands;
      assert.equal(bands.at(-1).min_percent, 0, `${blueprint.key} has a reachable bottom band`);
      for (let i = 1; i < bands.length; i++) {
        assert.ok(bands[i - 1].score > bands[i].score, `${blueprint.key} bands descend`);
        assert.ok(bands[i - 1].min_percent > bands[i].min_percent, `${blueprint.key} thresholds descend`);
      }
      // A perfect paper must land on the top band and a blank one on the bottom.
      assert.equal(bandFor(1, bands).score, bands[0].score);
      assert.equal(bandFor(0, bands).score, bands.at(-1).score);
    }
  });

  test('concept names are unique within a course and prerequisites resolve', () => {
    for (const blueprint of CURRICULA) {
      const names = new Set();
      for (const unit of blueprint.units) {
        for (const concept of unit.concepts) {
          const key = concept.name.toLowerCase();
          assert.ok(!names.has(key), `${blueprint.key} repeats the concept "${concept.name}"`);
          names.add(key);
          assert.ok(concept.difficulty >= 1 && concept.difficulty <= 5, `${concept.name} has a real difficulty`);
          assert.ok(
            ['core', 'important', 'peripheral'].includes(concept.criticality),
            `${concept.name} has a real criticality`,
          );
        }
      }
      for (const unit of blueprint.units) {
        for (const concept of unit.concepts) {
          for (const prerequisite of concept.prerequisites) {
            assert.ok(
              names.has(prerequisite.toLowerCase()),
              `${blueprint.key}: "${concept.name}" requires "${prerequisite}", which is not in the course`,
            );
          }
        }
      }
    }
  });

  test('every course has enough core content to teach', () => {
    for (const b of catalogue()) {
      assert.ok(b.units >= 4, `${b.key} has ${b.units} units`);
      assert.ok(b.concepts >= 30, `${b.key} has only ${b.concepts} concepts`);
      assert.ok(b.hours >= 60, `${b.key} claims only ${b.hours} hours`);
    }
  });

  test('a blank learner projects the bottom band on every course', () => {
    for (const blueprint of CURRICULA) {
      const readiness = courseReadiness({ blueprint, conceptLookup: () => undefined });
      assert.equal(
        readiness.score,
        blueprint.score_bands.at(-1).score,
        `${blueprint.key} must not flatter a learner who has done nothing`,
      );
      assert.ok(readiness.confidence === 0, `${blueprint.key} claims no confidence without evidence`);
      assert.ok(readiness.leverage.length === blueprint.units.length);
    }
  });

  test('a mastered learner projects the top band on every course', () => {
    const expert = (name) => ({
      name, attempts: 20, correct: 20, ability: 4.9, mastery_level: 5, mastery_score: 0.95,
    });
    for (const blueprint of CURRICULA) {
      const readiness = courseReadiness({ blueprint, conceptLookup: expert });
      assert.equal(
        readiness.score,
        blueprint.score_bands[0].score,
        `${blueprint.key} must reward a learner who has proved everything (got ${Math.round(readiness.percent * 100)}%)`,
      );
    }
  });
});

describe('matching a request to a real course', () => {
  const cases = [
    ['I want a 5 on AP Bio', 'ap-biology'],
    ['teach me ap physics 1 from scratch', 'ap-physics-1'],
    ['ap calc ab, exam is in may', 'ap-calculus-ab'],
    ['help me with apush DBQs', 'ap-us-history'],
    ['AP World History: Modern', 'ap-world-history-modern'],
    ['ap chem unit 8 acids and bases', 'ap-chemistry'],
    ['AP Computer Science A', 'ap-computer-science-a'],
    ['ap lang synthesis essay', 'ap-english-language'],
    ['ap macro', 'ap-macroeconomics'],
    ['apes', 'ap-environmental-science'],
    ['ap stats inference', 'ap-statistics'],
    ['ap psych', 'ap-psychology'],
  ];

  for (const [request, key] of cases) {
    test(`"${request}" finds ${key}`, () => {
      const match = findCurriculum(request);
      assert.ok(match, `no match for "${request}"`);
      assert.equal(match.blueprint.key, key);
    });
  }

  test('a sibling course is never mistaken for its neighbour', () => {
    for (const request of ['AP Physics C: Mechanics', 'ap calculus bc', 'ap microeconomics', 'AP English Literature', 'ap computer science principles']) {
      assert.equal(findCurriculum(request), null, `"${request}" must fall through to generation`);
    }
  });

  test('a topic is not a course', () => {
    for (const request of ['teach me about cells', 'photosynthesis', 'help with my homework', '']) {
      assert.equal(findCurriculum(request), null, `"${request}" must not claim a whole syllabus`);
    }
  });

  test('the library is handed out as a copy', () => {
    const match = findCurriculum('AP Biology');
    const copy = cloneBlueprint(match.blueprint);
    copy.units[0].title = 'Tampered';
    assert.notEqual(findCurriculum('AP Biology').blueprint.units[0].title, 'Tampered');
  });
});
