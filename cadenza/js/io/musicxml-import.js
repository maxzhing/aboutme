/* Cadenza — MusicXML import.
 *
 * Reads score-partwise documents produced by other notation software.  The
 * tricky parts are the timeline (MusicXML is a sequential stream with backup
 * and forward, while Cadenza stores parallel voices) and voice-to-staff
 * assignment, both handled below.
 */

import {
  makeScore, makeMeasureSpec, makePart, makeNote, makeRest, normalizeScore, autoScale, newId
} from '../core/model.js';
import { pitch, STEP_NAMES } from '../core/theory.js';
import { TPQ, durationForTicks, splitIntoDurations } from '../core/rhythm.js';
import { INSTRUMENTS, getInstrument } from '../core/instruments.js';

const TYPE_TICKS = {
  breve: TPQ * 8, whole: TPQ * 4, half: TPQ * 2, quarter: TPQ, eighth: TPQ / 2,
  '16th': TPQ / 4, '32nd': TPQ / 8, '64th': TPQ / 16, '128th': TPQ / 32,
};
const TYPE_IDS = {
  breve: 'breve', whole: 'whole', half: 'half', quarter: 'quarter', eighth: 'eighth',
  '16th': '16th', '32nd': '32nd', '64th': '64th', '128th': '128th',
};
const ARTIC_FROM_XML = {
  staccato: 'staccato', staccatissimo: 'staccatissimo', tenuto: 'tenuto',
  accent: 'accent', 'strong-accent': 'marcato',
};
const ORN_FROM_XML = {
  'trill-mark': 'trill', 'inverted-mordent': 'mordent', mordent: 'mordentLower', turn: 'turn',
};
const BARLINE_FROM_XML = {
  'light-light': 'double', 'light-heavy': 'final', dashed: 'dashed', heavy: 'final',
};
const DYNAMIC_TAGS = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff',
  'sf', 'sfz', 'sffz', 'fp', 'rfz'];

const text = (el, tag) => {
  const n = el && el.getElementsByTagName(tag)[0];
  return n ? n.textContent.trim() : null;
};
const num = (el, tag, dflt = null) => {
  const t = text(el, tag);
  return t === null || t === '' ? dflt : Number(t);
};
/** Direct children only — `getElementsByTagName` would reach into grandchildren. */
const kids = (el, tag) => [...el.children].filter((c) => c.tagName === tag);

export function looksCompressed(data) {
  return typeof data === 'string' && data.slice(0, 2) === 'PK';
}

/** Parse a MusicXML document into a Cadenza score. */
export function importMusicXML(source) {
  if (looksCompressed(source)) {
    throw new Error('Compressed MusicXML (.mxl) is not supported — export or re-save as uncompressed .musicxml.');
  }
  const doc = new DOMParser().parseFromString(source, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('That file is not valid XML.');
  const root = doc.documentElement;
  if (root.tagName === 'score-timewise') {
    throw new Error('Timewise MusicXML is not supported — please use the partwise format.');
  }
  if (root.tagName !== 'score-partwise') throw new Error('Not a MusicXML score.');

  const score = makeScore({
    title: text(root, 'work-title') || text(root, 'movement-title') || 'Imported Score',
    subtitle: text(root, 'movement-subtitle') || '',
  });
  for (const c of root.getElementsByTagName('creator')) {
    const type = c.getAttribute('type');
    if (type === 'composer') score.composer = c.textContent.trim();
    if (type === 'lyricist' || type === 'poet') score.lyricist = c.textContent.trim();
  }
  const rights = root.getElementsByTagName('rights')[0];
  if (rights) score.copyright = rights.textContent.trim();

  const partEls = [...root.getElementsByTagName('part')];
  if (!partEls.length) throw new Error('The file contains no parts.');
  const partList = root.getElementsByTagName('part-list')[0];
  const info = new Map();
  if (partList) {
    for (const sp of partList.getElementsByTagName('score-part')) {
      info.set(sp.getAttribute('id'), {
        name: text(sp, 'part-name') || '',
        abbrev: text(sp, 'part-abbreviation') || '',
        program: num(sp, 'midi-program', null),
        volume: num(sp, 'volume', null),
        pan: num(sp, 'pan', null),
      });
    }
  }

  /* How many measures the longest part has. */
  const measureCount = Math.max(...partEls.map((p) => p.getElementsByTagName('measure').length));
  for (let i = 0; i < measureCount; i++) score.measures.push(makeMeasureSpec());

  const spanners = [];
  partEls.forEach((partEl, pi) => {
    const meta = info.get(partEl.getAttribute('id')) || {};
    const part = buildPart(score, partEl, meta, measureCount, pi, spanners);
    score.parts.push(part);
  });
  score.spanners = spanners;

  if (!score.measures[0].timeSig) score.measures[0].timeSig = { beats: 4, beatType: 4, symbol: null };
  if (!score.measures[0].keySig) score.measures[0].keySig = { fifths: 0, mode: 'major' };
  const t0 = score.measures.find((m) => m.tempo);
  score.tempo = t0 ? t0.tempo.bpm : 96;
  score.autoSize = true;
  autoScale(score);
  normalizeScore(score);
  return score;
}

/* ----------------------------------------------------------------- parts */

function buildPart(score, partEl, meta, measureCount, partIndex, spanners) {
  const measures = [...partEl.getElementsByTagName('measure')];
  const probe = probePart(measures, meta);
  const instId = matchInstrument(meta, probe);
  const inst = getInstrument(instId);
  const part = makePart(instId, measureCount);
  if (meta.name) part.name = meta.name;
  if (meta.abbrev) part.abbrev = meta.abbrev;
  if (meta.program !== null && meta.program !== undefined) part.program = Math.max(0, meta.program - 1);
  if (meta.volume !== null && meta.volume !== undefined) part.volume = Math.max(0, Math.min(1, meta.volume / 100));
  if (meta.pan !== null && meta.pan !== undefined) part.pan = Math.max(-1, Math.min(1, meta.pan / 90));
  part.staves = probe.staves;
  if (probe.staves > 1 && !part.clef2) part.clef2 = 'bass';
  if (probe.transpose) part.transpose = probe.transpose;

  let divisions = 480;
  /* A MusicXML voice keeps its identity even when it crosses staves, so its
   * home staff is whichever one it spends most of its time on. */
  const homeStaff = voiceHomeStaves(measures, part.staves);
  const voiceMap = new Map();          // MusicXML voice -> our voice index
  const perStaffCount = [0, 0, 0, 0];
  const assignVoice = (voice) => {
    if (voiceMap.has(voice)) return voiceMap.get(voice);
    const st = Math.max(0, Math.min(part.staves - 1, (homeStaff.get(voice) || 1) - 1));
    /* Even slots belong to the upper staff, odd to the lower. */
    const idx = st + perStaffCount[st] * 2;
    perStaffCount[st]++;
    voiceMap.set(voice, Math.min(7, idx));
    return voiceMap.get(voice);
  };

  const openSlurs = new Map();
  const openWedges = [];
  let lastEvent = null;

  measures.forEach((mEl, mIdx) => {
    if (mIdx >= measureCount) return;
    const pm = part.measures[mIdx];
    const spec = score.measures[mIdx];
    const lanes = new Map();           // our voice index -> { events, pos }
    const lane = (v) => {
      if (!lanes.has(v)) lanes.set(v, { events: [], pos: 0 });
      return lanes.get(v);
    };
    let cursor = 0;                    // ticks from the start of the measure
    let pendingDynamic = null;
    let pendingTexts = [];
    let prevInLane = new Map();

    for (const el of mEl.children) {
      switch (el.tagName) {
        case 'attributes': {
          const d = num(el, 'divisions', null);
          if (d) divisions = d;
          readAttributes(score, part, el, mIdx, divisions);
          break;
        }
        case 'backup':
          cursor = Math.max(0, cursor - toTicks(num(el, 'duration', 0), divisions));
          break;
        case 'forward':
          cursor += toTicks(num(el, 'duration', 0), divisions);
          break;
        case 'direction': {
          const res = readDirection(score, el, mIdx, divisions);
          if (res.dynamic) pendingDynamic = res.dynamic;
          if (res.text) pendingTexts.push(res.text);
          if (res.wedge === 'stop') {
            const open = openWedges.pop();
            if (open && lastEvent) spanners.push({ id: newId('s'), type: open.type, partId: part.id, fromId: open.eventId, toId: lastEvent.id, placement: 'below' });
          } else if (res.wedge) {
            openWedges.push({ type: res.wedge, eventId: null, pending: true });
          }
          break;
        }
        case 'barline': {
          const style = text(el, 'bar-style');
          const repeat = el.getElementsByTagName('repeat')[0];
          if (repeat) {
            const dir = repeat.getAttribute('direction');
            if (dir === 'forward') spec.barline = spec.barline === 'repeat-end' ? 'repeat-both' : 'repeat-start';
            else spec.barline = spec.barline === 'repeat-start' ? 'repeat-both' : 'repeat-end';
          } else if (style && BARLINE_FROM_XML[style]) {
            spec.barline = BARLINE_FROM_XML[style];
          }
          break;
        }
        case 'note': {
          const isChord = !!el.getElementsByTagName('chord')[0];
          const isGrace = !!el.getElementsByTagName('grace')[0];
          const staff = num(el, 'staff', 1);
          const voiceNo = text(el, 'voice') || '1';
          const v = assignVoice(voiceNo);
          const L = lane(v);
          const dur = isGrace ? 0 : toTicks(num(el, 'duration', 0), divisions);

          if (isChord) {
            const prev = prevInLane.get(v);
            if (prev && prev.type === 'note') {
              const p = readPitch(el);
              if (p) prev.notes.push({ pitch: p, tie: readTie(el), accidental: 'auto', head: 'normal', parenthesized: false });
            }
            break;
          }
          /* Fill any hole this voice has left behind. */
          if (cursor > L.pos) {
            for (const d of splitIntoDurations(cursor - L.pos, L.pos, currentTimeSig(score, mIdx))) {
              L.events.push(makeRest(d.id, { dots: d.dots }));
            }
            L.pos = cursor;
          }
          const ev = readNote(el, dur, divisions);
          if (!ev) break;
          if (part.staves > 1) {
            const home = Math.max(0, Math.min(part.staves - 1, (homeStaff.get(voiceNo) || 1) - 1));
            const written = Math.max(0, Math.min(part.staves - 1, staff - 1));
            if (written !== home) ev.staff = written;
          }
          if (pendingDynamic) { ev.dynamic = pendingDynamic; pendingDynamic = null; }
          if (pendingTexts.length) { ev.texts.push(...pendingTexts); pendingTexts = []; }
          for (const w of openWedges) if (w.pending) { w.eventId = ev.id; w.pending = false; }
          readNotations(el, ev, openSlurs, spanners, part);
          L.events.push(ev);
          prevInLane.set(v, ev);
          lastEvent = ev;
          if (!isGrace) { L.pos += dur; cursor += dur; }
          break;
        }
        default:
          break;
      }
    }

    const used = [...lanes.keys()].sort((a, b) => a - b);
    pm.voices = [];
    const maxVoice = used.length ? Math.max(...used) : 0;
    for (let v = 0; v <= maxVoice; v++) {
      pm.voices.push(lanes.has(v) ? lanes.get(v).events : []);
    }
    if (!pm.voices.length) pm.voices = [[]];
  });

  return part;
}

/** For each MusicXML voice, the staff it appears on most often. */
function voiceHomeStaves(measures, staffCount) {
  const tally = new Map();
  for (const m of measures) {
    for (const n of m.getElementsByTagName('note')) {
      const v = text(n, 'voice') || '1';
      const st = num(n, 'staff', 1);
      if (!tally.has(v)) tally.set(v, new Map());
      const t = tally.get(v);
      t.set(st, (t.get(st) || 0) + 1);
    }
  }
  const home = new Map();
  for (const [v, t] of tally) {
    let best = 1;
    let bestN = -1;
    for (const [st, n] of t) if (n > bestN) { bestN = n; best = st; }
    home.set(v, Math.max(1, Math.min(staffCount, best)));
  }
  return home;
}

function currentTimeSig(score, mIdx) {
  for (let i = Math.min(mIdx, score.measures.length - 1); i >= 0; i--) {
    if (score.measures[i] && score.measures[i].timeSig) return score.measures[i].timeSig;
  }
  return { beats: 4, beatType: 4, symbol: null };
}

const GRID = TPQ / 32;   // a 128th note: the finest value Cadenza notates

function toTicks(duration, divisions) {
  if (!divisions) return 0;
  const raw = (duration * TPQ) / divisions;
  /* Snap to the notatable grid so bars always add up exactly. */
  return Math.round(raw / GRID) * GRID;
}

/* ------------------------------------------------------------- elements */

function readAttributes(score, part, el, mIdx, divisions) {
  const spec = score.measures[mIdx];
  const key = el.getElementsByTagName('key')[0];
  if (key) {
    const fifths = num(key, 'fifths', 0);
    spec.keySig = { fifths: Math.max(-7, Math.min(7, fifths)), mode: text(key, 'mode') || 'major' };
  }
  const time = el.getElementsByTagName('time')[0];
  if (time) {
    const beats = num(time, 'beats', 4);
    const beatType = num(time, 'beat-type', 4);
    const symbol = time.getAttribute('symbol');
    spec.timeSig = {
      beats, beatType,
      symbol: symbol === 'common' || symbol === 'cut' ? symbol : null,
    };
  }
  const staves = num(el, 'staves', null);
  if (staves && staves > part.staves) part.staves = Math.min(4, staves);
  for (const clefEl of el.getElementsByTagName('clef')) {
    const n = Number(clefEl.getAttribute('number') || 1);
    const id = clefIdFor(text(clefEl, 'sign'), num(clefEl, 'line', null), num(clefEl, 'clef-octave-change', 0));
    if (!id) continue;
    const staffIdx = Math.max(0, n - 1);
    if (mIdx === 0) {
      if (staffIdx === 0) part.clef = id; else part.clef2 = id;
    } else {
      const pm = part.measures[mIdx];
      pm.clefChange = pm.clefChange || {};
      pm.clefChange[staffIdx] = id;
    }
  }
}

function clefIdFor(sign, line, octave) {
  if (!sign) return null;
  if (sign === 'percussion') return 'percussion';
  if (sign === 'G') return octave === -1 ? 'treble8vb' : octave === 1 ? 'treble8va' : 'treble';
  if (sign === 'F') {
    if (octave === -1) return 'bass8vb';
    return line === 3 ? 'baritone' : 'bass';
  }
  if (sign === 'C') {
    return line === 1 ? 'soprano' : line === 2 ? 'mezzo' : line === 4 ? 'tenor' : 'alto';
  }
  return null;
}

function readDirection(score, el, mIdx, divisions) {
  const out = {};
  const spec = score.measures[mIdx];
  for (const dt of el.getElementsByTagName('direction-type')) {
    const dyn = dt.getElementsByTagName('dynamics')[0];
    if (dyn) {
      for (const tag of DYNAMIC_TAGS) {
        if (dyn.getElementsByTagName(tag).length) { out.dynamic = tag; break; }
      }
    }
    const wedge = dt.getElementsByTagName('wedge')[0];
    if (wedge) {
      const type = wedge.getAttribute('type');
      out.wedge = type === 'crescendo' ? 'cresc' : type === 'diminuendo' ? 'dim' : 'stop';
    }
    const metro = dt.getElementsByTagName('metronome')[0];
    if (metro) {
      const unit = text(metro, 'beat-unit') || 'quarter';
      const dotted = metro.getElementsByTagName('beat-unit-dot').length > 0;
      const per = num(metro, 'per-minute', null);
      if (per) spec.tempo = { bpm: per, unit: unit + (dotted ? '.' : ''), text: spec.tempo ? spec.tempo.text : null };
    }
    const words = dt.getElementsByTagName('words')[0];
    if (words) {
      const content = words.textContent.trim();
      if (content) {
        if (spec.tempo && !spec.tempo.text && /^[A-Z]/.test(content) && content.length < 28) spec.tempo.text = content;
        else out.text = { content, style: 'expression', placement: el.getAttribute('placement') === 'above' ? 'above' : 'below' };
      }
    }
    const rehearsal = dt.getElementsByTagName('rehearsal')[0];
    if (rehearsal) spec.rehearsal = rehearsal.textContent.trim();
  }
  const sound = el.getElementsByTagName('sound')[0];
  if (sound && sound.getAttribute('tempo')) {
    const bpm = Number(sound.getAttribute('tempo'));
    if (bpm) spec.tempo = { bpm, unit: 'quarter', text: spec.tempo ? spec.tempo.text : null };
  }
  return out;
}

function readPitch(el) {
  const p = el.getElementsByTagName('pitch')[0];
  if (!p) return null;
  const step = STEP_NAMES.indexOf((text(p, 'step') || 'C').toUpperCase());
  const octave = num(p, 'octave', 4);
  const alter = num(p, 'alter', 0) || 0;
  if (step < 0) return null;
  return pitch(step, octave, Math.max(-2, Math.min(2, Math.round(alter))));
}

function readTie(el) {
  const ties = [...el.getElementsByTagName('tie')].map((t) => t.getAttribute('type'));
  const start = ties.includes('start');
  const stop = ties.includes('stop');
  return start && stop ? 'both' : start ? 'start' : stop ? 'stop' : null;
}

function readNote(el, ticks, divisions) {
  const isRest = !!el.getElementsByTagName('rest')[0];
  const isGrace = !!el.getElementsByTagName('grace')[0];
  const typeName = text(el, 'type');
  const dots = el.getElementsByTagName('dot').length;
  const tm = el.getElementsByTagName('time-modification')[0];
  let tuplet = null;
  if (tm) {
    const actual = num(tm, 'actual-notes', 3);
    const normal = num(tm, 'normal-notes', 2);
    if (actual && normal && actual !== normal) tuplet = { id: 't' + actual + ':' + normal, actual, normal, bracket: true, number: true };
  }

  /* Prefer the written type; fall back to the sounding length. */
  let durId = TYPE_IDS[typeName];
  let useDots = dots;
  if (!durId) {
    const guess = durationForTicks(tuplet ? Math.round((ticks * tuplet.actual) / tuplet.normal) : ticks);
    durId = guess ? guess.id : 'quarter';
    useDots = guess ? guess.dots : 0;
  }

  if (isRest) {
    const rest = makeRest(durId, { dots: useDots, tuplet });
    const measureRest = el.getElementsByTagName('rest')[0].getAttribute('measure') === 'yes';
    if (measureRest) { rest.fullMeasure = true; rest.duration = 'whole'; rest.dots = 0; }
    return rest;
  }
  const p = readPitch(el);
  if (!p) return null;
  const ev = makeNote(p, durId, { dots: useDots, tuplet });
  ev.notes[0].tie = readTie(el);
  const acc = text(el, 'accidental');
  if (acc) ev.notes[0].accidental = 'show';
  if (isGrace) {
    const g = el.getElementsByTagName('grace')[0];
    ev.grace = { type: g.getAttribute('slash') === 'yes' ? 'acciaccatura' : 'appoggiatura', slash: g.getAttribute('slash') === 'yes' };
  }
  const stem = text(el, 'stem');
  if (stem === 'up' || stem === 'down') ev.stemDir = stem;
  for (const lyric of el.getElementsByTagName('lyric')) {
    const t = text(lyric, 'text');
    if (!t) continue;
    ev.lyrics.push({
      verse: Math.max(0, Number(lyric.getAttribute('number') || 1) - 1),
      text: t, syllabic: text(lyric, 'syllabic') || 'single',
    });
  }
  return ev;
}

function readNotations(el, ev, openSlurs, spanners, part) {
  const nots = el.getElementsByTagName('notations')[0];
  if (!nots) return;
  const arts = nots.getElementsByTagName('articulations')[0];
  if (arts) {
    for (const child of arts.children) {
      const id = ARTIC_FROM_XML[child.tagName];
      if (id && !ev.articulations.includes(id)) ev.articulations.push(id);
    }
  }
  if (nots.getElementsByTagName('fermata').length && !ev.articulations.includes('fermata')) {
    ev.articulations.push('fermata');
  }
  const orn = nots.getElementsByTagName('ornaments')[0];
  if (orn) {
    for (const child of orn.children) {
      const id = ORN_FROM_XML[child.tagName];
      if (id && !ev.ornaments.includes(id)) ev.ornaments.push(id);
      if (child.tagName === 'tremolo') ev.tremolo = Math.max(1, Math.min(3, Number(child.textContent) || 3));
    }
  }
  if (nots.getElementsByTagName('arpeggiate').length) ev.arpeggio = true;
  for (const tied of nots.getElementsByTagName('tied')) {
    const type = tied.getAttribute('type');
    const cur = ev.notes[0] && ev.notes[0].tie;
    if (ev.notes[0]) {
      if (type === 'start') ev.notes[0].tie = cur === 'stop' ? 'both' : 'start';
      if (type === 'stop') ev.notes[0].tie = cur === 'start' ? 'both' : 'stop';
    }
  }
  for (const slur of nots.getElementsByTagName('slur')) {
    const n = slur.getAttribute('number') || '1';
    const type = slur.getAttribute('type');
    if (type === 'start') openSlurs.set(n, ev.id);
    else if (type === 'stop' && openSlurs.has(n)) {
      spanners.push({ id: newId('s'), type: 'slur', partId: part.id, fromId: openSlurs.get(n), toId: ev.id, placement: 'auto' });
      openSlurs.delete(n);
    }
  }
  const tech = nots.getElementsByTagName('fingering')[0];
  if (tech) ev.fingerings.push({ note: 0, text: tech.textContent.trim() });
}

/* --------------------------------------------------------- instruments */

function probePart(measures, meta) {
  let staves = 1;
  let transpose = null;
  let lowest = 127;
  let highest = 0;
  for (const m of measures) {
    for (const attr of m.getElementsByTagName('attributes')) {
      const n = num(attr, 'staves', null);
      if (n) staves = Math.max(staves, Math.min(4, n));
      const tr = attr.getElementsByTagName('transpose')[0];
      if (tr) {
        transpose = {
          chromatic: num(tr, 'chromatic', 0) || 0,
          diatonic: num(tr, 'diatonic', 0) || 0,
        };
      }
    }
    for (const n of m.getElementsByTagName('pitch')) {
      const step = STEP_NAMES.indexOf((text(n, 'step') || 'C').toUpperCase());
      const oct = num(n, 'octave', 4);
      const midi = (oct + 1) * 12 + [0, 2, 4, 5, 7, 9, 11][Math.max(0, step)] + (num(n, 'alter', 0) || 0);
      lowest = Math.min(lowest, midi);
      highest = Math.max(highest, midi);
    }
  }
  return { staves, transpose, lowest, highest };
}

const NORMALISE = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

function matchInstrument(meta, probe) {
  const name = NORMALISE(meta.name);
  const abbrev = NORMALISE(meta.abbrev);
  if (name || abbrev) {
    for (const inst of INSTRUMENTS) {
      const n = NORMALISE(inst.name);
      if (n === name || NORMALISE(inst.abbrev) === abbrev) return inst.id;
    }
    for (const inst of INSTRUMENTS) {
      const n = NORMALISE(inst.name);
      if (name && (name.includes(n) || n.includes(name))) return inst.id;
    }
    const aliases = {
      violino: 'violin', violoncello: 'cello', contrabasso: 'contrabass', kontrabass: 'contrabass',
      fagott: 'bassoon', klarinette: 'clarinet', flote: 'flute', oboe: 'oboe', horn: 'horn',
      trompete: 'trumpet', posaune: 'trombone', pauken: 'timpani', klavier: 'piano',
      viola: 'viola', bratsche: 'viola', cello: 'cello', bass: 'contrabass', voice: 'soprano',
      organ: 'organ', harp: 'harp', guitar: 'guitar', drums: 'drumset', percussion: 'percussion',
    };
    for (const [k, v] of Object.entries(aliases)) if (name.includes(k)) return v;
  }
  if (meta.program !== null && meta.program !== undefined) {
    const prog = meta.program - 1;
    const byProgram = INSTRUMENTS.find((i) => i.program === prog);
    if (byProgram) return byProgram.id;
  }
  if (probe.staves > 1) return 'piano';
  return 'piano';
}
