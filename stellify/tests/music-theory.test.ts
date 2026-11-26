import { describe, expect, it } from 'vitest';
import type { Key } from '@/lib/music/theory';
import {
  checkSatb, chord, concertPitch, degreeOf, diatonicChord, errorsOnly, fifthsOf, identify, invert, isConsonant, ivName, keyFromFifths, matchesChord,
  measureBeats, melodicDown, meterOf, midi, parseRoman, pc, relative, romanOf, scale, show, sigAccidentals, simpleName, spell, transpose, durBeats,
} from '@/lib/music/theory';

const names = (ps: { L: number; acc: number; oct: number }[]) => ps.map((p) => spell(p));

describe('pitches', () => {
  it('parses and spells', () => {
    expect(spell('F#4')).toBe('F#4');
    expect(spell('B♭3')).toBe('Bb3');
    expect(spell('Fx5')).toBe('F##5');
    expect(show('Eb4')).toBe('E♭4');
    expect(midi('C4')).toBe(60);
    expect(midi('A4')).toBe(69);
    expect(midi('B#3')).toBe(60);
    expect(midi('Cb4')).toBe(59);
  });
});

describe('intervals', () => {
  const cases: [string, string, string][] = [
    ['C4', 'E4', 'M3'], ['C4', 'Eb4', 'm3'], ['E4', 'C5', 'm6'], ['F4', 'B4', 'A4'], ['B4', 'F5', 'd5'], ['C4', 'G4', 'P5'], ['C4', 'C5', 'P8'],
    ['D4', 'C5', 'm7'], ['C4', 'B4', 'M7'], ['C#4', 'Bb4', 'd7'], ['Eb4', 'F#4', 'A2'], ['C4', 'D5', 'M9'], ['A3', 'C5', 'm10'], ['G4', 'G#4', 'A1'],
    ['Bb3', 'Eb4', 'P4'], ['F#4', 'C5', 'd5'], ['Ab4', 'F5', 'M6'], ['E4', 'D5', 'm7'], ['G#4', 'F5', 'd7'], ['C4', 'C#5', 'A8'],
  ];
  it.each(cases)('%s to %s is %s', (a, b, want) => { expect(ivName(a, b)).toBe(want); expect(ivName(b, a)).toBe(want); });
  it('transposes with correct spelling', () => {
    expect(spell(transpose('E4', 'm3'))).toBe('G4');
    expect(spell(transpose('F#4', 'M3'))).toBe('A#4');
    expect(spell(transpose('Bb4', 'P5'))).toBe('F5');
    expect(spell(transpose('D4', 'A6'))).toBe('B#4');
    expect(spell(transpose('C5', 'm6', true))).toBe('E4');
    expect(spell(transpose('G4', 'd7'))).toBe('Fb5');
  });
  it('inverts', () => {
    expect(invert('M3')).toBe('m6'); expect(invert('P4')).toBe('P5'); expect(invert('A4')).toBe('d5'); expect(invert('m2')).toBe('M7'); expect(invert('P1')).toBe('P8');
  });
  it('reduces compound intervals and classifies consonance', () => {
    expect(simpleName('M10')).toBe('M3'); expect(simpleName('P12')).toBe('P5'); expect(simpleName('P8')).toBe('P1');
    expect(isConsonant('P5')).toBe(true); expect(isConsonant('P4')).toBe(false); expect(isConsonant('m6')).toBe(true); expect(isConsonant('M2')).toBe(false); expect(isConsonant('P8')).toBe(true);
  });
});

describe('scales and keys', () => {
  it('spells scales', () => {
    expect(names(scale('D4'))).toEqual(['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5']);
    expect(names(scale('Eb4'))).toEqual(['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5', 'Eb5']);
    expect(names(scale('A4', 'natural'))).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5']);
    expect(names(scale('A4', 'harmonic'))).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G#5', 'A5']);
    expect(names(scale('A4', 'melodic'))).toEqual(['A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G#5', 'A5']);
    expect(names(melodicDown('A4'))).toEqual(['A5', 'G5', 'F5', 'E5', 'D5', 'C5', 'B4', 'A4']);
    expect(names(scale('C#4', 'harmonic'))).toEqual(['C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A4', 'B#4', 'C#5']);
    expect(names(scale('D4', 'dorian'))).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5']);
    expect(names(scale('F4', 'lydian'))).toEqual(['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5']);
    expect(names(scale('G4', 'mixolydian'))).toEqual(['G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']);
    expect(names(scale('E4', 'phrygian'))).toEqual(['E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5']);
    expect(names(scale('B4', 'locrian'))).toEqual(['B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5']);
  });
  it('knows every key signature', () => {
    const major = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
    const minor = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
    major.forEach((t, i) => { expect(fifthsOf({ tonic: t, mode: 'major' })).toBe(i - 7); expect(keyFromFifths(i - 7, 'major').tonic).toBe(t); });
    minor.forEach((t, i) => { expect(fifthsOf({ tonic: t, mode: 'minor' })).toBe(i - 7); expect(keyFromFifths(i - 7, 'minor').tonic).toBe(t); });
    expect(sigAccidentals(4)).toEqual(['F#', 'C#', 'G#', 'D#']);
    expect(sigAccidentals(-3)).toEqual(['Bb', 'Eb', 'Ab']);
    // every major key's signature matches its own scale
    for (let f = -7; f <= 7; f++) {
      const k = keyFromFifths(f, 'major');
      const accs = scale(k.tonic + '4').slice(0, 7).filter((p) => p.acc !== 0).map(pc).sort();
      expect(accs).toEqual([...sigAccidentals(f)].sort());
    }
  });
  it('relative keys and degrees', () => {
    expect(relative({ tonic: 'Eb', mode: 'major' })).toEqual({ tonic: 'C', mode: 'minor' });
    expect(relative({ tonic: 'F#', mode: 'minor' })).toEqual({ tonic: 'A', mode: 'major' });
    expect(degreeOf('B4', { tonic: 'C', mode: 'major' })).toBe(7);
    expect(degreeOf('G#4', { tonic: 'A', mode: 'minor' })).toBe(7);
    expect(degreeOf('F4', { tonic: 'A', mode: 'minor' })).toBe(6);
  });
});

describe('chords', () => {
  it('builds every quality', () => {
    expect(names(chord('D4', 'm'))).toEqual(['D4', 'F4', 'A4']);
    expect(names(chord('B4', 'd'))).toEqual(['B4', 'D5', 'F5']);
    expect(names(chord('C4', 'A'))).toEqual(['C4', 'E4', 'G#4']);
    expect(names(chord('G4', 'Mm7'))).toEqual(['G4', 'B4', 'D5', 'F5']);
    expect(names(chord('F4', 'MM7'))).toEqual(['F4', 'A4', 'C5', 'E5']);
    expect(names(chord('A4', 'mm7'))).toEqual(['A4', 'C5', 'E5', 'G5']);
    expect(names(chord('B4', 'hd7'))).toEqual(['B4', 'D5', 'F5', 'A5']);
    expect(names(chord('G#4', 'fd7'))).toEqual(['G#4', 'B4', 'D5', 'F5']);
  });
  it('identifies chords in any voicing', () => {
    expect(identify(['E3', 'C4', 'G4', 'C5'])).toMatchObject({ q: 'M', inversion: 1, figure: '6' });
    expect(identify(['G3', 'C4', 'E4'])).toMatchObject({ q: 'M', inversion: 2, figure: '64' });
    expect(identify(['F3', 'G3', 'B3', 'D4'])).toMatchObject({ q: 'Mm7', inversion: 3, figure: '42' });
    expect(identify(['D3', 'F3', 'G3', 'B3'])).toMatchObject({ q: 'Mm7', inversion: 2, figure: '43' });
    expect(identify(['B2', 'D3', 'F3', 'G3'])).toMatchObject({ q: 'Mm7', inversion: 1, figure: '65' });
    expect(identify(['C4', 'D4', 'E4'])).toBeNull();
    expect(pc(identify(['A3', 'C4', 'E4'])!.root)).toBe('A');
  });
  it('allows an incomplete chord without its fifth only', () => {
    expect(matchesChord(['G2', 'B3', 'F4', 'G4'], 'G4', 'Mm7')).toBe(true);
    expect(matchesChord(['G2', 'D4', 'F4', 'G4'], 'G4', 'Mm7')).toBe(false);
    expect(matchesChord(['C3', 'C4', 'E4', 'C5'], 'C4', 'M')).toBe(true);
  });
});

describe('Roman numerals', () => {
  const C = { tonic: 'C', mode: 'major' as const }, a = { tonic: 'A', mode: 'minor' as const }, Eb = { tonic: 'Eb', mode: 'major' as const };
  it('diatonic chord qualities in major and minor', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicChord(C, d).q)).toEqual(['M', 'm', 'm', 'M', 'M', 'm', 'd']);
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicChord(a, d).q)).toEqual(['m', 'd', 'M', 'm', 'M', 'M', 'd']);
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => diatonicChord(C, d, true).q)).toEqual(['MM7', 'mm7', 'mm7', 'MM7', 'Mm7', 'mm7', 'hd7']);
    expect(diatonicChord(a, 7, true).q).toBe('fd7');
  });
  it('reads and writes Roman numerals', () => {
    const r = (s: string, k: Key = C) => { const x = parseRoman(s, k); return names(chord(x.root, x.q)).map((n) => n.replace(/\d/, '')).join(' ') + ` inv${x.inversion}`; };
    expect(r('V7')).toBe('G B D F inv0');
    expect(r('ii65')).toBe('D F A C inv1');
    expect(r('viio7', a)).toBe('G# B D F inv0');
    expect(r('viiø7')).toBe('B D F A inv0');
    expect(r('V7/V')).toBe('D F# A C inv0');
    expect(r('viio7/V')).toBe('F# A C Eb inv0');
    expect(r('V65/ii')).toBe('A C# E G inv1');
    expect(r('iv6', a)).toBe('D F A inv1');
    expect(r('VI', a)).toBe('F A C inv0');
    expect(r('III', a)).toBe('C E G inv0');
    expect(r('VII', a)).toBe('G B D inv0');
    expect(r('IV7')).toBe('F A C E inv0');
    expect(r('V42', Eb)).toBe('Bb D F Ab inv3');
    expect(romanOf(['G2', 'B3', 'D4', 'F4'], C)).toBe('V7');
    expect(romanOf(['F3', 'A3', 'D4', 'D4'], C)).toBe('ii6');
    expect(romanOf(['G3', 'C4', 'E4'], C)).toBe('I64');
    expect(romanOf(['D3', 'F#3', 'A3', 'C4'], C)).toBe('V7/V');
    expect(romanOf(['F#3', 'A3', 'C4', 'Eb4'], C)).toBe('viio7/V');
    expect(romanOf(['E3', 'G#3', 'B3', 'D4'], a)).toBe('V7');
    expect(romanOf(['G#3', 'B3', 'D4', 'F4'], a)).toBe('viio7');
    expect(romanOf(['C3', 'E3', 'G3'], a)).toBe('III');
    expect(romanOf(['B2', 'D3', 'F3', 'A3'], a)).toBe('iiø7');
  });
});

describe('SATB checker', () => {
  const C = { tonic: 'C', mode: 'major' as const };
  it('accepts a clean I–IV–V–I', () => {
    const good = [{ S: 'G4', A: 'E4', T: 'C4', B: 'C3' }, { S: 'A4', A: 'F4', T: 'C4', B: 'F2' }, { S: 'G4', A: 'D4', T: 'B3', B: 'G2' }, { S: 'G4', A: 'E4', T: 'C4', B: 'C3' }];
    // and the classic mistake: a final tonic with no third
    expect(checkSatb([{ S: 'C5', A: 'G4', T: 'C4', B: 'C3' }], C, ['I']).some((e) => e.rule === 'third')).toBe(true);
    expect(errorsOnly(checkSatb(good, C, ['I', 'IV', 'V', 'I']))).toEqual([]);
  });
  it('finds parallel fifths and octaves', () => {
    const bad = [{ S: 'G4', A: 'E4', T: 'C4', B: 'C3' }, { S: 'A4', A: 'F4', T: 'C4', B: 'D3' }];
    const errs = errorsOnly(checkSatb(bad, C, ['I', 'ii']));
    expect(errs.some((e) => e.rule === 'parallels' && e.msg.includes('fifths'))).toBe(true);
    const oct = [{ S: 'C5', A: 'G4', T: 'E4', B: 'C3' }, { S: 'D5', A: 'A4', T: 'F4', B: 'D3' }];
    expect(errorsOnly(checkSatb(oct, C)).some((e) => e.rule === 'parallels' && e.msg.includes('octaves'))).toBe(true);
  });
  it('flags spacing, crossing, range, doubling and resolution errors', () => {
    const r = checkSatb([{ S: 'G5', A: 'E4', T: 'C4', B: 'C3' }], C, ['I']); expect(r.some((e) => e.rule === 'spacing')).toBe(true);
    expect(checkSatb([{ S: 'E4', A: 'G4', T: 'C4', B: 'C3' }], C, ['I']).some((e) => e.rule === 'crossing')).toBe(true);
    expect(checkSatb([{ S: 'C6', A: 'G5', T: 'E5', B: 'C4' }], C, ['I']).some((e) => e.rule === 'range')).toBe(true);
    expect(checkSatb([{ S: 'B4', A: 'G4', T: 'B3', B: 'G2' }], C, ['V']).some((e) => e.rule === 'doubling')).toBe(true);
    const lt = checkSatb([{ S: 'B4', A: 'G4', T: 'D4', B: 'G2' }, { S: 'G4', A: 'E4', T: 'C4', B: 'C3' }], C, ['V', 'I']);
    expect(lt.some((e) => e.rule === 'leading-tone' && e.level === 'error')).toBe(true);
    const sev = checkSatb([{ S: 'F5', A: 'B4', T: 'D4', B: 'G2' }, { S: 'G5', A: 'C5', T: 'E4', B: 'C3' }], C, ['V7', 'I']);
    expect(sev.some((e) => e.rule === 'seventh')).toBe(true);
    expect(checkSatb([{ S: 'E5', A: 'G4', T: 'C4', B: 'E3' }], C, ['I']).some((e) => e.rule === 'inversion')).toBe(true);
    expect(checkSatb([{ S: 'D5', A: 'G4', T: 'C4', B: 'C3' }], C, ['I']).some((e) => e.rule === 'spelling')).toBe(true);
  });
  it('flags direct octaves in the outer voices when the soprano leaps', () => {
    const r = checkSatb([{ S: 'E5', A: 'G4', T: 'C4', B: 'C3' }, { S: 'G5', A: 'B4', T: 'D4', B: 'G3' }], C, ['I', 'V']);
    expect(errorsOnly(r).some((e) => e.rule === 'direct')).toBe(true);
    // stepwise soprano into the octave is fine
    const ok = checkSatb([{ S: 'A4', A: 'F4', T: 'C4', B: 'F3' }, { S: 'G4', A: 'D4', T: 'B3', B: 'G2' }], C, ['IV', 'V']);
    expect(ok.some((e) => e.rule === 'direct')).toBe(false);
  });
  it('accepts a correct V7–I with an incomplete tonic', () => {
    const ok = [{ S: 'F5', A: 'B4', T: 'D4', B: 'G2' }, { S: 'E5', A: 'C5', T: 'C4', B: 'C3' }];
    expect(errorsOnly(checkSatb(ok, C, ['V7', 'I']))).toEqual([]);
  });
});

describe('rhythm, meter and transposition', () => {
  it('classifies meters', () => {
    expect(meterOf(6, 8)).toMatchObject({ kind: 'compound', type: 'duple', beatNote: 'dotted quarter' });
    expect(meterOf(3, 4)).toMatchObject({ kind: 'simple', type: 'triple', beatNote: 'quarter' });
    expect(meterOf(12, 8)).toMatchObject({ kind: 'compound', type: 'quadruple' });
    expect(meterOf(9, 8)).toMatchObject({ kind: 'compound', type: 'triple' });
    expect(meterOf(2, 2)).toMatchObject({ kind: 'simple', type: 'duple', beatNote: 'half' });
    expect(measureBeats(6, 8)).toBe(3);
    expect(durBeats('q', 1)).toBe(1.5);
    expect(durBeats('h', 2)).toBe(3.5);
  });
  it('transposes instruments to concert pitch', () => {
    expect(spell(concertPitch('D5', 'Bb clarinet'))).toBe('C5');
    expect(spell(concertPitch('G4', 'F horn'))).toBe('C4');
    expect(spell(concertPitch('A4', 'Eb alto saxophone'))).toBe('C4');
  });
});
