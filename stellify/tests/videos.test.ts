import { describe, expect, it } from 'vitest';
import { VIDEOS } from '@/data/videos';
import { SKILLS } from '@/lib/taxonomy';
import { beatSeconds, beatsOf } from '@/components/VideoPlayer';

describe('video lessons', () => {
  it('has one video for every SAT skill', () => {
    expect(VIDEOS.map((v) => v.skill).sort()).toEqual(SKILLS.map((k) => k.id).sort());
  });
  for (const v of VIDEOS) {
    it(`${v.skill}: every scene is well formed and the video is a sensible length`, () => {
      const secs = beatsOf(v).reduce((t, b) => t + beatSeconds(b.say), 0);
      expect(secs).toBeGreaterThan(60);
      expect(secs).toBeLessThan(420);
      expect(v.scenes.filter((s) => s.k === 'quiz').length).toBeGreaterThanOrEqual(1);
      for (const s of v.scenes) {
        expect(s.say.length, `${v.skill} ${s.k}`).toBeGreaterThan(0);
        // narration is spoken aloud: no LaTeX, no markup
        for (const say of s.say) expect(say, `${v.skill}: ${say}`).not.toMatch(/[$\\{}]/);
        if (s.k === 'choices') {
          expect(s.choices).toHaveLength(4);
          expect(s.notes).toHaveLength(4);
          expect(s.cross).not.toContain(s.answer);
          expect(new Set(s.cross).size).toBe(3);
          expect(s.say.length, `${v.skill} choices beats`).toBe(s.cross.length + 2);
        }
        if (s.k === 'quiz') { expect(s.choices).toHaveLength(4); expect(s.answer).toBeGreaterThanOrEqual(0); expect(s.answer).toBeLessThan(4); }
        if (s.k === 'lines') expect(s.rows.length, `${v.skill} lines`).toBe(s.say.length);
        if (s.k === 'recap') expect(s.points.length).toBe(s.say.length);
        if (s.k === 'tiles') expect(s.items.length).toBe(s.say.length);
        if (s.k === 'versus') expect(s.say.length).toBe(2);
        if (s.k === 'passage') expect((s.text.match(/\{\{/g) ?? []).length, `${v.skill} passage marks`).toBe(s.say.length - 1);
        if (s.k === 'plot') for (const it of s.items) expect(it.at ?? 0).toBeLessThan(s.say.length);
        if (s.k === 'table') {
          expect(s.lit.length).toBe(s.say.length);
          for (const cells of s.lit) for (const [r, c] of cells) { expect(r).toBeLessThan(s.rows.length); expect(c).toBeLessThan(s.headers.length); }
        }
      }
    });
  }
});

// The math in the scripts, checked independently.
describe('video lesson math', () => {
  it('works every worked example and pause-and-try question', () => {
    const x1 = 7; expect(5 * (x1 - 2) - 3).toBe(2 * x1 + 8);
    expect(18 / 3 + 4).toBe(10); // lin1 quiz
    expect(2 * 3).toBe(6); expect(3).not.toBe(4); // k = 3: 6x + 3 vs 6x + 4
    expect([1, 3, 5, 7].map((x) => 3 * x + 1)).toEqual([4, 10, 16, 22]);
    expect([3 * 1 - 1, 3 * 4 - 1]).toEqual([2, 11]);
    expect([3 * 2 + 2 * 5, 5 * 2 - 2 * 5]).toEqual([16, 0]);
    expect([2 * 3 + 5, 3 + 2 * 5, 3 + 5]).toEqual([11, 13, 8]);
    expect(Math.floor((1200 - 180) / 40)).toBe(25); expect(180 + 26 * 40).toBe(1220);
    expect([-4, -3, 0, 3].filter((x) => 5 - 2 * x > 11)).toEqual([-4]);
    const x = 2; expect(9 * x * x - 25).toBe((3 * x - 5) * (3 * x + 5)); expect(9 * x * x - 25).toBe(11);
    expect([3, -1].map((r) => r * r - 3)).toEqual([6, -2]); expect([3, -1].map((r) => 2 * r)).toEqual([6, -2]);
    expect(36 - 4 * 9).toBe(0); expect(10 / 2).toBe(5);
    expect(90 * 1000 / 3600).toBe(25); expect(3 / 8 * 20).toBe(7.5); expect(4.2 * 15).toBeCloseTo(63); expect(300 / 40 * 12).toBe(90);
    expect(1.2 * 0.8).toBeCloseTo(0.96); expect(63 / 0.75).toBe(84); expect(600 / 2400).toBe(0.25); expect(1.1 * 1.1).toBeCloseTo(1.21);
    const scores = [2, 3, 3, 4, 4, 4, 5, 5, 6, 15];
    expect(scores.reduce((a, b) => a + b) / 10).toBe(5.1); expect((scores[4] + scores[5]) / 2).toBe(4);
    expect([4, 7, 7, 9, 13].reduce((a, b) => a + b) / 5).toBe(8); expect([4, 7, 7, 9, 13, 40].reduce((a, b) => a + b) / 6).toBeCloseTo(13.33, 1);
    expect(2 * 6 + 3).toBe(15); expect(13.5 - 15).toBe(-1.5); expect(34 - 40).toBe(-6);
    expect([24 + 36, 30 + 10, 24 + 30, 36 + 10]).toEqual([60, 40, 54, 46]);
    expect(96 / 6).toBe(16); expect(4 ** 3).toBe(64); expect(5 * 9).toBe(45); expect(Math.PI * 9 * 10).toBeCloseTo(90 * Math.PI);
    expect((180 - 50) / 2).toBe(65); expect(3 * 20 + 10).toBe(5 * 20 - 30);
    expect(Math.hypot(5, 12)).toBe(13); expect(Math.hypot(3, 4)).toBe(5);
    expect(Math.sin(28 * Math.PI / 180)).toBeCloseTo(Math.cos(62 * Math.PI / 180));
    expect(12 + 9 + 4).toBe(25); expect(40 / 360 * 18).toBeCloseTo(2);
  });
});
