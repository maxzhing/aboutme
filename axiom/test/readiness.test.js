import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  conceptExpectation,
  unitReadiness,
  bandFor,
  courseReadiness,
  pathToScore,
  pacing,
  nextBestAction,
} from '../server/engine/readiness.js';

const BANDS = [
  { score: 5, min_percent: 72, meaning: 'Extremely well qualified' },
  { score: 4, min_percent: 58, meaning: 'Well qualified' },
  { score: 3, min_percent: 44, meaning: 'Qualified' },
  { score: 2, min_percent: 30, meaning: 'Possibly qualified' },
  { score: 1, min_percent: 0, meaning: 'No recommendation' },
];

function concept(overrides = {}) {
  return { name: 'X', mastery_level: 0, ability: 2, attempts: 0, correct: 0, ...overrides };
}

/** Two units: one heavy and shaky, one light and solid. */
function blueprint() {
  return {
    score_bands: BANDS,
    units: [
      {
        idx: 1,
        title: 'Kinematics',
        exam_weight_percent: 60,
        hours: 10,
        concepts: [
          { name: 'velocity-time graphs', difficulty: 3, criticality: 'core' },
          { name: 'projectile motion', difficulty: 4, criticality: 'core' },
        ],
      },
      {
        idx: 2,
        title: 'Waves',
        exam_weight_percent: 40,
        hours: 6,
        concepts: [
          { name: 'superposition', difficulty: 3, criticality: 'core' },
          { name: 'doppler trivia', difficulty: 2, criticality: 'peripheral' },
        ],
      },
    ],
  };
}

describe('concept expectation', () => {
  test('an untaught concept sits near the guess rate, with no confidence', () => {
    const { p, confidence } = conceptExpectation(concept());
    assert.ok(p <= 0.2, `expected a guess-level estimate, got ${p}`);
    assert.equal(confidence, 0);
  });

  test('reading a lesson barely moves the estimate — only attempts do', () => {
    const introduced = conceptExpectation(concept({ mastery_level: 1 }));
    const untouched = conceptExpectation(concept({ mastery_level: 0 }));
    assert.ok(introduced.p - untouched.p < 0.1, 'being introduced is not evidence');
    assert.equal(introduced.confidence, 0);
  });

  test('confidence grows with attempts and never reaches certainty', () => {
    const few = conceptExpectation(concept({ attempts: 2, correct: 2, ability: 3 }));
    const many = conceptExpectation(concept({ attempts: 20, correct: 18, ability: 4 }));
    assert.ok(many.confidence > few.confidence);
    assert.ok(many.confidence < 1);
  });

  test('a strong learner beats a hard item more often than a weak one', () => {
    const strong = conceptExpectation(concept({ attempts: 10, correct: 9, ability: 4.5 }), 4);
    const weak = conceptExpectation(concept({ attempts: 10, correct: 3, ability: 1.5 }), 4);
    assert.ok(strong.p > weak.p + 0.3);
  });
});

describe('unit readiness', () => {
  test('core concepts count for more than peripheral ones', () => {
    const unit = {
      idx: 1,
      title: 'U',
      exam_weight_percent: 50,
      concepts: [
        { name: 'core thing', difficulty: 3, criticality: 'core' },
        { name: 'edge case', difficulty: 3, criticality: 'peripheral' },
      ],
    };
    const coreStrong = unitReadiness(unit, (n) =>
      n === 'core thing' ? concept({ attempts: 10, correct: 10, ability: 4.5 }) : concept(),
    );
    const peripheralStrong = unitReadiness(unit, (n) =>
      n === 'edge case' ? concept({ attempts: 10, correct: 10, ability: 4.5 }) : concept(),
    );
    assert.ok(
      coreStrong.expected > peripheralStrong.expected,
      'mastering the core concept must move the unit more than mastering the peripheral one',
    );
  });

  test('points available scales with exam weight, not with how weak it feels', () => {
    const heavy = unitReadiness({ idx: 1, title: 'H', exam_weight_percent: 60, concepts: [{ name: 'a', criticality: 'core' }] }, () => concept());
    const light = unitReadiness({ idx: 2, title: 'L', exam_weight_percent: 5, concepts: [{ name: 'b', criticality: 'core' }] }, () => concept());
    assert.ok(heavy.points_available > light.points_available * 5);
  });

  test('the weakest concepts are surfaced first', () => {
    const unit = {
      idx: 1, title: 'U', exam_weight_percent: 100,
      concepts: [
        { name: 'solid', criticality: 'core' },
        { name: 'shaky', criticality: 'core' },
      ],
    };
    const readiness = unitReadiness(unit, (n) =>
      n === 'solid' ? concept({ attempts: 10, correct: 10, ability: 4.5 }) : concept({ attempts: 6, correct: 1, ability: 1.4 }),
    );
    assert.equal(readiness.concepts[0].name, 'shaky');
  });
});

describe('score bands', () => {
  test('a percentage maps to the exam’s own reported score', () => {
    assert.equal(bandFor(0.85, BANDS).score, 5);
    assert.equal(bandFor(0.72, BANDS).score, 5);
    assert.equal(bandFor(0.6, BANDS).score, 4);
    assert.equal(bandFor(0.45, BANDS).score, 3);
    assert.equal(bandFor(0.05, BANDS).score, 1);
  });
});

describe('course readiness', () => {
  const strong = concept({ attempts: 14, correct: 13, ability: 4.6, mastery_level: 5 });
  const weak = concept({ attempts: 8, correct: 2, ability: 1.5, mastery_level: 1 });

  test('a learner who knows nothing projects the bottom band with a wide interval', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept() });
    assert.equal(r.score, 1);
    assert.equal(r.confidence, 0);
    assert.ok(r.margin > 0.15, 'no evidence must produce a wide interval');
  });

  test('a learner who has demonstrated everything projects the top band', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => strong });
    assert.equal(r.score, 5);
    assert.ok(r.percent > 0.8);
    assert.ok(r.margin < 0.1, 'plenty of evidence must tighten the interval');
  });

  test('the heavy unit dominates the prediction', () => {
    const heavyStrong = courseReadiness({
      blueprint: blueprint(),
      conceptLookup: (n) => (['velocity-time graphs', 'projectile motion'].includes(n) ? strong : weak),
    });
    const lightStrong = courseReadiness({
      blueprint: blueprint(),
      conceptLookup: (n) => (['superposition', 'doppler trivia'].includes(n) ? strong : weak),
    });
    assert.ok(
      heavyStrong.percent > lightStrong.percent,
      'being strong on 60% of the paper must beat being strong on 40% of it',
    );
  });

  test('leverage ranks by marks available, so the heavy weak unit comes first', () => {
    const r = courseReadiness({
      blueprint: blueprint(),
      conceptLookup: (n) => (['superposition', 'doppler trivia'].includes(n) ? strong : weak),
    });
    assert.equal(r.leverage[0].title, 'Kinematics');
    assert.ok(r.leverage[0].points_available > r.leverage[1].points_available);
  });

  test('a real practice paper pulls the prediction toward what was actually scored', () => {
    const args = { blueprint: blueprint(), conceptLookup: () => strong };
    const uncalibrated = courseReadiness(args);
    const calibrated = courseReadiness({
      ...args,
      examResults: [{ percent: 0.4, created_at: new Date().toISOString() }],
    });
    assert.ok(calibrated.percent < uncalibrated.percent, 'a bad real paper must lower the prediction');
    assert.ok(calibrated.calibrated_on, 'the calibration source is reported');
  });

  test('an old practice paper counts for less than a fresh one', () => {
    const args = { blueprint: blueprint(), conceptLookup: () => strong };
    const fresh = courseReadiness({ ...args, examResults: [{ percent: 0.4, created_at: new Date().toISOString() }] });
    const stale = courseReadiness({
      ...args,
      examResults: [{ percent: 0.4, created_at: new Date(Date.now() - 30 * 86400000).toISOString() }],
    });
    assert.ok(stale.percent > fresh.percent, 'a month-old paper should not dominate today’s estimate');
  });
});

describe('path to a target score', () => {
  test('names the units that close the gap, heaviest leverage first', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept({ attempts: 6, correct: 2, ability: 2 }) });
    const path = pathToScore(r, 5);
    assert.ok(path.units.length >= 1);
    assert.equal(path.units[0].title, 'Kinematics');
    assert.ok(path.gap > 0);
  });

  test('says so plainly when the learner is already there', () => {
    const r = courseReadiness({
      blueprint: blueprint(),
      conceptLookup: () => concept({ attempts: 14, correct: 14, ability: 4.8, mastery_level: 5 }),
    });
    const path = pathToScore(r, 5);
    assert.equal(path.alreadyThere, true);
    assert.equal(path.units.length, 0);
  });

  test('an unknown target score is reported rather than guessed at', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept() });
    assert.equal(pathToScore(r, 9).reachable, false);
  });
});

describe('pacing', () => {
  const now = new Date('2026-03-01T00:00:00Z');

  test('plenty of time on a nearly-learned course reads as on track', () => {
    const r = courseReadiness({
      blueprint: blueprint(),
      conceptLookup: () => concept({ attempts: 12, correct: 11, ability: 4.5 }),
    });
    const p = pacing(r, { examDate: '2026-06-01', minutesPerDay: 60, now });
    assert.equal(p.status, 'on_track');
    assert.ok(p.daysLeft > 80);
  });

  test('a week left on an unlearned course reads as behind', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept() });
    const p = pacing(r, { examDate: '2026-03-08', minutesPerDay: 60, now });
    assert.equal(p.status, 'behind');
    assert.ok(p.hoursPerDayNeeded > 1);
  });

  test('no exam date means no deadline pressure, not a fake one', () => {
    const r = courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept() });
    assert.equal(pacing(r, { examDate: null }).status, 'no_deadline');
  });
});

describe('next best action', () => {
  const weakCourse = () => courseReadiness({ blueprint: blueprint(), conceptLookup: () => concept({ attempts: 4, correct: 1, ability: 1.8 }) });

  test('review debt outranks new content', () => {
    const action = nextBestAction({
      readiness: weakCourse(),
      pace: { daysLeft: 60 },
      dueCount: 5,
      examTaken: true,
    });
    assert.equal(action.kind, 'review');
  });

  test('close to the exam with no paper sat, sit a paper', () => {
    const action = nextBestAction({
      readiness: weakCourse(),
      pace: { daysLeft: 10 },
      dueCount: 0,
      examTaken: false,
    });
    assert.equal(action.kind, 'exam');
  });

  test('otherwise it picks the highest-leverage unit and says what it is worth', () => {
    const action = nextBestAction({
      readiness: weakCourse(),
      pace: { daysLeft: 60 },
      dueCount: 0,
      examTaken: true,
    });
    assert.ok(['learn', 'practice', 'master'].includes(action.kind));
    assert.equal(action.unit, 'Kinematics');
    assert.match(action.why, /% of the paper/);
  });

  test('a learner already at target is told to protect it, not to grind', () => {
    const action = nextBestAction({
      readiness: courseReadiness({
        blueprint: blueprint(),
        conceptLookup: () => concept({ attempts: 16, correct: 16, ability: 4.8, mastery_level: 5 }),
      }),
      pace: { daysLeft: 30 },
      dueCount: 0,
      examTaken: true,
      targetScore: 5,
    });
    assert.equal(action.kind, 'maintain');
  });
});
