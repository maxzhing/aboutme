import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { Button, Card, Chip, Field, Notice } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import {
  APOfferingPicker,
  CareerPicker,
  CustomEntryList,
  InterestPicker,
  MajorPicker,
  NumberField,
  PriorityPicker,
} from '@/components/forms/pickers';
import { REGIONS, COLLEGE_STATES } from '@/data/colleges';
import { AP_COURSES } from '@/data/ap';
import type { ActivityCategory, GradeLevel, GpaScale, RigorTolerance, StudentProfile } from '@/domain/types';
import { gradeToGradYear, nowISO, todayISO, addDays } from '@/lib/date';
import { uid } from '@/lib/id';
import { countLabel } from '@/lib/format';

/* ==========================================================================
   Onboarding — section 3
   Eight steps, never all at once. Everything except grade is skippable, and
   the wizard resumes where the student left off.
   ========================================================================== */

const STEPS = [
  { id: 'about', title: 'About you', sub: 'The basics we need before anything else can be personalised.' },
  { id: 'interests', title: 'What you genuinely enjoy', sub: 'Not what looks good — what you would read about on a Saturday.' },
  { id: 'majors', title: 'What you might study', sub: 'Undecided is a legitimate answer, and most students change direction at least once.' },
  { id: 'careers', title: 'Careers that sound interesting', sub: 'Being curious about something is not a commitment to it.' },
  { id: 'activities', title: 'What you do outside class', sub: 'Including a job or looking after family. Those count, and leaving them off makes your time look unexplained.' },
  { id: 'colleges', title: 'What you want from a college', sub: 'This matters more than any list of names.' },
  { id: 'testing', title: 'Testing', sub: 'Scores you have, and tests you plan to take.' },
  { id: 'goals', title: 'What you actually want', sub: 'In your own words. This single answer improves nearly every recommendation here.' },
] as const;

const ACTIVITY_CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 'club', label: 'Club' },
  { id: 'sport', label: 'Sport' },
  { id: 'music', label: 'Music' },
  { id: 'art', label: 'Art' },
  { id: 'research', label: 'Research' },
  { id: 'volunteering', label: 'Volunteering' },
  { id: 'competition', label: 'Competition' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'job', label: 'Paid work' },
  { id: 'internship', label: 'Internship' },
  { id: 'project', label: 'Personal project' },
  { id: 'community', label: 'Community' },
  { id: 'family', label: 'Family responsibility' },
  { id: 'other', label: 'Other' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { state, updateProfile, patch, toast } = useAppStore();
  const profile = state.profile;
  const [step, setStep] = useState(Math.min(profile.onboardingStep ?? 0, STEPS.length - 1));

  const set = useCallback(
    (fn: (p: StudentProfile) => void) => {
      updateProfile(fn);
    },
    [updateProfile],
  );

  const canAdvance = useMemo(() => {
    if (step === 0) return Boolean(profile.academics.grade);
    return true;
  }, [step, profile.academics.grade]);

  const goNext = () => {
    if (step === STEPS.length - 1) {
      patch((draft) => {
        draft.profile.onboardedAt = nowISO();
        draft.profile.onboardingStep = STEPS.length;
        // Seed a budget preference so the engine has the constraint immediately.
        if (draft.profile.collegePrefs.budgetPerYear) {
          draft.learnedPreferences.push({
            id: uid('pref'),
            statement: `Keep annual out-of-pocket cost at or below $${draft.profile.collegePrefs.budgetPerYear.toLocaleString()}`,
            kind: 'max-cost',
            value: draft.profile.collegePrefs.budgetPerYear,
            source: 'onboarding',
            active: true,
            createdAt: nowISO(),
          });
        }
      });
      toast('Profile created. Everything from here is built around it.', 'ok');
      navigate('/app');
      return;
    }
    const next = step + 1;
    setStep(next);
    set((p) => {
      p.onboardingStep = Math.max(p.onboardingStep, next);
    });
    window.scrollTo({ top: 0 });
  };

  const current = STEPS[step];

  return (
    <div className="ob-wrap">
      <header className="ob-header">
        <div className="ob-header-inner">
          <div className="row between g-3">
            <div className="row g-3">
              <span className="logo" aria-hidden="true">P</span>
              <span className="wordmark">Pathway AI</span>
            </div>
            <span className="t-xs subtle mono">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="ob-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length} aria-label="Onboarding progress">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`ob-progress-seg${i < step ? ' is-done' : i === step ? ' is-current' : ''}`} />
            ))}
          </div>
        </div>
      </header>

      <div className="ob-body">
        <p className="eyebrow">{current.id === 'about' ? 'Getting started' : `Step ${step + 1}`}</p>
        <h1 className="ob-step-title mt-2">{current.title}</h1>
        <p className="ob-step-sub">{current.sub}</p>

        <div className="mt-7">
          {step === 0 ? <StepAbout profile={profile} set={set} /> : null}
          {step === 1 ? <StepInterests profile={profile} set={set} /> : null}
          {step === 2 ? <StepMajors profile={profile} set={set} /> : null}
          {step === 3 ? <StepCareers profile={profile} set={set} /> : null}
          {step === 4 ? <StepActivities /> : null}
          {step === 5 ? <StepColleges profile={profile} set={set} /> : null}
          {step === 6 ? <StepTesting profile={profile} set={set} /> : null}
          {step === 7 ? <StepGoals profile={profile} set={set} /> : null}
        </div>
      </div>

      <footer className="ob-footer">
        <div className="ob-footer-inner">
          {step > 0 ? (
            <Button icon="chevron-left" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : null}
          <span className="grow" />
          {step > 0 && step < STEPS.length - 1 ? (
            <Button variant="ghost" onClick={goNext}>
              Skip for now
            </Button>
          ) : null}
          <Button variant="primary" onClick={goNext} disabled={!canAdvance} iconRight={step === STEPS.length - 1 ? 'check' : 'chevron-right'}>
            {step === STEPS.length - 1 ? 'Finish and see my path' : 'Continue'}
          </Button>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 1 */

function StepAbout({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  const a = profile.academics;
  const [courseDraft, setCourseDraft] = useState('');

  return (
    <div className="col g-6">
      <Card pad="md">
        <div className="grid-2">
          <Field label="Grade" required hint="Everything else adapts to this.">
            {(props) => (
              <select
                {...props}
                className="select"
                value={a.grade}
                onChange={(e) => {
                  const grade = Number(e.target.value) as GradeLevel;
                  set((p) => {
                    p.academics.grade = grade;
                    p.academics.graduationYear = gradeToGradYear(grade);
                  });
                }}
              >
                {[9, 10, 11, 12].map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <NumberField
            label="Graduation year"
            value={a.graduationYear}
            onChange={(v) => set((p) => { p.academics.graduationYear = v ?? gradeToGradYear(p.academics.grade); })}
            min={new Date().getFullYear()}
            max={new Date().getFullYear() + 6}
            hint="Calculated from your grade — change it if yours is different."
          />
        </div>

        <div className="grid-2 mt-4">
          <Field label="School">
            {(props) => (
              <input {...props} className="input" value={a.school} placeholder="Riverside High School" onChange={(e) => set((p) => { p.academics.school = e.target.value; })} />
            )}
          </Field>
          <Field label="Country">
            {(props) => (
              <input {...props} className="input" value={a.country} onChange={(e) => set((p) => { p.academics.country = e.target.value; })} />
            )}
          </Field>
        </div>

        <div className="grid-2 mt-4">
          <Field label="State or province" hint="Used for in-state tuition and local opportunities.">
            {(props) => (
              <select {...props} className="select" value={a.state} onChange={(e) => set((p) => { p.academics.state = e.target.value; })}>
                <option value="">Select…</option>
                {COLLEGE_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="other">Other / not listed</option>
              </select>
            )}
          </Field>
          <Field label="GPA scale">
            {(props) => (
              <select {...props} className="select" value={a.gpaScale} onChange={(e) => set((p) => { p.academics.gpaScale = e.target.value as GpaScale; })}>
                <option value="4.0">4.0 unweighted</option>
                <option value="5.0">5.0 weighted</option>
                <option value="100">100-point</option>
                <option value="other">Other</option>
              </select>
            )}
          </Field>
        </div>

        <div className="grid-3 mt-4">
          <NumberField
            label="GPA"
            value={a.gpa}
            onChange={(v) => set((p) => { p.academics.gpa = v; })}
            step={0.01}
            placeholder={a.gpaScale === '100' ? '92' : '3.75'}
            hint="Optional, but almost everything academic depends on it."
          />
          <NumberField label="Class rank" value={a.classRank} onChange={(v) => set((p) => { p.academics.classRank = v; })} min={1} hint="If your school ranks." />
          <NumberField label="Class size" value={a.classSize} onChange={(v) => set((p) => { p.academics.classSize = v; })} min={1} />
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">Courses you are taking now</h2>
        <p className="t-sm subtle mt-2">
          The AP planner uses these to check prerequisites and workload, so it will not recommend something you are not ready for.
        </p>
        <div className="mt-4">
          <div className="row g-2">
            <input
              className="input"
              value={courseDraft}
              placeholder="e.g. AP Calculus AB"
              aria-label="Add a course"
              onChange={(e) => setCourseDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && courseDraft.trim()) {
                  e.preventDefault();
                  set((p) => { p.academics.currentCourses.push(courseDraft.trim()); });
                  setCourseDraft('');
                }
              }}
            />
            <Button
              icon="plus"
              disabled={!courseDraft.trim()}
              onClick={() => {
                set((p) => { p.academics.currentCourses.push(courseDraft.trim()); });
                setCourseDraft('');
              }}
            >
              Add
            </Button>
          </div>
          {a.currentCourses.length ? (
            <div className="tag-list mt-3">
              {a.currentCourses.map((c, i) => (
                <Chip key={`${c}-${i}`} onRemove={() => set((p) => { p.academics.currentCourses.splice(i, 1); })}>
                  {c}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="t-xs faint mt-3">No courses added yet.</p>
          )}
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">AP courses your school offers</h2>
        <p className="t-sm subtle mt-2">
          Without this we assume every AP course is available, which produces plans your school may not be able to deliver.
        </p>
        <div className="mt-4">
          <APOfferingPicker
            selected={a.schoolOffersAP}
            onChange={(next) => set((p) => { p.academics.schoolOffersAP = next; })}
          />
        </div>
        <p className="t-xs subtle mt-3">{countLabel(a.schoolOffersAP.length, 'course')} selected of {AP_COURSES.length}.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 2 */

function StepInterests({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  return (
    <div className="col g-6">
      <Notice tone="info">
        Pick everything that genuinely interests you, including things that seem unrelated to what you want to study. The
        combinations that cross categories are usually the most distinctive thing a student has.
      </Notice>
      <Card pad="md">
        <InterestPicker selected={profile.interests} onChange={(next) => set((p) => { p.interests = next; })} />
      </Card>
      <Card pad="md">
        <h2 className="section-title">Something not on the list?</h2>
        <p className="t-sm subtle mt-2 mb-4">Add it in your own words. We match custom entries against the catalog where we can.</p>
        <CustomEntryList
          values={profile.customInterests}
          onChange={(next) => set((p) => { p.customInterests = next; })}
          placeholder="e.g. audio production, linguistics of my heritage language"
          label="Add a custom interest"
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 3 */

function StepMajors({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  return (
    <div className="col g-6">
      <Notice tone="ai">
        Two or three possibilities are enough. Naming them sharpens every recommendation, and it is not a commitment —
        Computer Science + Economics produces a very different plan from Computer Science + Music, which is the point.
      </Notice>
      <MajorPicker value={profile.majors} onChange={(next) => set((p) => { p.majors = next; })} />
      {!profile.majors.length ? (
        <Card pad="md" inset>
          <p className="t-sm">
            <strong>Prefer to stay undecided?</strong> That is fine. The app will favour recommendations that keep options
            open rather than specialising early, and it will say so.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Step 4 */

function StepCareers({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  return (
    <div className="col g-6">
      <Card pad="md">
        <CareerPicker selected={profile.careers} onChange={(next) => set((p) => { p.careers = next; })} />
      </Card>
      <Card pad="md">
        <h2 className="section-title">Something else?</h2>
        <p className="t-sm subtle mt-2 mb-4">Add any career in your own words.</p>
        <CustomEntryList
          values={profile.customCareers}
          onChange={(next) => set((p) => { p.customCareers = next; })}
          placeholder="e.g. sound designer for games"
          label="Add a custom career"
        />
      </Card>
      <Notice>
        No major or college guarantees a career, and most people reach their work from several starting points. We use these to
        shape suggestions, not to lock you into a track.
      </Notice>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 5 */

function StepActivities() {
  const { state, addActivity, removeActivity } = useAppStore();
  const [draft, setDraft] = useState({
    name: '',
    category: 'club' as ActivityCategory,
    role: '',
    hoursPerWeek: '' as string,
    grades: [] as GradeLevel[],
    description: '',
    leadership: false,
  });

  const submit = () => {
    if (!draft.name.trim()) return;
    addActivity({
      name: draft.name.trim(),
      category: draft.category,
      role: draft.role.trim() || undefined,
      gradesInvolved: draft.grades.length ? draft.grades : [state.profile.academics.grade],
      hoursPerWeek: draft.hoursPerWeek ? Number(draft.hoursPerWeek) : undefined,
      weeksPerYear: 30,
      description: draft.description.trim() || undefined,
      accomplishments: [],
      leadership: draft.leadership,
      onApplicationList: true,
    });
    setDraft({ name: '', category: 'club', role: '', hoursPerWeek: '', grades: [], description: '', leadership: false });
  };

  return (
    <div className="col g-6">
      <Notice tone="info">
        Include paid work, caring for siblings, and anything you do alone. Leaving those off does not make your application
        look better — it makes your time look unexplained.
      </Notice>

      {state.profile.activities.length ? (
        <div className="col g-3">
          {state.profile.activities.map((a) => (
            <Card key={a.id} pad="sm">
              <div className="row between g-3">
                <div className="col grow">
                  <span className="t-sm w-600">{a.name}</span>
                  <span className="t-xs subtle">
                    {ACTIVITY_CATEGORIES.find((c) => c.id === a.category)?.label}
                    {a.role ? ` · ${a.role}` : ''}
                    {a.hoursPerWeek ? ` · ${a.hoursPerWeek} hrs/week` : ''}
                  </span>
                </div>
                <Button size="xs" variant="ghost" icon="trash" onClick={() => removeActivity(a.id)} aria-label={`Remove ${a.name}`} />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Card pad="md">
        <h2 className="section-title">Add an activity</h2>
        <div className="col g-4 mt-4">
          <div className="grid-2">
            <Field label="Name" required>
              {(props) => (
                <input {...props} className="input" value={draft.name} placeholder="Riverside Robotics" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              )}
            </Field>
            <Field label="Type">
              {(props) => (
                <select {...props} className="select" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ActivityCategory })}>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <div className="grid-2">
            <Field label="Your role" hint="Member is a real answer.">
              {(props) => <input {...props} className="input" value={draft.role} placeholder="Software lead" onChange={(e) => setDraft({ ...draft, role: e.target.value })} />}
            </Field>
            <Field label="Hours per week" hint="An honest estimate is more useful than a flattering one.">
              {(props) => (
                <input {...props} className="input" type="number" min={0} max={60} value={draft.hoursPerWeek} onChange={(e) => setDraft({ ...draft, hoursPerWeek: e.target.value })} />
              )}
            </Field>
          </div>
          <div className="field">
            <span className="label">Grades involved</span>
            <div className="tag-list">
              {[9, 10, 11, 12].map((g) => (
                <Chip
                  key={g}
                  selected={draft.grades.includes(g as GradeLevel)}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      grades: draft.grades.includes(g as GradeLevel)
                        ? draft.grades.filter((x) => x !== g)
                        : [...draft.grades, g as GradeLevel],
                    })
                  }
                >
                  Grade {g}
                </Chip>
              ))}
            </div>
          </div>
          <Field label="What you actually do" hint="Two sentences now saves an hour when you write your application list.">
            {(props) => (
              <textarea {...props} className="textarea" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            )}
          </Field>
          <label className="check">
            <input type="checkbox" checked={draft.leadership} onChange={(e) => setDraft({ ...draft, leadership: e.target.checked })} />
            <span>
              <span className="check-title">I hold a leadership role here</span>
              <span className="check-desc">Real responsibility, not just a title</span>
            </span>
          </label>
          <Button variant="primary" icon="plus" onClick={submit} disabled={!draft.name.trim()}>
            Add activity
          </Button>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 6 */

function StepColleges({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  const prefs = profile.collegePrefs;
  return (
    <div className="col g-6">
      <Card pad="md">
        <h2 className="section-title">Where</h2>
        <div className="col g-4 mt-4">
          <div className="field">
            <span className="label">Regions you would consider</span>
            <div className="tag-list">
              {REGIONS.map((r) => (
                <Chip
                  key={r}
                  selected={prefs.regions.includes(r)}
                  onClick={() =>
                    set((p) => {
                      p.collegePrefs.regions = p.collegePrefs.regions.includes(r)
                        ? p.collegePrefs.regions.filter((x) => x !== r)
                        : [...p.collegePrefs.regions, r];
                    })
                  }
                >
                  {r}
                </Chip>
              ))}
            </div>
            <p className="hint">Leave all unselected if location is genuinely open.</p>
          </div>
          <NumberField
            label="Maximum distance from home"
            value={prefs.maxDistanceMiles}
            onChange={(v) => set((p) => { p.collegePrefs.maxDistanceMiles = v; })}
            min={0}
            step={50}
            suffix="miles"
            hint="Leave blank if there is no limit."
          />
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">What kind of place</h2>
        <div className="col g-4 mt-4">
          <div className="field">
            <span className="label">Campus setting</span>
            <div className="tag-list">
              {(['urban', 'suburban', 'rural', 'no-preference'] as const).map((s) => (
                <Chip
                  key={s}
                  selected={prefs.settings.includes(s)}
                  onClick={() =>
                    set((p) => {
                      p.collegePrefs.settings = p.collegePrefs.settings.includes(s)
                        ? p.collegePrefs.settings.filter((x) => x !== s)
                        : [...p.collegePrefs.settings, s];
                    })
                  }
                >
                  {s === 'no-preference' ? 'No preference' : s[0].toUpperCase() + s.slice(1)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label">Size</span>
            <div className="tag-list">
              {(['small', 'medium', 'large', 'no-preference'] as const).map((s) => (
                <Chip
                  key={s}
                  selected={prefs.sizes.includes(s)}
                  onClick={() =>
                    set((p) => {
                      p.collegePrefs.sizes = p.collegePrefs.sizes.includes(s)
                        ? p.collegePrefs.sizes.filter((x) => x !== s)
                        : [...p.collegePrefs.sizes, s];
                    })
                  }
                >
                  {s === 'no-preference' ? 'No preference' : s === 'small' ? 'Small (under 3,000)' : s === 'medium' ? 'Medium (3,000–12,000)' : 'Large (12,000+)'}
                </Chip>
              ))}
            </div>
          </div>
          <Field label="Public or private">
            {(props) => (
              <select {...props} className="select" value={prefs.control} onChange={(e) => set((p) => { p.collegePrefs.control = e.target.value as typeof prefs.control; })}>
                <option value="no-preference">No preference</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            )}
          </Field>
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">Cost</h2>
        <p className="t-sm subtle mt-2">
          Cost decides more outcomes than fit does. Being honest here changes what we show you.
        </p>
        <div className="col g-4 mt-4">
          <NumberField
            label="Comfortable annual cost"
            value={prefs.budgetPerYear}
            onChange={(v) => set((p) => { p.collegePrefs.budgetPerYear = v; })}
            min={0}
            step={1000}
            suffix="per year"
            hint="What your family could actually pay each year, after aid."
          />
          <Field label="How much does financial aid matter?" hint="5 means aid decides where you can go.">
            {(props) => (
              <div className="col g-2">
                <input
                  {...props}
                  className="range"
                  type="range"
                  min={1}
                  max={5}
                  value={prefs.aidImportance}
                  onChange={(e) => set((p) => { p.collegePrefs.aidImportance = Number(e.target.value) as 1 | 2 | 3 | 4 | 5; })}
                />
                <div className="row between t-2xs faint">
                  <span>Not a factor</span>
                  <span className="w-600 c-accent">{prefs.aidImportance} / 5</span>
                  <span>Decides everything</span>
                </div>
              </div>
            )}
          </Field>
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">What you actually want there</h2>
        <p className="t-sm subtle mt-2 mb-4">Pick as many as genuinely apply. These drive personal fit more than anything else.</p>
        <PriorityPicker selected={prefs.priorities} onChange={(next) => set((p) => { p.collegePrefs.priorities = next; })} />
      </Card>

      <Card pad="md">
        <Field label="Anything else about what you want" hint="Free text. The AI reads it.">
          {(props) => (
            <textarea
              {...props}
              className="textarea"
              value={prefs.notes ?? ''}
              placeholder="e.g. I want to keep playing seriously without majoring in music."
              onChange={(e) => set((p) => { p.collegePrefs.notes = e.target.value; })}
            />
          )}
        </Field>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 7 */

function StepTesting({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  const [apDraft, setApDraft] = useState({ subject: '', score: '' });
  const satScore = profile.scores.find((s) => s.kind === 'SAT');
  const actScore = profile.scores.find((s) => s.kind === 'ACT');
  const psatScore = profile.scores.find((s) => s.kind === 'PSAT');

  const upsert = (kind: 'SAT' | 'ACT' | 'PSAT', total?: number) =>
    set((p) => {
      const existing = p.scores.find((s) => s.kind === kind);
      if (total === undefined) {
        p.scores = p.scores.filter((s) => s.kind !== kind);
      } else if (existing) {
        existing.total = total;
      } else {
        p.scores.push({ id: uid('score'), kind, total, official: true });
      }
    });

  return (
    <div className="col g-6">
      <Notice>
        Leave anything blank that you have not taken. A missing score is fine; a guessed one produces bad advice.
      </Notice>

      <Card pad="md">
        <h2 className="section-title">Scores you have</h2>
        <div className="grid-3 mt-4">
          <NumberField label="SAT total" value={satScore?.total} onChange={(v) => upsert('SAT', v)} min={400} max={1600} step={10} />
          <NumberField label="ACT composite" value={actScore?.total} onChange={(v) => upsert('ACT', v)} min={1} max={36} />
          <NumberField label="PSAT total" value={psatScore?.total} onChange={(v) => upsert('PSAT', v)} min={320} max={1520} step={10} />
        </div>
      </Card>

      <Card pad="md">
        <h2 className="section-title">AP exam scores</h2>
        <div className="row g-2 mt-4 wrap">
          <select className="select grow" value={apDraft.subject} onChange={(e) => setApDraft({ ...apDraft, subject: e.target.value })} aria-label="AP course">
            <option value="">Select a course…</option>
            {AP_COURSES.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="select" style={{ maxWidth: 110 }} value={apDraft.score} onChange={(e) => setApDraft({ ...apDraft, score: e.target.value })} aria-label="Score">
            <option value="">Score</option>
            {[1, 2, 3, 4, 5].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button
            icon="plus"
            disabled={!apDraft.subject || !apDraft.score}
            onClick={() => {
              set((p) => {
                p.scores.push({ id: uid('score'), kind: 'AP', subject: apDraft.subject, total: Number(apDraft.score), official: true });
              });
              setApDraft({ subject: '', score: '' });
            }}
          >
            Add
          </Button>
        </div>
        {profile.scores.filter((s) => s.kind === 'AP').length ? (
          <div className="tag-list mt-4">
            {profile.scores
              .filter((s) => s.kind === 'AP')
              .map((s) => (
                <Chip key={s.id} onRemove={() => set((p) => { p.scores = p.scores.filter((x) => x.id !== s.id); })}>
                  {s.subject}: {s.total}
                </Chip>
              ))}
          </div>
        ) : (
          <p className="t-xs faint mt-3">No AP scores recorded.</p>
        )}
      </Card>

      <Card pad="md">
        <h2 className="section-title">Tests you plan to take</h2>
        <p className="t-sm subtle mt-2">A planned date drives your whole study plan, so it is worth adding even approximately.</p>
        <div className="col g-3 mt-4">
          {profile.plannedTests.map((t) => (
            <div className="row between g-3" key={t.id}>
              <span className="t-sm">
                {t.kind}
                {t.subject ? ` — ${t.subject}` : ''}
                {t.date ? ` · ${t.date}` : ''}
              </span>
              <Button size="xs" variant="ghost" icon="x" onClick={() => set((p) => { p.plannedTests = p.plannedTests.filter((x) => x.id !== t.id); })} aria-label="Remove" />
            </div>
          ))}
          <div className="row g-2 wrap">
            <Button
              size="sm"
              icon="plus"
              onClick={() =>
                set((p) => {
                  p.plannedTests.push({ id: uid('pt'), kind: 'SAT', date: addDays(todayISO(), 90) });
                })
              }
            >
              Plan an SAT
            </Button>
            <Button
              size="sm"
              icon="plus"
              onClick={() =>
                set((p) => {
                  p.plannedTests.push({ id: uid('pt'), kind: 'ACT', date: addDays(todayISO(), 90) });
                })
              }
            >
              Plan an ACT
            </Button>
          </div>
        </div>
      </Card>

      <Card pad="md">
        <Field label="How much academic load can you carry?" hint="We cap AP recommendations at this rather than suggesting everything.">
          {() => (
            <div className="tag-list">
              {(['light', 'balanced', 'heavy'] as RigorTolerance[]).map((r) => (
                <Chip key={r} selected={profile.rigorTolerance === r} onClick={() => set((p) => { p.rigorTolerance = r; })}>
                  {r === 'light' ? 'Lighter — I want room to breathe' : r === 'balanced' ? 'Balanced' : 'Heavy — I want the most rigorous schedule'}
                </Chip>
              ))}
            </div>
          )}
        </Field>
        <div className="mt-4">
          <NumberField
            label="Hours a week you can genuinely study outside class"
            value={profile.academics.weeklyStudyHours}
            onChange={(v) => set((p) => { p.academics.weeklyStudyHours = v; })}
            min={0}
            max={40}
            suffix="hrs"
            hint="Be realistic. A plan you cannot follow is worse than no plan."
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Step 8 */

function StepGoals({ profile, set }: { profile: StudentProfile; set: (fn: (p: StudentProfile) => void) => void }) {
  const [goalDraft, setGoalDraft] = useState('');
  return (
    <div className="col g-6">
      <Card pad="md">
        <Field
          label="What would your ideal college experience look like?"
          hint="Write however much you want. The more specific you are, the better every recommendation gets."
        >
          {(props) => (
            <textarea
              {...props}
              className="textarea"
              style={{ minHeight: 190 }}
              value={profile.goals.idealExperience ?? ''}
              placeholder="I want somewhere I can keep playing piano seriously without majoring in it, with small enough classes that professors know me, and a city nearby for internships. Cost matters a lot — my family cannot take on large loans."
              onChange={(e) => set((p) => { p.goals.idealExperience = e.target.value; })}
            />
          )}
        </Field>
        <p className="t-2xs faint mt-3">
          {(profile.goals.idealExperience ?? '').trim().split(/\s+/).filter(Boolean).length} words. There is no right length.
        </p>
      </Card>

      <Card pad="md">
        <h2 className="section-title">Your own goals</h2>
        <p className="t-sm subtle mt-2 mb-4">Anything you want to hold yourself to. These appear in your weekly review.</p>
        <div className="row g-2">
          <input
            className="input"
            value={goalDraft}
            placeholder="e.g. Raise SAT to 1450 before spring"
            aria-label="Add a goal"
            onChange={(e) => setGoalDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && goalDraft.trim()) {
                e.preventDefault();
                set((p) => { p.goals.personalGoals.push({ id: uid('goal'), text: goalDraft.trim(), done: false, createdAt: nowISO() }); });
                setGoalDraft('');
              }
            }}
          />
          <Button
            icon="plus"
            disabled={!goalDraft.trim()}
            onClick={() => {
              set((p) => { p.goals.personalGoals.push({ id: uid('goal'), text: goalDraft.trim(), done: false, createdAt: nowISO() }); });
              setGoalDraft('');
            }}
          >
            Add
          </Button>
        </div>
        {profile.goals.personalGoals.length ? (
          <div className="col g-2 mt-4">
            {profile.goals.personalGoals.map((g) => (
              <div className="row between g-3" key={g.id}>
                <span className="t-sm">{g.text}</span>
                <Button size="xs" variant="ghost" icon="x" onClick={() => set((p) => { p.goals.personalGoals = p.goals.personalGoals.filter((x) => x.id !== g.id); })} aria-label="Remove goal" />
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card pad="md" className="card-accent">
        <div className="row-top g-3">
          <Icon name="sparkles" size={20} className="c-accent shrink-0" />
          <div>
            <h2 className="section-title">What happens next</h2>
            <p className="t-sm muted mt-2">
              We will generate your Student DNA — academic strengths with the evidence behind each one, major matches with
              reasons, and development areas stated without shaming you. From there, every part of the app draws on the same
              profile. You can change any of it at any time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
