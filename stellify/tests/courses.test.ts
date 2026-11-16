import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { COURSES, COURSE_LIST } from '@/data/apCourses';
import { calcCorrect, type CalcLesson, type LessonTutor } from '@/data/calc';
import { tokenize } from '@/lib/richtext';

const texts = (l: CalcLesson, t?: LessonTutor) => [
  l.intro, ...l.goals,
  ...l.notes.flatMap((n) => (n.k === 'list' ? n.items : n.k === 'rule' ? [n.title, n.t] : n.k === 'formula' ? [`$$${n.t}$$`] : [n.t])),
  ...l.examples.flatMap((e) => [e.q, ...e.steps, e.a]),
  ...l.practice.flatMap((p) => [p.q, p.hint, ...p.solution, ...(p.choices ?? [])]),
  ...l.remember, l.checkIn,
  ...(t ? [...t.bigIdea, t.picture.title, t.picture.t, ...t.words.flatMap((w) => [w.term, w.means]), ...t.tools.flatMap((x) => [x.name, x.refresher]), ...t.why.flat(), ...Object.values(t.walk).flat(), ...t.teach.plan, ...t.teach.questions.flatMap((q) => [q.q, q.a]), ...t.teach.keyPoints] : []),
];

describe.each(COURSE_LIST().filter((c) => c.id !== 'calc').map((c) => [c.name, c.id]))('%s', (_name, id) => {
  const c = COURSES[id];
  it('has every unit written, with lessons in order', () => {
    expect(c.units.length).toBeGreaterThanOrEqual(4);
    for (const u of c.units) {
      const ls = c.lessonsOfUnit(u.n);
      expect(ls.length, `unit ${u.n}`).toBeGreaterThanOrEqual(2);
      expect(ls.map((l) => l.n), `unit ${u.n}`).toEqual(ls.map((_, i) => i + 1));
    }
  });

  it('has complete lessons and well-formed practice', () => {
    const ids = new Set<string>();
    for (const l of c.lessons) {
      expect(l.goals.length, l.id).toBeGreaterThanOrEqual(3);
      expect(l.notes.length, l.id).toBeGreaterThanOrEqual(5);
      expect(l.examples.length, l.id).toBeGreaterThanOrEqual(2);
      expect(l.practice.length, l.id).toBeGreaterThanOrEqual(6);
      for (const p of l.practice) {
        expect(ids.has(p.id), p.id).toBe(false); ids.add(p.id);
        expect(p.hint.length, p.id).toBeGreaterThan(5);
        expect(p.solution.length, p.id).toBeGreaterThanOrEqual(1);
        if (typeof p.answer === 'number') { expect(p.choices?.length, p.id).toBe(4); expect(p.answer).toBeLessThan(4); }
        else { expect(p.answer.length, p.id).toBeGreaterThan(0); expect(calcCorrect(p, p.answer[0], c.answer.exact), p.id).toBe(true); }
      }
    }
  });

  it('verifies computed answers independently', () => {
    const all = c.lessons.flatMap((l) => l.practice);
    let checked = 0;
    for (const p of all) if (p.check) { expect(p.check(), p.id).toBe(true); checked++; }
    const free = all.filter((p) => typeof p.answer !== 'number');
    expect(checked).toBeGreaterThanOrEqual(Math.floor(free.length * 0.9));
  });

  it('gives every lesson a complete tutor layer', () => {
    for (const l of c.lessons) {
      const t = c.tutor[l.id];
      expect(t, `${l.id} has no tutor layer`).toBeDefined();
      expect(t.bigIdea.length, l.id).toBeGreaterThanOrEqual(3);
      expect(t.words.length, l.id).toBeGreaterThanOrEqual(3);
      expect(t.tools.length, l.id).toBeGreaterThanOrEqual(1);
      expect(t.why.map((w) => w.length), l.id).toEqual(l.examples.map((e) => e.steps.length));
      expect(Object.keys(t.walk).sort(), l.id).toEqual(l.practice.map((p) => p.id).sort());
      for (const [pid, w] of Object.entries(t.walk)) expect(w.length, pid).toBeGreaterThanOrEqual(3);
      expect(t.teach.plan.length, l.id).toBeGreaterThanOrEqual(4);
      expect(t.teach.questions.length, l.id).toBeGreaterThanOrEqual(2);
      expect(t.teach.keyPoints.length, l.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('renders every formula', () => {
    for (const l of c.lessons) for (const s of texts(l, c.tutor[l.id])) for (const t of tokenize(s.replace(/~~~[\s\S]*?~~~/g, ''))) {
      if (t.t === 'math' || t.t === 'dmath') expect(() => katex.renderToString(t.v, { throwOnError: true, displayMode: t.t === 'dmath' }), `${l.id}: ${t.v}`).not.toThrow();
    }
  });
});

it('lesson and problem ids are unique across all courses', () => {
  const lessons = COURSE_LIST().flatMap((c) => c.lessons.map((l) => l.id));
  const problems = COURSE_LIST().flatMap((c) => c.lessons.flatMap((l) => l.practice.map((p) => p.id)));
  expect(new Set(lessons).size).toBe(lessons.length);
  expect(new Set(problems).size).toBe(problems.length);
});
