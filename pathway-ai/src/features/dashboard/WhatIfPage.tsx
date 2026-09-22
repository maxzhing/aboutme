import { useMemo, useState } from 'react';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { runWhatIf } from '@/domain/engine/whatIf';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { AP_COURSES, AP_COURSE_BY_ID } from '@/data/ap';
import { COLLEGE_BY_ID, REGIONS } from '@/data/colleges';
import { BAND_LABEL } from '@/domain/engine/explain';
import type { WhatIfScenario } from '@/domain/types';
import { humanizeKey } from '@/lib/format';
import { nowISO } from '@/lib/date';

/* Section 52 — What-if simulator. */

const PRESETS: { label: string; changes: WhatIfScenario['changes'] }[] = [
  { label: 'Raise my SAT by 100 points', changes: {} },
  { label: 'Switch to Economics', changes: { replaceMajorId: 'economics' } },
  { label: 'Add AP Physics C: Mechanics', changes: { addAPCourseIds: ['ap-physics-c-mech'] } },
  { label: 'Stay on the East Coast', changes: { restrictRegions: ['New England', 'Mid-Atlantic', 'South'] } },
  { label: 'Cut my budget to $15,000', changes: { budgetPerYear: 15000 } },
];

export function WhatIfPage() {
  const ctx = useEngine();
  const { state, addScenario, removeScenario } = useAppStore();
  const [changes, setChanges] = useState<WhatIfScenario['changes']>({});

  const scenario: WhatIfScenario = useMemo(
    () => ({ id: 'live', label: 'Live scenario', changes, createdAt: nowISO() }),
    [changes],
  );

  const hasChanges = Object.values(changes).some((v) => v !== undefined && v !== '' && (!Array.isArray(v) || v.length));
  const result = useMemo(() => (hasChanges ? runWhatIf(ctx, scenario) : undefined), [ctx, scenario, hasChanges]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="What if?"
        title="Change something and see what shifts"
        description="This re-runs the same matching engine against a modified version of your profile. It describes changes in your options and preparation — it does not and cannot predict admission decisions."
      />

      <Notice tone="warn">
        <strong>No outcome here is a prediction.</strong> Nothing on this page makes admission more or less likely in any
        quantified way. It shows how your fit assessment and preparation would change, using the same logic as everywhere else.
      </Notice>

      <div className="grid mt-6" style={{ gridTemplateColumns: 'minmax(0, 340px) minmax(0, 1fr)', gap: 'var(--s-5)' }}>
        <div className="col g-4" style={{ minWidth: 0 }}>
          <Card pad="md">
            <SectionHeader title="Quick scenarios" />
            <div className="col g-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="btn btn-sm"
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() =>
                    setChanges(
                      p.label.startsWith('Raise')
                        ? { satTotal: Math.min(1600, (ctx.satTotal ?? 1200) + 100) }
                        : p.changes,
                    )
                  }
                >
                  <Icon name="zap" size={14} className="c-warn" />
                  {p.label}
                </button>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Build your own" />
            <div className="col g-4">
              <Field label="SAT total" hint={ctx.satTotal ? `Currently ${ctx.satTotal}` : 'No score recorded yet'}>
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    type="number"
                    min={400}
                    max={1600}
                    step={10}
                    value={changes.satTotal ?? ''}
                    onChange={(e) => setChanges({ ...changes, satTotal: e.target.value ? Number(e.target.value) : undefined })}
                  />
                )}
              </Field>

              <Field label="GPA (4.0 scale)" hint={ctx.gpa4 ? `Currently ${ctx.gpa4.toFixed(2)}` : 'No GPA recorded'}>
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    type="number"
                    min={0}
                    max={4.3}
                    step={0.01}
                    value={changes.gpa ?? ''}
                    onChange={(e) => setChanges({ ...changes, gpa: e.target.value ? Number(e.target.value) : undefined })}
                  />
                )}
              </Field>

              <Field label="Switch to a different major">
                {(props) => (
                  <select
                    {...props}
                    className="select"
                    value={changes.replaceMajorId ?? ''}
                    onChange={(e) => setChanges({ ...changes, replaceMajorId: e.target.value || undefined })}
                  >
                    <option value="">No change</option>
                    {MAJORS.filter((m) => m.id !== 'undecided').map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Add a major instead of replacing">
                {(props) => (
                  <select
                    {...props}
                    className="select"
                    value={changes.addMajorId ?? ''}
                    onChange={(e) => setChanges({ ...changes, addMajorId: e.target.value || undefined })}
                  >
                    <option value="">No change</option>
                    {MAJORS.filter((m) => m.id !== 'undecided' && !ctx.majorIds.includes(m.id)).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Add an AP course">
                {(props) => (
                  <select
                    {...props}
                    className="select"
                    value={changes.addAPCourseIds?.[0] ?? ''}
                    onChange={(e) => setChanges({ ...changes, addAPCourseIds: e.target.value ? [e.target.value] : undefined })}
                  >
                    <option value="">No change</option>
                    {AP_COURSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field label="Restrict to regions">
                {() => (
                  <div className="tag-list">
                    {REGIONS.map((r) => {
                      const on = changes.restrictRegions?.includes(r) ?? false;
                      return (
                        <button
                          key={r}
                          type="button"
                          className="chip chip-sm"
                          aria-pressed={on}
                          onClick={() =>
                            setChanges({
                              ...changes,
                              restrictRegions: on
                                ? (changes.restrictRegions ?? []).filter((x) => x !== r)
                                : [...(changes.restrictRegions ?? []), r],
                            })
                          }
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>

              <Field label="Annual budget" hint={ctx.constraints.maxCostPerYear ? `Currently $${ctx.constraints.maxCostPerYear.toLocaleString()}` : 'No budget set'}>
                {(props) => (
                  <input
                    {...props}
                    className="input"
                    type="number"
                    min={0}
                    step={1000}
                    value={changes.budgetPerYear ?? ''}
                    onChange={(e) => setChanges({ ...changes, budgetPerYear: e.target.value ? Number(e.target.value) : undefined })}
                  />
                )}
              </Field>

              <div className="row g-2">
                <Button variant="ghost" size="sm" icon="refresh" onClick={() => setChanges({})}>
                  Reset
                </Button>
                {hasChanges ? (
                  <Button
                    size="sm"
                    icon="bookmark"
                    onClick={() => addScenario({ label: describeChanges(changes), changes })}
                  >
                    Save scenario
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>

          {state.whatIfScenarios.length ? (
            <Card pad="md">
              <SectionHeader title="Saved scenarios" />
              <div className="col g-2">
                {state.whatIfScenarios.map((s) => (
                  <div key={s.id} className="row between g-2">
                    <button type="button" className="t-sm grow" style={{ textAlign: 'left' }} onClick={() => setChanges(s.changes)}>
                      {s.label}
                    </button>
                    <Button size="xs" variant="ghost" icon="x" onClick={() => removeScenario(s.id)} aria-label="Remove scenario" />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div style={{ minWidth: 0 }}>
          {result ? (
            <div className="col g-5">
              <section>
                <SectionHeader title="What would change" />
                <div className="col g-3">
                  {result.effects.map((e, i) => (
                    <Card key={i} pad="md">
                      <Badge tone="accent">{humanizeKey(e.area)}</Badge>
                      <div className="grid-2 mt-3">
                        <div>
                          <p className="t-2xs eyebrow">Now</p>
                          <p className="t-sm muted mt-1">{e.before}</p>
                        </div>
                        <div>
                          <p className="t-2xs eyebrow">In this scenario</p>
                          <p className="t-sm mt-1">{e.after}</p>
                        </div>
                      </div>
                      <div className="row-top g-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <Icon name="arrow-right" size={14} className="c-accent shrink-0" style={{ marginTop: 3 }} />
                        <p className="t-sm">{e.delta}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              {result.collegeShifts.length ? (
                <section>
                  <SectionHeader
                    title="Colleges that move band"
                    description="Fit bands only. This is not a change in admission chance."
                  />
                  <div className="col g-2">
                    {result.collegeShifts.map((s) => (
                      <Card key={s.collegeId} pad="sm">
                        <div className="row between g-3 wrap">
                          <span className="t-sm w-600">{COLLEGE_BY_ID.get(s.collegeId)?.shortName ?? s.collegeId}</span>
                          <div className="row g-2 items-center">
                            <Badge>{BAND_LABEL[s.beforeBand]}</Badge>
                            <Icon name="arrow-right" size={13} className="subtle" />
                            <Badge tone="accent">{BAND_LABEL[s.afterBand]}</Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ) : null}

              <Notice tone="warn">{result.caveat}</Notice>
            </div>
          ) : (
            <Card pad="lg">
              <div className="col items-center ta-center g-3 p-6">
                <span className="empty-art">
                  <Icon name="sliders" size={22} />
                </span>
                <p className="empty-title">Pick something to change</p>
                <p className="empty-desc">
                  Use a quick scenario or build your own. The results re-run the same engine that powers your college matches,
                  AP plan and recommendations.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function describeChanges(changes: WhatIfScenario['changes']): string {
  const parts: string[] = [];
  if (changes.satTotal) parts.push(`SAT ${changes.satTotal}`);
  if (changes.gpa) parts.push(`GPA ${changes.gpa}`);
  if (changes.replaceMajorId) parts.push(`Switch to ${MAJOR_BY_ID.get(changes.replaceMajorId)?.name}`);
  if (changes.addMajorId) parts.push(`Add ${MAJOR_BY_ID.get(changes.addMajorId)?.name}`);
  if (changes.addAPCourseIds?.length) parts.push(`Add ${AP_COURSE_BY_ID.get(changes.addAPCourseIds[0])?.name}`);
  if (changes.restrictRegions?.length) parts.push(changes.restrictRegions.join(' / '));
  if (changes.budgetPerYear) parts.push(`Budget $${changes.budgetPerYear.toLocaleString()}`);
  return parts.join(' · ') || 'Scenario';
}
