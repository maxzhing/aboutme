import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, NavCard } from '@/components/ui/shared';
import { DemoDataBanner, ProvenanceFooter } from '@/components/ui/Provenance';
import { BarChart } from '@/components/charts';
import { MAJOR_BY_ID, MAJORS } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { COLLEGE_BY_ID } from '@/data/colleges';
import { AP_COURSE_BY_ID, resolveAPCourses } from '@/data/ap';
import { INTEREST_BY_ID } from '@/data/interests';
import { buildStudentDNA } from '@/domain/engine/dna';
import { matchColleges } from '@/domain/engine/collegeMatch';
import { generateProjects } from '@/domain/engine/projects';
import { Icon } from '@/components/ui/Icon';
import { countLabel } from '@/lib/format';

/* Sections 13–14 — one major, in the depth a student actually needs. */

const INTENSITY_LABEL = ['', 'very light', 'light', 'moderate', 'heavy', 'very heavy'];

export function MajorDetail() {
  const { majorId } = useParams<{ majorId: string }>();
  const navigate = useNavigate();
  const ctx = useEngine();
  const { state, updateProfile, toggleSaved, toast } = useAppStore();

  const major = majorId ? MAJOR_BY_ID.get(majorId) : undefined;
  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);
  const collegeMatches = useMemo(() => matchColleges(ctx, { limit: 60 }), [ctx]);
  const projects = useMemo(() => generateProjects(ctx, 12), [ctx]);

  if (!major) {
    return (
      <div className="page">
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            No major with that id.{' '}
            <Link to="/app/majors" className="c-accent">
              Back to the major explorer
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const takingIds = new Set(resolveAPCourses(state.profile.academics.currentCourses).map((c) => c.id));
  const declared = state.profile.majors.find((m) => m.majorId === major.id);
  const isSaved = state.savedItems.some((s) => s.targetType === 'major' && s.targetId === major.id && s.status !== 'dismissed');
  const match = dna.majorMatches.find((m) => m.majorId === major.id);

  const strengthByKey = new Map(dna.academicStrengths.map((s) => [s.subject, s]));
  const relevantInterests = major.interestSignals.filter((i) => ctx.interestIds.includes(i));

  /* Colleges in the catalog that both offer and are known for this major. */
  const collegesOffering = collegeMatches
    .map((m) => ({ match: m, college: COLLEGE_BY_ID.get(m.collegeId) }))
    .filter((r) => r.college && r.college.majors.includes(major.id))
    .slice(0, 6);

  const knownFor = major.exampleProgramColleges.map((id) => COLLEGE_BY_ID.get(id)).filter(Boolean);

  const relatedProjects = projects.filter((p) => p.template.majorTags.includes(major.id)).slice(0, 4);

  const intensityData = [
    { label: 'Quantitative work', value: major.mathIntensity * 20, note: `${INTENSITY_LABEL[major.mathIntensity]} maths load` },
    { label: 'Writing', value: major.writingIntensity * 20, note: `${INTENSITY_LABEL[major.writingIntensity]} writing load` },
    { label: 'Lab / studio', value: major.labIntensity * 20, note: `${INTENSITY_LABEL[major.labIntensity]} practical load` },
  ];

  function declare(confidence: 'firm' | 'leaning' | 'exploring') {
    updateProfile((p) => {
      const existing = p.majors.find((m) => m.majorId === major!.id);
      if (existing) existing.confidence = confidence;
      else p.majors.push({ majorId: major!.id, confidence });
      p.majors = p.majors.filter((m) => m.majorId !== 'undecided');
    });
    toast(`${major!.name} is now part of your direction (${confidence}).`, 'ok');
  }

  function undeclare() {
    updateProfile((p) => {
      p.majors = p.majors.filter((m) => m.majorId !== major!.id);
    });
    toast(`${major!.name} removed from your direction.`, 'default');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={major.family}
        title={major.name}
        description={major.summary}
        back={{ to: '/app/majors', label: 'All majors' }}
        actions={
          <>
            <Button variant="ghost" icon="bookmark" onClick={() => toggleSaved('major', major.id)}>
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="ghost" icon="balance" onClick={() => navigate(`/app/majors/compare?a=${major.id}`)}>
              Compare
            </Button>
            {declared ? (
              <Button variant="soft" icon="check" onClick={undeclare}>
                On your path ({declared.confidence})
              </Button>
            ) : (
              <Button variant="primary" icon="plus" onClick={() => declare('exploring')}>
                Add to my direction
              </Button>
            )}
          </>
        }
      />

      {match ? (
        <Notice tone="ai" icon="sparkles">
          <span className="w-600">Why this came up for you.</span> {match.why.join(' ')} That is alignment with what you have told us, not a
          judgement about whether you would be good at it — the honest test is trying the work.
        </Notice>
      ) : null}

      <div className="split-aside mt-4">
        <div className="col g-4">
          <Card pad="md">
            <SectionHeader title="What you actually study" description="The substance of the degree, not the brochure version." />
            <ul className="col g-2">
              {major.whatYouStudy.map((w) => (
                <li key={w} className="row g-2 t-sm subtle">
                  <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>

            <SectionHeader title="Typical course sequence" className="mt-6" description="Names vary between colleges; the shape rarely does." />
            <div className="row g-2 wrap">
              {major.typicalCourses.map((c) => (
                <span key={c} className="chip chip-static chip-sm">
                  {c}
                </span>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="What the work feels like" description="Rough load profile, so a major does not surprise you in year one." />
            <BarChart data={intensityData} ariaLabel="Workload profile" unit="" format={(n: number) => `${Math.round(n / 20)}/5`} />
            <p className="t-2xs faint mt-3">
              Scales are relative to other undergraduate majors and vary a lot by college and by which electives you pick.
            </p>
          </Card>

          <Card pad="md">
            <SectionHeader title="Preparation that genuinely helps" description="AP courses that build the actual foundations — not a list to collect." />
            <div className="col g-3">
              <div>
                <p className="t-2xs eyebrow mb-2">Builds real foundations</p>
                <div className="row g-2 wrap">
                  {major.recommendedAP.map((id) => {
                    const course = AP_COURSE_BY_ID.get(id);
                    return (
                      <Link key={id} to={`/app/ap/course/${id}`} className="chip chip-sm">
                        {course?.name ?? id}
                        {takingIds.has(id) ? ' ✓' : ''}
                      </Link>
                    );
                  })}
                </div>
              </div>
              {major.usefulAP.length ? (
                <div>
                  <p className="t-2xs eyebrow mb-2">Useful, not essential</p>
                  <div className="row g-2 wrap">
                    {major.usefulAP.map((id) => (
                      <Link key={id} to={`/app/ap/course/${id}`} className="chip chip-sm">
                        {AP_COURSE_BY_ID.get(id)?.name ?? id}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Notice tone="info" icon="info" className="mt-4">
              Taking every AP on this list is not the goal. Colleges read depth and consistency, and an overloaded schedule that pulls your grades
              down helps nothing.
            </Notice>
            <Button size="sm" variant="ghost" to="/app/ap" iconRight="arrow-right" className="mt-3">
              See how these fit your AP plan
            </Button>
          </Card>

          <Card pad="md">
            <SectionHeader title="Ways to test this before you commit" description="Cheaper than changing major in your second year, and far more convincing on an application than a stated interest." />
            <div className="col g-3">
              {relatedProjects.length ? (
                relatedProjects.map((p) => (
                  <div key={p.template.id} className="card card-pad-sm">
                    <div className="row between g-2 items-start wrap">
                      <p className="t-sm w-600">{p.template.title}</p>
                      <Badge tone={p.feasibility === 'comfortable' ? 'ok' : p.feasibility === 'a-stretch' ? 'warn' : 'default'}>
                        {p.template.estimatedWeeks} weeks · {p.template.hoursPerWeek}h/week
                      </Badge>
                    </div>
                    <p className="t-xs subtle mt-2">{p.framing}</p>
                    <p className="t-2xs faint mt-2">Ends with: {p.template.finalProduct.slice(0, 2).join(', ')}.</p>
                  </div>
                ))
              ) : (
                <p className="t-sm subtle">
                  The project generator has not produced anything specific to this major from your current profile. Open the{' '}
                  <Link to="/app/projects" className="c-accent">
                    project studio
                  </Link>{' '}
                  to generate ideas directly.
                </p>
              )}
              {major.researchDirections.length ? (
                <div>
                  <p className="t-2xs eyebrow mb-2">Research directions in this field</p>
                  <ul className="col g-1">
                    {major.researchDirections.map((r) => (
                      <li key={r} className="t-xs subtle">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {major.competitions.length ? (
                <div>
                  <p className="t-2xs eyebrow mb-2">Competitions where this field shows up</p>
                  <div className="row g-2 wrap">
                    {major.competitions.map((c) => (
                      <span key={c} className="chip chip-static chip-sm">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader
              title="Where it can lead"
              description="Common paths, not a promise. A major opens doors; it does not assign you to one."
            />
            <div className="grid-fit">
              {major.careers.map((id) => {
                const career = CAREER_BY_ID.get(id);
                if (!career) return null;
                return (
                  <Link key={id} to={`/app/careers/${id}`} className="card card-pad-sm card-hover card-link">
                    <p className="t-sm w-600">{career.name}</p>
                    <p className="t-2xs subtle mt-2 clamp-3">{career.summary}</p>
                    <p className="t-2xs faint mt-2">{career.typicalEducation}</p>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="col g-4">
          <Card pad="md">
            <h3 className="t-sm w-600">How this lines up with you</h3>
            {relevantInterests.length ? (
              <div className="mt-3">
                <p className="t-2xs eyebrow mb-2">Your interests that point here</p>
                <div className="row g-2 wrap">
                  {relevantInterests.map((i) => (
                    <span key={i} className="chip chip-static chip-sm">
                      {INTEREST_BY_ID.get(i)?.name ?? i}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="t-xs subtle mt-2">
                None of the interests in your profile point specifically at this major. That is worth noticing — not a reason to rule it out, but
                a reason to try the work before committing.
              </p>
            )}

            <div className="col g-2 mt-4">
              {[
                { key: 'math', label: 'Maths', need: major.mathIntensity },
                { key: 'writing', label: 'Writing', need: major.writingIntensity },
                { key: 'science', label: 'Science', need: major.labIntensity },
              ].map((row) => {
                const s = strengthByKey.get(row.key);
                return (
                  <div key={row.key} className="row between g-2 t-xs">
                    <span className="subtle">
                      {row.label} · needs {INTENSITY_LABEL[row.need]}
                    </span>
                    <span className="w-600">{s ? s.band.replace('-', ' ') : 'no data yet'}</span>
                  </div>
                );
              })}
            </div>
            <p className="t-2xs faint mt-3">
              Bands come from your own grades and coursework. A &ldquo;developing&rdquo; band next to a heavy load is information, not a verdict.
            </p>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Skills you build</h3>
            <div className="row g-2 wrap mt-3">
              {major.skills.map((s) => (
                <span key={s} className="chip chip-static chip-sm">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {collegesOffering.length ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Your matched colleges offering it</h3>
              <div className="col g-2 mt-3">
                {collegesOffering.map(({ college, match: m }) => (
                  <Link key={college!.id} to={`/app/colleges/${college!.id}`} className="row between g-2 t-xs card-link">
                    <span className="w-600">{college!.shortName ?? college!.name}</span>
                    <span className="subtle">{m.overallBand}</span>
                  </Link>
                ))}
              </div>
              <Button size="sm" variant="ghost" to="/app/colleges/match" iconRight="arrow-right" className="mt-3">
                All matches
              </Button>
            </Card>
          ) : null}

          {knownFor.length ? (
            <Card pad="md">
              <h3 className="t-sm w-600">Known for this programme</h3>
              <p className="t-2xs faint mt-1">Demo data. Programme reputation is genuinely hard to verify — treat this as a starting point for research, not a ranking.</p>
              <div className="col g-1 mt-3">
                {knownFor.map((c) => (
                  <Link key={c!.id} to={`/app/colleges/${c!.id}`} className="t-xs c-accent">
                    {c!.shortName ?? c!.name}
                  </Link>
                ))}
              </div>
            </Card>
          ) : null}

          {major.relatedMajors.length ? (
            <Card pad="md">
              <h3 className="t-sm w-600">If this is close but not quite</h3>
              <div className="col g-2 mt-3">
                {major.relatedMajors.map((id) => {
                  const rel = MAJOR_BY_ID.get(id);
                  if (!rel) return null;
                  return (
                    <Link key={id} to={`/app/majors/${id}`} className="col g-1 card-link">
                      <span className="t-xs w-600">{rel.name}</span>
                      <span className="t-2xs subtle clamp-2">{rel.summary}</span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}

          <Card pad="md">
            <h3 className="t-sm w-600">Commit, or keep exploring</h3>
            <div className="col g-2 mt-3">
              <Button size="sm" variant={declared?.confidence === 'exploring' ? 'soft' : 'ghost'} onClick={() => declare('exploring')}>
                Exploring
              </Button>
              <Button size="sm" variant={declared?.confidence === 'leaning' ? 'soft' : 'ghost'} onClick={() => declare('leaning')}>
                Leaning toward it
              </Button>
              <Button size="sm" variant={declared?.confidence === 'firm' ? 'soft' : 'ghost'} onClick={() => declare('firm')}>
                Firm
              </Button>
              {declared ? (
                <Button size="sm" variant="ghost" icon="x" onClick={undeclare}>
                  Remove from my direction
                </Button>
              ) : null}
            </div>
            <p className="t-2xs faint mt-3">
              Confidence changes how strongly this major weighs on matching. &ldquo;Exploring&rdquo; keeps your options genuinely open.
            </p>
          </Card>
        </div>
      </div>

      <div className="grid-fit-lg mt-6">
        <NavCard to="/app/careers" icon="building" title="Career explorer" description="Where these paths actually go, and what the entry routes look like." />
        <NavCard to={`/app/colleges?major=${major.id}`} icon="graduation" title="Colleges with this major" description="Filter the catalog to colleges that offer it." />
        <NavCard to="/app/counselor" icon="sparkles" title="Ask about this major" description="Put a specific question to the counselor with your profile already loaded." />
      </div>

      <DemoDataBanner what="Course lists, competitions and example programmes for this major" />
      <ProvenanceFooter provenance={major.provenance} className="mt-4" />

      <p className="t-2xs faint mt-4">
        {countLabel(MAJORS.length - 1, 'major')} in this catalog. A real deployment would carry thousands, drawn from IPEDS programme data.
      </p>
    </div>
  );
}
