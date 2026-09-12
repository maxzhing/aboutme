/* Cadenza — MusicXML 4.0 (partwise) export. */

import { TPQ, measureTicks, eventTicks, durationInfo, computeBeams } from '../core/rhythm.js';
import { timeSigAt, keySigAt, tempoAt, clefAt, writtenFifths } from '../core/model.js';
import { STEP_NAMES, CLEFS, staffPos, keyAlterations, neededAccidental } from '../core/theory.js';
import { getInstrument } from '../core/instruments.js';
import { DYNAMIC_BY_ID } from '../engrave/glyphs.js';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const TYPE_NAMES = {
  breve: 'breve', whole: 'whole', half: 'half', quarter: 'quarter', eighth: 'eighth',
  '16th': '16th', '32nd': '32nd', '64th': '64th', '128th': '128th',
};
const ACC_NAMES = {
  '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp',
};
const ARTIC_TAGS = {
  staccato: 'staccato', staccatissimo: 'staccatissimo', tenuto: 'tenuto',
  accent: 'accent', marcato: 'strong-accent',
};
const ORN_TAGS = {
  trill: 'trill-mark', mordent: 'inverted-mordent', mordentLower: 'mordent', turn: 'turn',
};

export function exportMusicXML(score) {
  const L = [];
  L.push('<?xml version="1.0" encoding="UTF-8"?>');
  L.push('<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">');
  L.push('<score-partwise version="4.0">');
  if (score.title) L.push(`  <work><work-title>${esc(score.title)}</work-title></work>`);
  L.push('  <identification>');
  if (score.composer) L.push(`    <creator type="composer">${esc(score.composer)}</creator>`);
  if (score.lyricist) L.push(`    <creator type="lyricist">${esc(score.lyricist)}</creator>`);
  if (score.copyright) L.push(`    <rights>${esc(score.copyright)}</rights>`);
  L.push('    <encoding>');
  L.push('      <software>Cadenza</software>');
  L.push(`      <encoding-date>${new Date().toISOString().slice(0, 10)}</encoding-date>`);
  L.push('    </encoding>');
  L.push('  </identification>');
  if (score.subtitle || score.title) {
    L.push('  <credit page="1">');
    L.push(`    <credit-type>title</credit-type><credit-words>${esc(score.title)}</credit-words>`);
    L.push('  </credit>');
  }

  L.push('  <part-list>');
  score.parts.forEach((part, i) => {
    const id = 'P' + (i + 1);
    const inst = getInstrument(part.instrumentId);
    L.push(`    <score-part id="${id}">`);
    L.push(`      <part-name>${esc(part.name)}</part-name>`);
    L.push(`      <part-abbreviation>${esc(part.abbrev)}</part-abbreviation>`);
    L.push(`      <score-instrument id="${id}-I1"><instrument-name>${esc(part.name)}</instrument-name></score-instrument>`);
    L.push(`      <midi-instrument id="${id}-I1">`);
    L.push(`        <midi-channel>${inst.pitched === false ? 10 : Math.min(16, i + 1)}</midi-channel>`);
    L.push(`        <midi-program>${(part.program || 0) + 1}</midi-program>`);
    L.push(`        <volume>${Math.round((part.volume ?? 0.8) * 100)}</volume>`);
    L.push(`        <pan>${Math.round((part.pan || 0) * 90)}</pan>`);
    L.push('      </midi-instrument>');
    L.push('    </score-part>');
  });
  L.push('  </part-list>');

  score.parts.forEach((part, pi) => {
    L.push(`  <part id="P${pi + 1}">`);
    for (let m = 0; m < part.measures.length; m++) {
      L.push(...measureXML(score, part, pi, m));
    }
    L.push('  </part>');
  });
  L.push('</score-partwise>');
  return L.join('\n');
}

function measureXML(score, part, pi, m) {
  const L = [];
  const spec = score.measures[m] || {};
  const ts = timeSigAt(score, m);
  const key = keySigAt(score, m);
  const prevTs = m > 0 ? timeSigAt(score, m - 1) : null;
  const prevKey = m > 0 ? keySigAt(score, m - 1) : null;
  const staves = part.staves || 1;
  L.push(`    <measure number="${m + 1}">`);

  const attrs = [];
  if (m === 0) attrs.push(`        <divisions>${TPQ}</divisions>`);
  if (m === 0 || (spec.keySig && (!prevKey || prevKey.fifths !== key.fifths))) {
    attrs.push(`        <key><fifths>${key.fifths}</fifths><mode>${key.mode || 'major'}</mode></key>`);
  }
  if (m === 0 || (spec.timeSig && (!prevTs || prevTs.beats !== ts.beats || prevTs.beatType !== ts.beatType))) {
    const sym = ts.symbol === 'common' ? ' symbol="common"' : ts.symbol === 'cut' ? ' symbol="cut"' : '';
    attrs.push(`        <time${sym}><beats>${ts.beats}</beats><beat-type>${ts.beatType}</beat-type></time>`);
  }
  if (m === 0 && staves > 1) attrs.push(`        <staves>${staves}</staves>`);
  for (let s = 0; s < staves; s++) {
    const clefId = clefAt(score, part, m, s);
    const changed = m === 0 || (part.measures[m].clefChange && part.measures[m].clefChange[s]);
    if (!changed) continue;
    const c = CLEFS[clefId] || CLEFS.treble;
    const num = staves > 1 ? ` number="${s + 1}"` : '';
    const oct = c.octave ? `<clef-octave-change>${c.octave}</clef-octave-change>` : '';
    attrs.push(`        <clef${num}><sign>${c.sign === 'perc' ? 'percussion' : c.sign}</sign><line>${c.line}</line>${oct}</clef>`);
  }
  if (m === 0 && part.transpose && (part.transpose.chromatic || part.transpose.diatonic)) {
    attrs.push('        <transpose>');
    attrs.push(`          <diatonic>${part.transpose.diatonic || 0}</diatonic>`);
    attrs.push(`          <chromatic>${part.transpose.chromatic || 0}</chromatic>`);
    attrs.push('        </transpose>');
  }
  if (attrs.length) { L.push('      <attributes>'); L.push(...attrs); L.push('      </attributes>'); }

  if (spec.barline === 'repeat-start' || spec.barline === 'repeat-both') {
    L.push('      <barline location="left"><bar-style>heavy-light</bar-style><repeat direction="forward"/></barline>');
  }
  if (spec.rehearsal) {
    L.push('      <direction placement="above"><direction-type>' +
      `<rehearsal>${esc(spec.rehearsal)}</rehearsal></direction-type></direction>`);
  }
  if (spec.tempo) {
    const t = spec.tempo;
    L.push('      <direction placement="above">');
    L.push('        <direction-type><metronome>' +
      `<beat-unit>${t.unit && t.unit.replace('.', '') || 'quarter'}</beat-unit>` +
      (String(t.unit).endsWith('.') ? '<beat-unit-dot/>' : '') +
      `<per-minute>${Math.round(t.bpm)}</per-minute></metronome></direction-type>`);
    if (t.text) L.push(`        <direction-type><words font-weight="bold">${esc(t.text)}</words></direction-type>`);
    L.push(`        <sound tempo="${Math.round(t.bpm)}"/>`);
    L.push('      </direction>');
  }

  const pm = part.measures[m];
  const full = measureTicks(ts);
  for (let v = 0; v < pm.voices.length; v++) {
    if (v > 0) L.push(`      <backup><duration>${full}</duration></backup>`);
    const voice = pm.voices[v];
    const beams = computeBeams(voice.filter((e) => !e.grace), ts);
    const beamOf = new Map();
    beams.forEach((g) => g.forEach((idx, k) => beamOf.set(idx, k === 0 ? 'begin' : k === g.length - 1 ? 'end' : 'continue')));
    const accState = {};
    const fifths = writtenFifths(score, part, m);
    let realIndex = 0;
    const staffNum = staves > 1 ? (v % 2) + 1 : null;
    for (const ev of voice) {
      L.push(...noteXML(score, part, ev, v, staffNum, beamOf.get(realIndex), accState, fifths, m));
      if (!ev.grace) realIndex++;
    }
  }

  const style = {
    double: 'light-light', final: 'light-heavy', 'repeat-end': 'light-heavy',
    'repeat-both': 'light-heavy', dashed: 'dashed',
  }[spec.barline];
  if (style) {
    const rep = spec.barline === 'repeat-end' || spec.barline === 'repeat-both'
      ? '<repeat direction="backward"/>' : '';
    L.push(`      <barline location="right"><bar-style>${style}</bar-style>${rep}</barline>`);
  }
  L.push('    </measure>');
  return L;
}

function noteXML(score, part, ev, voice, staffNum, beam, accState, fifths, m) {
  const L = [];
  /* A cross-staff note names the staff it is written on, not its voice's. */
  const evStaff = ev.staff !== null && ev.staff !== undefined ? ev.staff + 1 : staffNum;
  const info = durationInfo(ev.duration);
  const dur = eventTicks(ev);
  const type = TYPE_NAMES[ev.duration] || 'quarter';
  const clef = clefAt(score, part, m, staffNum ? staffNum - 1 : 0);

  const emit = (inner) => {
    L.push('      <note>');
    L.push(...inner.map((x) => '        ' + x));
    L.push('      </note>');
  };

  if (ev.type === 'rest') {
    const inner = [];
    if (ev.fullMeasure) inner.push('<rest measure="yes"/>'); else inner.push('<rest/>');
    inner.push(`<duration>${dur}</duration>`);
    inner.push(`<voice>${voice + 1}</voice>`);
    inner.push(`<type>${type}</type>`);
    for (let d = 0; d < (ev.dots || 0); d++) inner.push('<dot/>');
    if (ev.tuplet) {
      inner.push('<time-modification>');
      inner.push(`  <actual-notes>${ev.tuplet.actual}</actual-notes>`);
      inner.push(`  <normal-notes>${ev.tuplet.normal}</normal-notes>`);
      inner.push('</time-modification>');
    }
    if (evStaff) inner.push(`<staff>${evStaff}</staff>`);
    emit(inner);
    return L;
  }

  const dynamics = [];
  for (const sp of score.spanners || []) {
    if (sp.type !== 'cresc' && sp.type !== 'dim') continue;
    if (sp.fromId === ev.id) {
      dynamics.push('      <direction placement="below"><direction-type>' +
        `<wedge type="${sp.type === 'cresc' ? 'crescendo' : 'diminuendo'}"/></direction-type></direction>`);
    }
    if (sp.toId === ev.id) {
      dynamics.push('      <direction placement="below"><direction-type>' +
        '<wedge type="stop"/></direction-type></direction>');
    }
  }
  if (ev.dynamic) {
    dynamics.push('      <direction placement="below"><direction-type><dynamics>' +
      `<${ev.dynamic}/></dynamics></direction-type></direction>`);
  }
  for (const t of ev.texts || []) {
    dynamics.push(`      <direction placement="${t.placement === 'below' ? 'below' : 'above'}">` +
      `<direction-type><words>${esc(t.content)}</words></direction-type></direction>`);
  }
  L.push(...dynamics);
  if (ev.figures && ev.figures.length) {
    L.push('      <figured-bass>');
    for (const f of ev.figures) {
      const m = /^([#b\u266f\u266d\u266e n+-]*)(\d*)(.*)$/.exec(String(f)) || [];
      const prefix = { '#': 'sharp', '+': 'sharp', b: 'flat', '-': 'flat', n: 'natural',
        '\u266f': 'sharp', '\u266d': 'flat', '\u266e': 'natural' }[(m[1] || '').trim()];
      L.push('        <figure>');
      if (prefix) L.push(`          <prefix>${prefix}</prefix>`);
      if (m[2]) L.push(`          <figure-number>${m[2]}</figure-number>`);
      L.push('        </figure>');
    }
    L.push('      </figured-bass>');
  }
  if (ev.chordSymbol) {
    L.push(`      <harmony><root><root-step>${esc(ev.chordSymbol[0])}</root-step></root><kind text="${esc(ev.chordSymbol.slice(1))}">other</kind></harmony>`);
  }

  ev.notes.forEach((n, ni) => {
    const inner = [];
    if (ni > 0) inner.push('<chord/>');
    if (ev.grace) inner.push(ev.grace.slash ? '<grace slash="yes"/>' : '<grace/>');
    inner.push('<pitch>');
    inner.push(`  <step>${STEP_NAMES[n.pitch.step]}</step>`);
    if (n.pitch.alter) inner.push(`  <alter>${n.pitch.alter}</alter>`);
    inner.push(`  <octave>${n.pitch.octave}</octave>`);
    inner.push('</pitch>');
    if (!ev.grace) inner.push(`<duration>${dur}</duration>`);
    const tieStart = n.tie === 'start' || n.tie === 'both';
    const tieStop = n.tie === 'stop' || n.tie === 'both';
    if (tieStop) inner.push('<tie type="stop"/>');
    if (tieStart) inner.push('<tie type="start"/>');
    inner.push(`<voice>${voice + 1}</voice>`);
    inner.push(`<type>${type}</type>`);
    for (let d = 0; d < (ev.dots || 0); d++) inner.push('<dot/>');
    const alter = neededAccidental(n.pitch, fifths, accState, n.accidental === 'show' ? 'show' : n.accidental === 'none' ? 'none' : null);
    if (alter !== null && ACC_NAMES[String(alter)]) inner.push(`<accidental>${ACC_NAMES[String(alter)]}</accidental>`);
    if (ev.tuplet) {
      inner.push('<time-modification>');
      inner.push(`  <actual-notes>${ev.tuplet.actual}</actual-notes>`);
      inner.push(`  <normal-notes>${ev.tuplet.normal}</normal-notes>`);
      inner.push('</time-modification>');
    }
    if (ev.stemDir && ev.stemDir !== 'auto') inner.push(`<stem>${ev.stemDir}</stem>`);
    if (evStaff) inner.push(`<staff>${evStaff}</staff>`);
    if (beam && ni === 0 && info.beams > 0) inner.push(`<beam number="1">${beam}</beam>`);

    const notations = [];
    if (tieStop) notations.push('  <tied type="stop"/>');
    if (tieStart) notations.push('  <tied type="start"/>');
    const slur = (score.spanners || []).find((s) => s.type === 'slur' && (s.fromId === ev.id || s.toId === ev.id));
    if (slur && ni === 0) notations.push(`  <slur type="${slur.fromId === ev.id ? 'start' : 'stop'}" number="1"/>`);
    const arts = (ev.articulations || []).filter((a) => ARTIC_TAGS[a]);
    if (arts.length) {
      notations.push('  <articulations>');
      for (const a of arts) notations.push(`    <${ARTIC_TAGS[a]}/>`);
      notations.push('  </articulations>');
    }
    if ((ev.articulations || []).includes('fermata')) notations.push('  <fermata/>');
    const orns = (ev.ornaments || []).filter((o) => ORN_TAGS[o]);
    if (orns.length || ev.tremolo) {
      notations.push('  <ornaments>');
      for (const o of orns) notations.push(`    <${ORN_TAGS[o]}/>`);
      if (ev.tremolo) notations.push(`    <tremolo type="single">${ev.tremolo}</tremolo>`);
      notations.push('  </ornaments>');
    }
    if (ev.arpeggio && ni === 0) notations.push('  <arpeggiate/>');
    if (ev.tuplet) {
      notations.push('  <tuplet type="start" bracket="yes"/>');
    }
    const fing = (ev.fingerings || []).find((f) => f.note === ni);
    if (fing) notations.push(`  <technical><fingering>${esc(fing.text)}</fingering></technical>`);
    if (notations.length) {
      inner.push('<notations>');
      inner.push(...notations);
      inner.push('</notations>');
    }
    if (ni === 0) {
      for (const l of ev.lyrics || []) {
        inner.push(`<lyric number="${(l.verse || 0) + 1}">`);
        inner.push(`  <syllabic>${l.syllabic || 'single'}</syllabic>`);
        inner.push(`  <text>${esc(l.text)}</text>`);
        inner.push('</lyric>');
      }
    }
    emit(inner);
  });
  return L;
}
