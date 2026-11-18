import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MUSIC_LESSONS } from '@/data/music';
import { STUDIO_EXERCISES } from '@/data/music/studio';
import { makeEar, EAR_KINDS } from '@/lib/music/ear';
import { modelPasses } from '@/lib/music/tasks';
import type { ListenSpec, StaffSpec } from '@/lib/music/score';
import { CHORD_WORDS, identify, ivName, ivWords, midi, parse, scale, spell } from '@/lib/music/theory';
import { Staff } from '@/components/music/Staff';

/** every notation and listening spec in the course */
function specs() {
  const staffs: { id: string; s: StaffSpec }[] = [], listens: { id: string; l: ListenSpec }[] = [];
  for (const l of MUSIC_LESSONS) {
    l.notes.forEach((n, i) => { if (n.k === 'staff') { staffs.push({ id: `${l.id} note ${i}`, s: n.staff }); if (n.listen) listens.push({ id: `${l.id} note ${i}`, l: n.listen }); } });
    l.examples.forEach((e, i) => { if (e.staff) staffs.push({ id: `${l.id} ex ${i}`, s: e.staff }); if (e.listen) listens.push({ id: `${l.id} ex ${i}`, l: e.listen }); });
    l.practice.forEach((p) => { if (p.staff) staffs.push({ id: p.id, s: p.staff }); if (p.listen) listens.push({ id: p.id, l: p.listen }); });
  }
  return { staffs, listens };
}

describe('AP Music Theory content', () => {
  const { staffs, listens } = specs();
  it('has 28 lessons across all eight units, with hands-on and listening work', () => {
    expect(MUSIC_LESSONS.length).toBe(28);
    expect(new Set(MUSIC_LESSONS.map((l) => l.unit))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
    const tasks = MUSIC_LESSONS.flatMap((l) => l.practice.filter((p) => p.task));
    expect(tasks.length).toBeGreaterThanOrEqual(30);
    expect(listens.length).toBeGreaterThanOrEqual(20);
    expect(staffs.length).toBeGreaterThanOrEqual(40);
  });
  it('spells every written pitch validly', () => {
    for (const { id, s } of staffs) for (const e of s.events) {
      for (const n of e.notes ?? []) expect(() => parse(n), id).not.toThrow();
      for (const n of Object.values(e.satb ?? {})) expect(() => parse(n as string), id).not.toThrow();
    }
    for (const { id, l } of listens) for (const st of l.steps) for (const n of [st].flat()) if (typeof n === 'string') expect(() => parse(n), id).not.toThrow();
  });
  it('renders every staff to SVG', () => {
    for (const { id, s } of staffs) {
      const html = renderToStaticMarkup(createElement(Staff, s));
      expect(html, id).toContain('<svg');
      expect(html, id).not.toContain('NaN');
    }
  });
  it('every hands-on task\'s model answer passes the engine', () => {
    for (const l of MUSIC_LESSONS) {
      for (const p of l.practice) if (p.task) expect(modelPasses(p.task), p.id).toBe(true);
      for (const n of l.notes) if (n.k === 'try') expect(modelPasses(n.task), `${l.id} try`).toBe(true);
    }
  });
  it('spreads multiple-choice keys across A–D', () => {
    const keys = MUSIC_LESSONS.flatMap((l) => l.practice.filter((p) => typeof p.answer === 'number').map((p) => p.answer as number));
    for (const k of [0, 1, 2, 3]) expect(keys.filter((x) => x === k).length, `answer ${'ABCD'[k]}`).toBeGreaterThan(keys.length * 0.12);
  });
  it('uses no gradients in notation', () => {
    for (const { s } of staffs.slice(0, 20)) expect(renderToStaticMarkup(createElement(Staff, s))).not.toMatch(/gradient/i);
  });
});

describe('Music Studio', () => {
  it('every part-writing exercise has a model answer that passes the checker', () => {
    for (const x of STUDIO_EXERCISES) expect(modelPasses(x.task), x.id).toBe(true);
  });
  it('ear training always keys the answer that is actually played', () => {
    let seed = 1;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (const { id } of EAR_KINDS) for (let i = 0; i < 300; i++) {
      const q = makeEar(id, rand);
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      const right = q.choices[q.answer];
      if (id === 'interval') expect(right).toBe(ivWords(ivName(q.meta.root, q.meta.top)));
      if (id === 'triad' || id === 'seventh') {
        const notes = q.listen.steps[0] as string[];
        const name = CHORD_WORDS[identify(notes)!.q];
        expect(right.toLowerCase()).toBe(name.toLowerCase());
      }
      if (id === 'scale') expect((q.listen.steps as string[]).join()).toBe(scale(q.meta.tonic, q.meta.kind as never).map(spell).join());
      if (id === 'cadence') expect(right).toBe(q.meta.cadence);
      for (const st of q.listen.steps) for (const n of [st].flat()) expect(typeof n === 'number' ? n : midi(n)).toBeGreaterThan(30);
    }
  });
});
