import apBiology from './ap-biology.js';
import apCalculusAB from './ap-calculus-ab.js';
import apChemistry from './ap-chemistry.js';
import apComputerScienceA from './ap-computer-science-a.js';
import apEnglishLanguage from './ap-english-language.js';
import apEnvironmentalScience from './ap-environmental-science.js';
import apMacroeconomics from './ap-macroeconomics.js';
import apPhysics1 from './ap-physics-1.js';
import apPsychology from './ap-psychology.js';
import apStatistics from './ap-statistics.js';
import apUsHistory from './ap-us-history.js';
import apWorldHistory from './ap-world-history.js';

/**
 * The verified curriculum library.
 *
 * Every blueprint here is transcribed from a published course framework: real
 * unit titles, the awarding body's own exam weightings, and the real structure
 * of the paper. When a learner asks for one of these courses we teach the
 * actual syllabus rather than asking a model to guess at one, which is the
 * difference between a course that matches what the exam asks and a course
 * that merely sounds like it does.
 *
 * Anything not in here still works — it falls through to model generation.
 */
export const CURRICULA = [
  apBiology,
  apCalculusAB,
  apChemistry,
  apComputerScienceA,
  apEnglishLanguage,
  apEnvironmentalScience,
  apMacroeconomics,
  apPhysics1,
  apPsychology,
  apStatistics,
  apUsHistory,
  apWorldHistory,
];

/** Requests that name a sibling course must not fall into its neighbour. */
const EXCLUSIONS = {
  'ap-physics-1': ['physics 2', 'physics c', 'physics ii', 'mechanics c', 'electricity and magnetism'],
  'ap-calculus-ab': ['calc bc', 'calculus bc'],
  'ap-english-language': ['english literature', 'ap lit', 'english lit'],
  'ap-computer-science-a': ['principles', 'csp'],
  'ap-macroeconomics': ['microeconomics', 'ap micro'],
  'ap-us-history': ['world history', 'european history', 'ap euro'],
  'ap-world-history': ['us history', 'united states history', 'apush', 'european history'],
  'ap-statistics': ['statistics for', 'ib statistics'],
};

const normalise = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Does `needle` occur in `haystack` on word boundaries? */
function containsPhrase(haystack, needle) {
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  const before = idx === 0 ? ' ' : haystack[idx - 1];
  const after = idx + needle.length >= haystack.length ? ' ' : haystack[idx + needle.length];
  return before === ' ' && after === ' ';
}

/**
 * Find the library course a free-text request is asking for.
 *
 * Matching is deliberately conservative: it wants an explicit course name, not
 * a topic. "Teach me AP Biology" gets the verified blueprint; "teach me about
 * cells" does not, because the learner has not asked for the course and
 * building 81 tracked concepts around a passing question would be wrong.
 */
export function findCurriculum(...parts) {
  const text = normalise(parts.filter(Boolean).join(' '));
  if (!text) return null;

  let best = null;
  for (const blueprint of CURRICULA) {
    const excluded = (EXCLUSIONS[blueprint.key] || []).some((phrase) => containsPhrase(text, normalise(phrase)));
    if (excluded) continue;

    for (const alias of blueprint.aliases) {
      const needle = normalise(alias);
      if (!containsPhrase(text, needle)) continue;
      // Longest alias wins: "ap computer science a" beats "ap computer science".
      if (!best || needle.length > best.length) best = { blueprint, length: needle.length, alias };
    }
  }

  return best ? { blueprint: best.blueprint, matchedOn: best.alias } : null;
}

/** A short catalogue for the interface to offer. */
export const catalogue = () =>
  CURRICULA.map((b) => ({
    key: b.key,
    title: b.title,
    exam: b.exam,
    subject: b.subject,
    aliases: b.aliases,
    units: b.units.length,
    concepts: b.units.reduce((n, unit) => n + unit.concepts.length, 0),
    hours: b.total_hours,
  }));

/** Deep copy, so a learner's course can be edited without touching the library. */
export const cloneBlueprint = (blueprint) => JSON.parse(JSON.stringify(blueprint));
