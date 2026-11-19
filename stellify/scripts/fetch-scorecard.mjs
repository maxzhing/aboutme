/**
 * Builds the College Scorecard snapshot used by the test-day hub's school tool (src/data/scorecard.json).
 * Runs at BUILD time only. The API key is read from the environment and never shipped to browsers.
 *
 *   SCORECARD_API_KEY=… node scripts/fetch-scorecard.mjs
 *
 * Needs a free key from api.data.gov (NEEDS-OWNER.md #4). Keeps four-year schools that report SAT percentiles,
 * and stores only the name, city, state, website and the 25th/75th percentile section scores, with the
 * snapshot date. Nothing about students is involved.
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const key = process.env.SCORECARD_API_KEY;
if (!key) { console.error('Set SCORECARD_API_KEY (a free api.data.gov key). Nothing was changed.'); process.exit(1); }
const fields = ['id', 'school.name', 'school.city', 'school.state', 'school.school_url',
  'latest.admissions.sat_scores.25th_percentile.critical_reading', 'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.admissions.sat_scores.25th_percentile.math', 'latest.admissions.sat_scores.75th_percentile.math'].join(',');
const out = [];
for (let page = 0; page < 200; page++) {
  const url = `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${key}&school.degrees_awarded.predominant=3&latest.admissions.sat_scores.25th_percentile.math__range=200..800&fields=${fields}&per_page=100&page=${page}`;
  const r = await fetch(url);
  if (!r.ok) { console.error(`Scorecard API said ${r.status} on page ${page}`); process.exit(1); }
  const j = await r.json();
  for (const s of j.results) {
    const g = (k) => s[k];
    const rw = [g('latest.admissions.sat_scores.25th_percentile.critical_reading'), g('latest.admissions.sat_scores.75th_percentile.critical_reading')];
    const m = [g('latest.admissions.sat_scores.25th_percentile.math'), g('latest.admissions.sat_scores.75th_percentile.math')];
    if (rw.some((x) => x == null) || m.some((x) => x == null)) continue;
    out.push({ id: s.id, name: g('school.name'), city: g('school.city'), state: g('school.state'), url: g('school.school_url'), rw, math: m, total: [rw[0] + m[0], rw[1] + m[1]] });
  }
  if ((page + 1) * 100 >= j.metadata.total) break;
}
const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'scorecard.json');
writeFileSync(file, JSON.stringify({ snapshotDate: new Date().toISOString().slice(0, 10), source: 'U.S. Department of Education, College Scorecard API (api.data.gov)', schools: out }));
console.log(`Wrote ${out.length} schools to src/data/scorecard.json`);
