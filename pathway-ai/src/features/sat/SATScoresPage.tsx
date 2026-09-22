import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Modal, Notice, Switch } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { LineChart } from '@/components/charts';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { satProjection } from '@/domain/engine/practice';
import { todayISO, formatDate } from '@/lib/date';
import { downloadCSV } from '@/lib/export';
import { roundSat, roundSatSection } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Section 39 — score history. Self-reported, clearly marked, never predicted. */

export function SATScoresPage() {
  const ctx = useEngine();
  const { state, addSatScore, removeSatScore, toast } = useAppStore();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [label, setLabel] = useState('');
  const [math, setMath] = useState('');
  const [verbal, setVerbal] = useState('');
  const [official, setOfficial] = useState(false);
  const [note, setNote] = useState('');

  const projection = useMemo(() => satProjection(ctx), [ctx]);
  const scores = [...state.satScores].sort((a, b) => a.date.localeCompare(b.date));

  const series = [
    { name: 'Total', points: scores.map((s, i) => ({ x: i, y: s.total })) },
  ];
  const sectionSeries = [
    { name: 'Math', points: scores.map((s, i) => ({ x: i, y: s.math })) },
    { name: 'Reading & Writing', points: scores.map((s, i) => ({ x: i, y: s.readingWriting })) },
  ];

  const best = scores.reduce<typeof scores[number] | undefined>((acc, s) => (!acc || s.total > acc.total ? s : acc), undefined);
  const superScore = scores.length
    ? roundSat(Math.max(...scores.map((s) => s.math)) + Math.max(...scores.map((s) => s.readingWriting)))
    : undefined;

  /* Colleges on the list whose published middle-50% brackets this score. */
  const listContext = useMemo(() => {
    if (!best) return [];
    return state.collegeList
      .map((e) => COLLEGE_BY_ID.get(e.collegeId))
      .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.sat25 !== undefined && c!.sat75 !== undefined)
      .map((c) => ({
        college: c,
        position: best.total < c.sat25! ? 'below' : best.total > c.sat75! ? 'above' : 'within',
      }));
  }, [best, state.collegeList]);

  function save() {
    const m = Number(math);
    const v = Number(verbal);
    if (!Number.isFinite(m) || !Number.isFinite(v) || m < 200 || m > 800 || v < 200 || v > 800) {
      toast('Section scores run from 200 to 800. Check both numbers.', 'warn');
      return;
    }
    const roundedMath = roundSatSection(m);
    const roundedVerbal = roundSatSection(v);
    addSatScore({
      date,
      label: label.trim() || (official ? 'Official score report' : 'Practice test'),
      math: roundedMath,
      readingWriting: roundedVerbal,
      total: roundedMath + roundedVerbal,
      official,
      note: note.trim() || undefined,
    });
    toast('Score saved.', 'ok');
    setOpen(false);
    setLabel('');
    setMath('');
    setVerbal('');
    setNote('');
    setOfficial(false);
  }

  function exportScores() {
    downloadCSV(
      'pathway-sat-scores.csv',
      scores.map((s) => ({
        Date: s.date,
        Label: s.label,
        Math: s.math,
        'Reading and Writing': s.readingWriting,
        Total: s.total,
        Type: s.official ? 'official' : 'practice',
        Note: s.note ?? '',
      })),
    );
    toast('Scores exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="SAT Lab"
        title="Score history"
        description="Scores you enter yourself, kept separate from practice accuracy in this app. We never estimate a score you have not taken."
        back={{ to: '/app/sat', label: 'SAT Lab' }}
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportScores} disabled={!scores.length}>
              Export
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setOpen(true)}>
              Add a score
            </Button>
          </>
        }
      />

      {scores.length ? (
        <>
          <div className="row g-5 wrap">
            {best ? <Stat label="Best total" value={String(best.total)} /> : null}
            {superScore !== undefined && scores.length > 1 ? <Stat label="Superscore" value={String(superScore)} tone="var(--accent)" /> : null}
            <Stat label="Tests recorded" value={String(scores.length)} />
            <Stat label="Official reports" value={String(scores.filter((s) => s.official).length)} />
          </div>

          {superScore !== undefined && scores.length > 1 ? (
            <Notice tone="info" icon="info" className="mt-4">
              A superscore combines your best Math and best Reading &amp; Writing across sittings. Many colleges superscore, but not all do, and
              some only consider scores from official administrations. Check each college&rsquo;s current policy — we do not hold verified
              policies for this cycle.
            </Notice>
          ) : null}

          {scores.length > 1 ? (
            <div className="split-aside mt-6">
              <Card pad="md">
                <SectionHeader title="Total over time" />
                <LineChart series={series} xLabels={scores.map((s) => formatDate(s.date))} yMin={400} yMax={1600} yLabel="Total" ariaLabel="SAT total over time" />
              </Card>
              <Card pad="md">
                <SectionHeader title="By section" />
                <LineChart series={sectionSeries} xLabels={scores.map((s) => formatDate(s.date))} yMin={200} yMax={800} yLabel="Section" ariaLabel="SAT section scores over time" height={220} />
              </Card>
            </div>
          ) : null}

          <Card pad="none" className="mt-6">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Label</th>
                    <th scope="col" className="ta-right">Math</th>
                    <th scope="col" className="ta-right">Reading &amp; Writing</th>
                    <th scope="col" className="ta-right">Total</th>
                    <th scope="col">Type</th>
                    <th scope="col" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {[...scores].reverse().map((s) => (
                    <tr key={s.id}>
                      <th scope="row" className="mono t-xs">
                        {formatDate(s.date)}
                      </th>
                      <td>
                        {s.label}
                        {s.note ? <span className="block t-2xs faint">{s.note}</span> : null}
                      </td>
                      <td className="mono ta-right">{s.math}</td>
                      <td className="mono ta-right">{s.readingWriting}</td>
                      <td className="mono ta-right w-600">{s.total}</td>
                      <td>{s.official ? <Badge tone="ok">Official</Badge> : <Badge>Practice</Badge>}</td>
                      <td className="ta-right">
                        <Button size="sm" variant="ghost" icon="trash" aria-label={`Delete the score from ${s.date}`} onClick={() => removeSatScore(s.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {listContext.length ? (
            <Card pad="md" className="mt-6">
              <SectionHeader
                title="Against the colleges on your list"
                description="Middle-50% ranges describe admitted students at those colleges, which is not the same as a threshold you must clear. Test-optional colleges admit plenty of students who submitted nothing."
              />
              <div className="col g-2">
                {listContext.map(({ college, position }) => (
                  <div key={college.id} className="row between g-3 t-sm">
                    <span className="subtle">{college.shortName ?? college.name}</span>
                    <span className="row g-2 items-center">
                      <span className="mono t-xs faint">
                        {college.sat25}–{college.sat75}
                      </span>
                      <Badge tone={position === 'above' ? 'ok' : position === 'within' ? 'accent' : 'default'}>{position} the middle 50%</Badge>
                    </span>
                  </div>
                ))}
              </div>
              <p className="t-2xs faint mt-4">
                Being below a range is not a rejection and being above it is not an admission. These figures are demo data drawn from published
                common data sets; verify against each college&rsquo;s own reporting.
              </p>
            </Card>
          ) : null}
        </>
      ) : (
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            No scores recorded. Add a practice test or an official report and this page will track it over time. We deliberately do not convert
            your in-app practice accuracy into a score — that number would be invented.
          </p>
          <div className="row center mt-4">
            <Button icon="plus" onClick={() => setOpen(true)}>
              Add your first score
            </Button>
          </div>
        </Card>
      )}

      <Card pad="md" className="mt-6">
        <p className="t-sm row g-2">
          <Icon name="shield" size={15} className="c-accent shrink-0 mt-1" />
          <span>{projection.caveat}</span>
        </p>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add an SAT score"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save score
            </Button>
          </>
        }
      >
        <div className="col g-4">
          <Field label="Date taken">
            {(p) => <input {...p} type="date" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Label" hint="How you will recognise it later — 'Bluebook practice 2', 'March official'.">
            {(p) => <input {...p} className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Practice test 1" />}
          </Field>
          <div className="row g-3 wrap">
            <Field label="Math" hint="200–800">
              {(p) => <input {...p} className="input" inputMode="numeric" value={math} onChange={(e) => setMath(e.target.value.replace(/[^0-9]/g, ''))} placeholder="650" />}
            </Field>
            <Field label="Reading & Writing" hint="200–800">
              {(p) => <input {...p} className="input" inputMode="numeric" value={verbal} onChange={(e) => setVerbal(e.target.value.replace(/[^0-9]/g, ''))} placeholder="680" />}
            </Field>
          </div>
          <Switch checked={official} onChange={setOfficial} label="This is an official score report" description="Rather than a practice test. Kept distinct everywhere in the app." />
          <Field label="Note" hint="Optional. Conditions, what went wrong, what you changed.">
            {(p) => <textarea {...p} className="input textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
