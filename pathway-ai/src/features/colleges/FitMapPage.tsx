import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, useLocalState } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, FitDimensionGrid } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { ScatterChart, type ScatterPoint } from '@/components/charts';
import { COLLEGES, COLLEGE_BY_ID, REGIONS } from '@/data/colleges';
import { matchColleges } from '@/domain/engine/collegeMatch';
import type { CollegeMatch, College } from '@/domain/types';
import { compactCurrency, countLabel, currency, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* --------------------------------------------------------------------------
   Section 51 — College Fit Map.

   The point of this screen is the opposite of a ranking: two axes the student
   chooses, so the trade-off they actually care about is the thing they see.
   Nothing here collapses a college into one number, and position on the map is
   never a chance of admission.
   ----------------------------------------------------------------------- */

type AxisId =
  | 'academicFit'
  | 'personalFit'
  | 'opportunityFit'
  | 'financialFit'
  | 'netPrice'
  | 'stickerPrice'
  | 'admitRate'
  | 'size'
  | 'gradRate'
  | 'aidCoverage';

interface AxisDef {
  id: AxisId;
  label: string;
  short: string;
  /** Returns undefined when the college has no published figure. */
  value: (college: College, match?: CollegeMatch) => number | undefined;
  format: (n: number) => string;
  hint: string;
}

const DIMENSION_INDEX: Record<string, number> = { academicFit: 0, personalFit: 1, opportunityFit: 2, financialFit: 3 };

function dimValue(match: CollegeMatch | undefined, key: string): number | undefined {
  if (!match) return undefined;
  return match.dimensions[DIMENSION_INDEX[key]]?.score;
}

const AXES: AxisDef[] = [
  {
    id: 'academicFit',
    label: 'Academic fit',
    short: 'Academic fit',
    value: (_c, m) => dimValue(m, 'academicFit'),
    format: (n) => `${Math.round(n)}/100`,
    hint: 'How well the programmes, depth and academic culture line up with the direction you have told us about.',
  },
  {
    id: 'personalFit',
    label: 'Personal fit',
    short: 'Personal fit',
    value: (_c, m) => dimValue(m, 'personalFit'),
    format: (n) => `${Math.round(n)}/100`,
    hint: 'Size, setting, region and the campus priorities you chose.',
  },
  {
    id: 'opportunityFit',
    label: 'Opportunity fit',
    short: 'Opportunity fit',
    value: (_c, m) => dimValue(m, 'opportunityFit'),
    format: (n) => `${Math.round(n)}/100`,
    hint: 'Research, internships, study abroad, co-op and entrepreneurship relative to what you want to do.',
  },
  {
    id: 'financialFit',
    label: 'Financial fit',
    short: 'Financial fit',
    value: (_c, m) => dimValue(m, 'financialFit'),
    format: (n) => `${Math.round(n)}/100`,
    hint: 'Your stated budget against published net price and aid policy. An estimate, never an aid offer.',
  },
  {
    id: 'netPrice',
    label: 'Average net price (after aid)',
    short: 'Avg net price',
    value: (c) => c.avgNetPrice,
    format: (n) => compactCurrency(n),
    hint: 'What the average aided student paid — not what you will pay.',
  },
  {
    id: 'stickerPrice',
    label: 'Sticker price (tuition + housing)',
    short: 'Sticker price',
    value: (c) => {
      const tuition = c.control === 'public' ? c.tuitionOutState ?? c.tuitionInState : c.tuitionInState ?? c.tuitionOutState;
      if (tuition === undefined) return undefined;
      return tuition + (c.roomAndBoard ?? 0);
    },
    format: (n) => compactCurrency(n),
    hint: 'Published cost before any aid. Most students at well-aided colleges pay far less.',
  },
  {
    id: 'admitRate',
    label: 'Admit rate',
    short: 'Admit rate',
    value: (c) => c.acceptanceRate,
    format: (n) => percent(n),
    hint: 'How many applicants were admitted overall. It is not your personal chance of admission.',
  },
  {
    id: 'size',
    label: 'Undergraduate enrollment',
    short: 'Undergrads',
    value: (c) => c.undergradEnrollment,
    format: (n) => n.toLocaleString(),
    hint: 'Headcount, which drives class sizes, advising and how easy it is to be known.',
  },
  {
    id: 'gradRate',
    label: 'Graduation rate',
    short: 'Grad rate',
    value: (c) => c.graduationRate,
    format: (n) => percent(n),
    hint: 'Share of students finishing a degree — a useful proxy for support and advising.',
  },
  {
    id: 'aidCoverage',
    label: 'Share receiving aid',
    short: 'Receiving aid',
    value: (c) => c.pctReceivingAid,
    format: (n) => percent(n),
    hint: 'How common financial aid is on this campus.',
  },
];

const AXIS_BY_ID = new Map(AXES.map((a) => [a.id, a]));

interface Preset {
  id: string;
  label: string;
  description: string;
  x: AxisId;
  y: AxisId;
}

const PRESETS: Preset[] = [
  { id: 'cost-academic', label: 'Cost vs academic fit', description: 'The trade-off most families actually make.', x: 'netPrice', y: 'academicFit' },
  { id: 'size-personal', label: 'Size vs personal fit', description: 'Does the campus you like best match the scale you want?', x: 'size', y: 'personalFit' },
  { id: 'selectivity-opportunity', label: 'Selectivity vs opportunity', description: 'Selectivity and opportunity are not the same thing.', x: 'admitRate', y: 'opportunityFit' },
  { id: 'money-money', label: 'Sticker vs net price', description: 'Where published cost and real cost diverge most.', x: 'stickerPrice', y: 'netPrice' },
];

export function FitMapPage() {
  const ctx = useEngine();
  const { state, addToCollegeList, toast } = useAppStore();

  const [xAxis, setXAxis] = useLocalState<AxisId>('fitmap.x', 'netPrice');
  const [yAxis, setYAxis] = useLocalState<AxisId>('fitmap.y', 'academicFit');
  const [scope, setScope] = useLocalState<'matches' | 'list' | 'all'>('fitmap.scope', 'matches');
  const [region, setRegion] = useState('all');
  const [control, setControl] = useState('all');
  const [selected, setSelected] = useState<string | undefined>(undefined);

  // One matching pass over the whole catalog; the map filters rather than re-ranks.
  const matches = useMemo(() => matchColleges(ctx, { limit: COLLEGES.length }), [ctx]);
  const matchById = useMemo(() => new Map(matches.map((m) => [m.collegeId, m])), [matches]);
  const savedIds = useMemo(() => new Set(state.collegeList.map((e) => e.collegeId)), [state.collegeList]);

  const xDef = AXIS_BY_ID.get(xAxis) ?? AXES[0];
  const yDef = AXIS_BY_ID.get(yAxis) ?? AXES[1];

  const pool = useMemo(() => {
    let ids: string[];
    if (scope === 'list') ids = state.collegeList.map((e) => e.collegeId);
    else if (scope === 'matches') ids = matches.slice(0, 24).map((m) => m.collegeId);
    else ids = COLLEGES.map((c) => c.id);
    const seen = new Set<string>();
    return ids
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .map((id) => COLLEGE_BY_ID.get(id))
      .filter((c): c is College => Boolean(c))
      .filter((c) => (region === 'all' || c.region === region) && (control === 'all' || c.control === control));
  }, [scope, state.collegeList, matches, region, control]);

  const { points, missing } = useMemo(() => {
    const pts: ScatterPoint[] = [];
    const absent: College[] = [];
    for (const college of pool) {
      const match = matchById.get(college.id);
      const x = xDef.value(college, match);
      const y = yDef.value(college, match);
      if (x === undefined || y === undefined) {
        absent.push(college);
        continue;
      }
      const band = match?.overallBand;
      pts.push({
        id: college.id,
        x,
        y,
        label: college.shortName ?? college.name,
        tone:
          band === 'strong'
            ? 'var(--ok)'
            : band === 'good'
              ? 'var(--accent)'
              : band === 'moderate'
                ? 'var(--warn)'
                : 'var(--text-faint)',
        size: savedIds.has(college.id) ? 10 : 7,
      });
    }
    return { points: pts, missing: absent };
  }, [pool, matchById, xDef, yDef, savedIds]);

  const selectedCollege = selected ? COLLEGE_BY_ID.get(selected) : undefined;
  const selectedMatch = selected ? matchById.get(selected) : undefined;
  const selectedPoint = points.find((p) => p.id === selected);

  const quadrants = useMemo(() => {
    if (points.length < 4) return undefined;
    const midX = (Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.x))) / 2;
    const midY = (Math.min(...points.map((p) => p.y)) + Math.max(...points.map((p) => p.y))) / 2;
    const bucket = (predX: boolean, predY: boolean) =>
      points.filter((p) => p.x >= midX === predX && p.y >= midY === predY).map((p) => p.label);
    return {
      midX,
      midY,
      lowHigh: bucket(false, true),
      highHigh: bucket(true, true),
      lowLow: bucket(false, false),
      highLow: bucket(true, false),
    };
  }, [points]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Colleges"
        title="Fit map"
        description="Pick the two things you are actually trading off and see where each college lands. No college is reduced to a single score here — position is a description, not a verdict."
        actions={
          <>
            <Button variant="ghost" icon="grid" to="/app/colleges/compare">
              Compare
            </Button>
            <Button variant="ghost" icon="wallet" to="/app/colleges/cost">
              Cost planning
            </Button>
          </>
        }
      />

      <DemoDataBanner what="Cost, size, admit-rate and graduation figures" />

      <Card pad="md">
        <div className="row g-2 wrap mb-4">
          <span className="t-xs subtle self-center">Start from:</span>
          {PRESETS.map((p) => {
            const active = p.x === xAxis && p.y === yAxis;
            return (
              <button
                key={p.id}
                type="button"
                className="chip chip-sm"
                title={p.description}
                aria-pressed={active}
                onClick={() => {
                  setXAxis(p.x);
                  setYAxis(p.y);
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="row g-3 wrap">
          <label className="col g-1">
            <span className="t-2xs eyebrow">Horizontal axis</span>
            <select className="select" style={{ minWidth: 230 }} value={xAxis} onChange={(e) => setXAxis(e.target.value as AxisId)}>
              {AXES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Vertical axis</span>
            <select className="select" style={{ minWidth: 230 }} value={yAxis} onChange={(e) => setYAxis(e.target.value as AxisId)}>
              {AXES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Colleges shown</span>
            <select className="select" style={{ minWidth: 180 }} value={scope} onChange={(e) => setScope(e.target.value as 'matches' | 'list' | 'all')}>
              <option value="matches">Your top 24 matches</option>
              <option value="list">Your saved list ({state.collegeList.length})</option>
              <option value="all">Whole catalog ({COLLEGES.length})</option>
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Region</span>
            <select className="select" style={{ minWidth: 150 }} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="all">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="col g-1">
            <span className="t-2xs eyebrow">Type</span>
            <select className="select" style={{ minWidth: 150 }} value={control} onChange={(e) => setControl(e.target.value)}>
              <option value="all">Public & private</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
        </div>

        <div className="row g-4 mt-3 wrap t-2xs subtle">
          <span className="row g-1">
            <span className="dot" style={{ background: 'var(--ok)' }} /> Strong overall fit
          </span>
          <span className="row g-1">
            <span className="dot" style={{ background: 'var(--accent)' }} /> Good fit
          </span>
          <span className="row g-1">
            <span className="dot" style={{ background: 'var(--warn)' }} /> Moderate fit
          </span>
          <span className="row g-1">
            <span className="dot" style={{ background: 'var(--text-faint)' }} /> Limited or unscored
          </span>
          <span className="row g-1">
            <Icon name="bookmark" size={11} /> Larger dots are colleges already on your list
          </span>
        </div>
      </Card>

      <div className="split-map mt-4">
        <Card pad="md">
          <ScatterChart
            points={points}
            xLabel={xDef.short}
            yLabel={yDef.short}
            height={440}
            selectedId={selected}
            onSelect={(id) => setSelected((prev) => (prev === id ? undefined : id))}
            ariaLabel={`Scatter plot of ${countLabel(points.length, 'college')}. Horizontal axis: ${xDef.label}. Vertical axis: ${yDef.label}. Select a point for detail.`}
          />
          <p className="t-2xs faint mt-2">
            Select any dot — with a click or with Enter when focused — to read that college beside the map.
          </p>
          {missing.length ? (
            <p className="t-2xs subtle mt-2">
              {countLabel(missing.length, 'college')} could not be plotted because {missing.length === 1 ? 'it has' : 'they have'} no published
              figure for one of these axes: {missing.slice(0, 5).map((c) => c.shortName ?? c.name).join(', ')}
              {missing.length > 5 ? ` and ${missing.length - 5} more` : ''}. We leave gaps rather than guessing.
            </p>
          ) : null}
        </Card>

        <div className="col g-4">
          {selectedCollege ? (
            <Card pad="md">
              <div className="row between g-2 items-start">
                <div>
                  <h3 className="t-md w-600">{selectedCollege.shortName ?? selectedCollege.name}</h3>
                  <p className="t-2xs subtle mt-1">
                    {selectedCollege.city}, {selectedCollege.state} · {selectedCollege.control}
                  </p>
                </div>
                <Button size="sm" variant="ghost" icon="x" aria-label="Clear selection" onClick={() => setSelected(undefined)} />
              </div>

              {selectedPoint ? (
                <div className="row g-4 mt-3">
                  <div className="col g-1">
                    <span className="t-2xs eyebrow">{xDef.short}</span>
                    <span className="t-md mono w-600">{xDef.format(selectedPoint.x)}</span>
                  </div>
                  <div className="col g-1">
                    <span className="t-2xs eyebrow">{yDef.short}</span>
                    <span className="t-md mono w-600">{yDef.format(selectedPoint.y)}</span>
                  </div>
                </div>
              ) : null}

              {selectedMatch ? (
                <>
                  <p className="t-sm muted mt-3">{selectedMatch.headline}</p>
                  <div className="mt-3">
                    <FitDimensionGrid dimensions={selectedMatch.dimensions} compact />
                  </div>
                  <p className="t-2xs faint mt-2">{selectedMatch.academicContext.disclaimer}</p>
                </>
              ) : (
                <p className="t-xs subtle mt-3">{selectedCollege.blurb}</p>
              )}

              <div className="row g-2 mt-4 wrap">
                <Button size="sm" variant="ghost" to={`/app/colleges/${selectedCollege.id}`} iconRight="chevron-right">
                  Open profile
                </Button>
                {savedIds.has(selectedCollege.id) ? (
                  <Badge tone="ok">On your list</Badge>
                ) : (
                  <Button
                    size="sm"
                    icon="plus"
                    onClick={() => {
                      addToCollegeList(selectedCollege.id);
                      toast(`${selectedCollege.shortName ?? selectedCollege.name} added to your list.`, 'ok');
                    }}
                  >
                    Add to list
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card pad="md">
              <h3 className="t-sm w-600">What you are looking at</h3>
              <p className="t-xs subtle mt-2">
                <span className="w-600">{xDef.label}</span> — {xDef.hint}
              </p>
              <p className="t-xs subtle mt-2">
                <span className="w-600">{yDef.label}</span> — {yDef.hint}
              </p>
              <p className="t-xs subtle mt-3">Select a dot to see that college&rsquo;s four fit dimensions side by side.</p>
            </Card>
          )}

          {quadrants ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Reading the corners</h3>
              <p className="t-2xs subtle mt-1">
                Split at {xDef.format(quadrants.midX)} and {yDef.format(quadrants.midY)} — the midpoint of what is currently plotted, not a
                national benchmark.
              </p>
              <ul className="col g-2 mt-3">
                <QuadrantRow label={`Lower ${xDef.short.toLowerCase()}, higher ${yDef.short.toLowerCase()}`} names={quadrants.lowHigh} />
                <QuadrantRow label={`Higher ${xDef.short.toLowerCase()}, higher ${yDef.short.toLowerCase()}`} names={quadrants.highHigh} />
                <QuadrantRow label={`Lower ${xDef.short.toLowerCase()}, lower ${yDef.short.toLowerCase()}`} names={quadrants.lowLow} />
                <QuadrantRow label={`Higher ${xDef.short.toLowerCase()}, lower ${yDef.short.toLowerCase()}`} names={quadrants.highLow} />
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      <Notice tone="info" icon="info" className="mt-6">
        Nothing on this map is a prediction of admission. Two colleges sitting in the same place can have very different outcomes for the same
        student, and admissions decisions depend on context this app does not have. Use the map to understand trade-offs, then read the full
        profile before deciding anything.
      </Notice>

      {scope !== 'all' && !pool.length ? (
        <Card pad="lg" className="mt-4">
          <p className="t-sm subtle ta-center">
            Nothing to plot yet.{' '}
            <Link to="/app/colleges/match" className="c-accent">
              Run matching
            </Link>{' '}
            or switch the scope to the whole catalog.
          </p>
        </Card>
      ) : null}

      <section className="mt-8">
        <SectionHeader title="Everything currently plotted" description="The same data as a table, sorted by the vertical axis." />
        <Card pad="none">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">College</th>
                  <th scope="col">{xDef.short}</th>
                  <th scope="col">{yDef.short}</th>
                  <th scope="col">Overall fit band</th>
                  <th scope="col" className="ta-right">
                    Net price
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...points]
                  .sort((a, b) => b.y - a.y)
                  .map((p) => {
                    const college = COLLEGE_BY_ID.get(p.id);
                    const match = matchById.get(p.id);
                    if (!college) return null;
                    return (
                      <tr key={p.id} className={p.id === selected ? 'row-selected' : undefined}>
                        <th scope="row">
                          <Link to={`/app/colleges/${college.id}`}>{college.shortName ?? college.name}</Link>
                        </th>
                        <td className="mono">{xDef.format(p.x)}</td>
                        <td className="mono">{yDef.format(p.y)}</td>
                        <td>{match ? match.overallBand : <span className="faint">not scored</span>}</td>
                        <td className="mono ta-right">{college.avgNetPrice !== undefined ? currency(college.avgNetPrice) : '—'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function QuadrantRow({ label, names }: { label: string; names: string[] }) {
  return (
    <li className="col g-1">
      <span className="t-2xs eyebrow">{label}</span>
      <span className="t-xs subtle">{names.length ? names.slice(0, 6).join(', ') + (names.length > 6 ? `, +${names.length - 6} more` : '') : 'Nothing here.'}</span>
    </li>
  );
}
