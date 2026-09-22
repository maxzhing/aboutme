import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice, Switch } from '@/components/ui/primitives';
import { SectionHeader } from '@/components/ui/shared';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { INTERESTS, INTEREST_BY_ID, INTEREST_CLUSTERS } from '@/data/interests';
import { COLLEGE_STATES, COLLEGE_PRIORITY_TAGS, REGIONS } from '@/data/colleges';
import { Icon } from '@/components/ui/Icon';
import type { GradeLevel, GpaScale, MajorConfidence, RigorTolerance } from '@/domain/types';

/* Section 56 — the profile. Everything else in the app reads from here. */

const GRADES: GradeLevel[] = [9, 10, 11, 12];
const SCALES: GpaScale[] = ['4.0', '5.0', '100', 'other'];
const CONFIDENCES: MajorConfidence[] = ['exploring', 'leaning', 'firm'];
const RIGOR: RigorTolerance[] = ['light', 'balanced', 'heavy'];

export function ProfileSettings() {
  const { state, updateProfile, toast } = useAppStore();
  const p = state.profile;
  const [newInterest, setNewInterest] = useState('');
  const [cluster, setCluster] = useState<string>(INTEREST_CLUSTERS[0] ?? 'STEM');

  function toggleInterest(id: string) {
    updateProfile((draft) => {
      draft.interests = draft.interests.includes(id) ? draft.interests.filter((i) => i !== id) : [...draft.interests, id];
    });
  }

  function setMajorConfidence(majorId: string, confidence: MajorConfidence) {
    updateProfile((draft) => {
      const existing = draft.majors.find((m) => m.majorId === majorId);
      if (existing) existing.confidence = confidence;
      else draft.majors.push({ majorId, confidence });
    });
  }

  function togglePriority(tag: string) {
    updateProfile((draft) => {
      draft.collegePrefs.priorities = draft.collegePrefs.priorities.includes(tag)
        ? draft.collegePrefs.priorities.filter((t) => t !== tag)
        : [...draft.collegePrefs.priorities, tag];
    });
  }

  return (
    <div className="col g-6">
      <Notice tone="info" icon="info">
        This is the single profile every feature reads from. Change your major here and college matching, the AP plan, project suggestions,
        practice targeting and your four-year plan all change with it.
      </Notice>

      <Card pad="md">
        <SectionHeader title="About you" />
        <div className="row g-3 wrap">
          <Field label="Name">
            {(f) => <input {...f} className="input" value={p.displayName} onChange={(e) => updateProfile((d) => { d.displayName = e.target.value; })} />}
          </Field>
          <Field label="School">
            {(f) => <input {...f} className="input" value={p.academics.school} onChange={(e) => updateProfile((d) => { d.academics.school = e.target.value; })} />}
          </Field>
          <Field label="State">
            {(f) => (
              <select {...f} className="select" value={p.academics.state} onChange={(e) => updateProfile((d) => { d.academics.state = e.target.value; })}>
                <option value="">Not set</option>
                {COLLEGE_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Academics" description="Used for honest preparation checks — never to predict an admission decision." />
        <div className="row g-3 wrap">
          <Field label="Grade">
            {(f) => (
              <select {...f} className="select" value={p.academics.grade} onChange={(e) => updateProfile((d) => { d.academics.grade = Number(e.target.value) as GradeLevel; })}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Graduation year">
            {(f) => (
              <input
                {...f}
                className="input"
                inputMode="numeric"
                value={p.academics.graduationYear}
                onChange={(e) => updateProfile((d) => { d.academics.graduationYear = Number(e.target.value) || d.academics.graduationYear; })}
              />
            )}
          </Field>
          <Field label="GPA" hint="Leave blank if you would rather not.">
            {(f) => (
              <input
                {...f}
                className="input"
                inputMode="decimal"
                value={p.academics.gpa ?? ''}
                onChange={(e) => updateProfile((d) => { d.academics.gpa = e.target.value ? Number(e.target.value) : undefined; })}
              />
            )}
          </Field>
          <Field label="GPA scale">
            {(f) => (
              <select {...f} className="select" value={p.academics.gpaScale} onChange={(e) => updateProfile((d) => { d.academics.gpaScale = e.target.value as GpaScale; })}>
                {SCALES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Study hours per week">
            {(f) => (
              <input
                {...f}
                className="input"
                inputMode="numeric"
                value={p.academics.weeklyStudyHours ?? ''}
                onChange={(e) => updateProfile((d) => { d.academics.weeklyStudyHours = e.target.value ? Number(e.target.value) : undefined; })}
              />
            )}
          </Field>
        </div>

        <div className="mt-4">
          <p className="label">Course rigour you want</p>
          <div className="row g-2 wrap">
            {RIGOR.map((r) => (
              <button key={r} type="button" className="chip chip-sm" aria-pressed={p.rigorTolerance === r} onClick={() => updateProfile((d) => { d.rigorTolerance = r; })}>
                {r}
              </button>
            ))}
          </div>
          <p className="hint mt-2">This caps how much the AP planner will put in any one year. Honest here means a plan you can actually follow.</p>
        </div>

        <Switch
          checked={p.academics.gpaWeighted ?? false}
          onChange={(v) => updateProfile((d) => { d.academics.gpaWeighted = v; })}
          label="My GPA is weighted"
          description="Weighted scales differ between schools, so we compare cautiously either way."
        />
      </Card>

      <Card pad="md">
        <SectionHeader title="Direction" description="What you are considering studying. Confidence changes how heavily it weighs on everything else." />
        {p.majors.length ? (
          <div className="col g-3">
            {p.majors.map((m) => (
              <div key={m.majorId} className="row between g-3 items-center wrap">
                <div>
                  <Link to={`/app/majors/${m.majorId}`} className="t-sm w-600">
                    {MAJOR_BY_ID.get(m.majorId)?.name ?? m.majorId}
                  </Link>
                  <p className="t-2xs faint mt-1">{MAJOR_BY_ID.get(m.majorId)?.family}</p>
                </div>
                <div className="row g-2 items-center">
                  {CONFIDENCES.map((c) => (
                    <button key={c} type="button" className="chip chip-sm" aria-pressed={m.confidence === c} onClick={() => setMajorConfidence(m.majorId, c)}>
                      {c}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="x"
                    aria-label="Remove"
                    onClick={() => updateProfile((d) => { d.majors = d.majors.filter((x) => x.majorId !== m.majorId); })}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="t-sm subtle">
            Nothing set. That is fine — the app works without it, though it can say much more once you name a direction.
          </p>
        )}
        <div className="row g-2 mt-4">
          <select
            className="select grow"
            value=""
            aria-label="Add a major"
            onChange={(e) => {
              if (e.target.value) {
                setMajorConfidence(e.target.value, 'exploring');
                toast('Added. Everything downstream has been recalculated.', 'ok');
              }
            }}
          >
            <option value="">Add a major…</option>
            {MAJORS.filter((m) => m.id !== 'undecided' && !p.majors.some((x) => x.majorId === m.id)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card pad="md">
        <SectionHeader title="Interests" description="Drives major matching, project generation and opportunity scoring." />
        <div className="row g-2 wrap mb-4">
          {INTEREST_CLUSTERS.map((c) => (
            <button key={c} type="button" className="chip chip-sm" aria-pressed={cluster === c} onClick={() => setCluster(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="row g-2 wrap">
          {INTERESTS.filter((i) => i.cluster === cluster).map((i) => (
            <button key={i.id} type="button" className="chip chip-sm" aria-pressed={p.interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
              {i.name}
            </button>
          ))}
        </div>

        {p.interests.length ? (
          <div className="mt-4">
            <p className="t-2xs eyebrow mb-2">Selected ({p.interests.length})</p>
            <div className="row g-2 wrap">
              {p.interests.map((i) => (
                <span key={i} className="chip chip-static chip-sm">
                  {INTEREST_BY_ID.get(i)?.name ?? i}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="row g-2 mt-4">
          <input
            className="input grow"
            value={newInterest}
            onChange={(e) => setNewInterest(e.target.value)}
            placeholder="Something not on the list"
            aria-label="Add your own interest"
          />
          <Button
            variant="ghost"
            icon="plus"
            onClick={() => {
              if (!newInterest.trim()) return;
              updateProfile((d) => {
                d.customInterests = [...d.customInterests, newInterest.trim()];
              });
              setNewInterest('');
              toast('Added. We keep it exactly as you wrote it.', 'ok');
            }}
          >
            Add
          </Button>
        </div>
        {p.customInterests.length ? (
          <div className="row g-2 mt-3 wrap">
            {p.customInterests.map((c) => (
              <span key={c} className="chip chip-sm">
                {c}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remove ${c}`}
                  onClick={() => updateProfile((d) => { d.customInterests = d.customInterests.filter((x) => x !== c); })}
                >
                  <Icon name="x" size={11} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      <Card pad="md">
        <SectionHeader title="College preferences" description="What you want from a college, which drives the personal-fit dimension." />
        <div className="row g-3 wrap">
          <Field label="Annual budget" hint="What your family can pay per year, after aid.">
            {(f) => (
              <input
                {...f}
                className="input"
                inputMode="numeric"
                value={p.collegePrefs.budgetPerYear ?? ''}
                onChange={(e) => updateProfile((d) => { d.collegePrefs.budgetPerYear = e.target.value ? Number(e.target.value) : undefined; })}
              />
            )}
          </Field>
          <Field label="How much cost matters" hint="1 means barely; 5 means it decides.">
            {(f) => (
              <select
                {...f}
                className="select"
                value={p.collegePrefs.aidImportance}
                onChange={(e) => updateProfile((d) => { d.collegePrefs.aidImportance = Number(e.target.value) as 1 | 2 | 3 | 4 | 5; })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Maximum distance (miles)" hint="Leave blank for no limit.">
            {(f) => (
              <input
                {...f}
                className="input"
                inputMode="numeric"
                value={p.collegePrefs.maxDistanceMiles ?? ''}
                onChange={(e) => updateProfile((d) => { d.collegePrefs.maxDistanceMiles = e.target.value ? Number(e.target.value) : undefined; })}
              />
            )}
          </Field>
        </div>

        <div className="mt-4">
          <p className="label">Regions you would consider</p>
          <div className="row g-2 wrap">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                className="chip chip-sm"
                aria-pressed={p.collegePrefs.regions.includes(r)}
                onClick={() =>
                  updateProfile((d) => {
                    d.collegePrefs.regions = d.collegePrefs.regions.includes(r)
                      ? d.collegePrefs.regions.filter((x) => x !== r)
                      : [...d.collegePrefs.regions, r];
                  })
                }
              >
                {r}
              </button>
            ))}
          </div>
          <p className="hint mt-2">Nothing selected means no regional preference.</p>
        </div>

        <div className="mt-4">
          <p className="label">What matters on campus</p>
          <div className="row g-2 wrap">
            {COLLEGE_PRIORITY_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="chip chip-sm"
                title={t.description}
                aria-pressed={p.collegePrefs.priorities.includes(t.id)}
                onClick={() => togglePriority(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {p.collegePrefs.priorities.length ? (
          <p className="t-2xs faint mt-3">
            <Badge tone="accent">{p.collegePrefs.priorities.length} selected</Badge> These feed directly into personal fit — a college scoring
            low there is one that does not match what you said you wanted, not a worse college.
          </p>
        ) : null}
      </Card>

      <Card pad="md">
        <SectionHeader title="What you told us you want" description="Your own words from onboarding. Nothing here was written by the app." />
        <textarea
          className="input textarea"
          rows={4}
          value={p.goals.idealExperience ?? ''}
          onChange={(e) => updateProfile((d) => { d.goals.idealExperience = e.target.value; })}
          placeholder="What you want the next four years to feel like."
          aria-label="Your ideal experience"
        />
        {p.goals.derivedThemes?.length ? (
          <div className="mt-4">
            <p className="t-2xs eyebrow mb-2">Themes we read from that</p>
            <div className="col g-2">
              {p.goals.derivedThemes.map((t) => (
                <div key={t.theme} className="row between g-3 t-xs">
                  <span className="w-600">{t.theme}</span>
                  <span className="subtle" style={{ fontStyle: 'italic' }}>
                    from &ldquo;{t.evidence}&rdquo;
                  </span>
                </div>
              ))}
            </div>
            <p className="t-2xs faint mt-2">If a theme here is wrong, rewrite the text above — we derive these rather than guessing at you.</p>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
