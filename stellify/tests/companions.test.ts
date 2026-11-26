import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { EGG_NEEDS, SPECIES, eggOf, petName, rollSpecies, totalLessons } from '@/lib/engine/companions';
import { useStore } from '@/lib/store';
import { initialState } from '@/lib/state';
import { dateKey } from '@/lib/util';

describe('companion species', () => {
  it('has ten companions, none of them purple, with unique ids', () => {
    expect(SPECIES.length).toBe(10);
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(10);
    const purple = (hex: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return b > g + 40 && r > g + 20; };
    for (const s of SPECIES) expect(purple(s.colors.body), s.id).toBe(false);
  });
  it('rolls only companions the student does not have, weighted by rarity', () => {
    let seed = 3;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const counts: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) { const s = rollSpecies([], rand); counts[s.rarity] = (counts[s.rarity] ?? 0) + 1; }
    // 5 commons at 0.6, 4 rares at 0.32, 1 legendary at 0.08 → about 63%, 34%, 3%
    expect(counts.common / 20000).toBeGreaterThan(0.58);
    expect(counts.legendary / 20000).toBeGreaterThan(0.015);
    expect(counts.legendary / 20000).toBeLessThan(0.05);
    const owned = SPECIES.slice(0, 9).map((s) => s.id);
    for (let i = 0; i < 50; i++) expect(rollSpecies(owned, rand).id).toBe(SPECIES[9].id);
  });
});

describe('eggs', () => {
  beforeEach(() => useStore.setState(initialState()));
  const studyLesson = (xp: number) => {
    const s = useStore.getState();
    const k = dateKey();
    const day = s.activity[k] ?? { ms: 0, questions: 0, correct: 0, xp: 0, lessons: 0 };
    useStore.setState({ activity: { ...s.activity, [k]: { ...day, lessons: day.lessons + 1 } }, pet: { ...s.pet, xp: s.pet.xp + xp } });
  };
  it('starts as an egg that needs one lesson and 60 XP', () => {
    const e = eggOf(useStore.getState())!;
    expect(e.ready).toBe(false);
    expect(e.need).toEqual(EGG_NEEDS[0]);
    expect(petName(useStore.getState().pet)).toBe('your egg');
    expect(useStore.getState().hatchEgg()).toBeNull();
  });
  it('hatches into a random companion, names it, and starts the next egg from here', () => {
    studyLesson(40);
    expect(eggOf(useStore.getState())!.ready).toBe(false); // XP still short
    useStore.setState({ pet: { ...useStore.getState().pet, xp: 60 } });
    expect(eggOf(useStore.getState())!.ready).toBe(true);
    const id = useStore.getState().hatchEgg()!;
    const p = useStore.getState().pet;
    expect(SPECIES.map((s) => s.id)).toContain(id);
    expect(p.species).toBe(id);
    expect(p.name).toBe(SPECIES.find((s) => s.id === id)!.name);
    expect(p.collection).toHaveLength(1);
    const next = eggOf(useStore.getState())!;
    expect(next.need).toEqual(EGG_NEEDS[1]);
    expect(next.lessons).toBe(0);
    expect(next.xp).toBe(0);
    expect(totalLessons(useStore.getState())).toBe(1);
  });
  it('later hatches join the collection without replacing the active companion; switching keeps names', () => {
    studyLesson(60); const first = useStore.getState().hatchEgg()!;
    useStore.getState().renamePet('Biscuit');
    studyLesson(100); studyLesson(100);
    const second = useStore.getState().hatchEgg()!;
    expect(second).not.toBe(first);
    expect(useStore.getState().pet.species).toBe(first);
    useStore.getState().setCompanion(second);
    expect(useStore.getState().pet.species).toBe(second);
    useStore.getState().setCompanion(first);
    expect(useStore.getState().pet.name).toBe('Biscuit');
  });
  it('students from before eggs existed can hatch right away from their past study', () => {
    const s = initialState();
    const old = { ...s, pet: { ...s.pet, name: 'Lumi', xp: 500, egg: undefined }, activity: { '2026-01-02': { ms: 0, questions: 10, correct: 8, xp: 500, lessons: 3 } } };
    useStore.setState(old);
    expect(eggOf(useStore.getState())!.ready).toBe(true);
    const id = useStore.getState().hatchEgg()!;
    expect(useStore.getState().pet.name).toBe(SPECIES.find((x) => x.id === id)!.name); // the old default name is replaced
  });
});
