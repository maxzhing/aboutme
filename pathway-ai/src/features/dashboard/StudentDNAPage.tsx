import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { Badge, Button, Card } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, PriorityBadge, SectionHeader } from '@/components/ui/shared';
import { AIGuidanceNote } from '@/components/ui/Provenance';
import { RadarChart, BarChart, ProgressRing } from '@/components/charts';
import { buildStudentDNA } from '@/domain/engine/dna';
import { MAJOR_BY_ID } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { formatDateTime } from '@/lib/date';
import { printPDF } from '@/lib/export';

/* Section 4 — "Your Student DNA". */

const BAND_TONE = {
  'very-strong': 'ok',
  strong: 'accent',
  developing: 'warn',
  emerging: 'default',
} as const;

const TIER_LABEL = {
  'strong-match': 'Strong match',
  'possible-match': 'Possible match',
  exploration: 'Worth exploring',
} as const;

const TIER_TONE = { 'strong-match': 'ok', 'possible-match': 'accent', exploration: 'default' } as const;

export function StudentDNAPage() {
  const ctx = useEngine();
  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Your Student DNA"
        title="How your profile reads"
        description="Generated from what you have told us. Every band shows the evidence behind it, and anything we could not determine is stated rather than guessed."
        actions={
          <>
            <Button size="sm" icon="download" onClick={printPDF}>
              Export as PDF
            </Button>
            <Button size="sm" variant="ghost" to="/app/settings/profile" icon="edit">
              Edit profile
            </Button>
          </>
        }
      />

      <AIGuidanceNote />

      {dna.academicStrengths.length ? (
        <section className="mt-6">
          <SectionHeader
            title="Academic strengths"
            description="Derived from your interests, coursework, scores and activities — not from a test."
          />
          <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: 'var(--s-5)' }}>
            <div className="col g-3">
              {dna.academicStrengths.map((s) => (
                <Card key={s.subject} pad="md">
                  <div className="row between g-3 items-center">
                    <div>
                      <h3 className="t-md w-600" style={{ fontFamily: 'var(--font-sans)' }}>
                        {s.subject}
                      </h3>
                      <Badge tone={BAND_TONE[s.band]} className="mt-2">
                        {s.band.replace('-', ' ')}
                      </Badge>
                    </div>
                    <ProgressRing value={s.score} size={48} stroke={5} ariaLabel={`${s.subject}: ${s.score} of 100`} />
                  </div>
                  {s.evidence.length ? (
                    <div className="mt-3">
                      <p className="t-2xs eyebrow mb-2">Evidence</p>
                      <ul className="col g-1">
                        {s.evidence.map((e, i) => (
                          <li key={i} className="t-xs subtle">
                            • {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
            <Card pad="md" className="sticky-top" style={{ alignSelf: 'start' }}>
              <p className="eyebrow mb-3">At a glance</p>
              {dna.academicStrengths.length >= 3 ? (
                <RadarChart
                  axes={dna.academicStrengths.slice(0, 7).map((s) => ({ label: s.subject, value: s.score }))}
                  size={260}
                  ariaLabel="Your academic strength profile across axes"
                />
              ) : (
                <p className="t-sm subtle">Add more to your profile to see the shape of your strengths.</p>
              )}
            </Card>
          </div>
        </section>
      ) : null}

      {dna.interestProfile.length ? (
        <section className="mt-8">
          <SectionHeader title="Interest profile" description="Where your stated interests cluster." />
          <Card pad="md">
            <BarChart
              ariaLabel="Interest distribution across clusters"
              unit="%"
              data={dna.interestProfile.map((c) => ({
                label: c.cluster,
                value: c.weight,
                note: c.subjects.join(', '),
              }))}
            />
          </Card>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHeader
          title="Potential majors"
          description="Not one forced choice. Strong matches, possible matches, and directions worth exploring — each with the reason it appeared."
        />
        {dna.majorMatches.length ? (
          <div className="grid-fit">
            {dna.majorMatches.map((m) => {
              const major = MAJOR_BY_ID.get(m.majorId);
              if (!major) return null;
              return (
                <Card key={m.majorId} pad="md" hover>
                  <div className="row between g-2 items-start">
                    <Badge tone={TIER_TONE[m.tier]}>{TIER_LABEL[m.tier]}</Badge>
                    <span className="t-2xs faint mono">{m.relevance}</span>
                  </div>
                  <h3 className="t-md w-600 mt-3" style={{ fontFamily: 'var(--font-sans)' }}>
                    {major.name}
                  </h3>
                  <p className="t-2xs faint">{major.family}</p>
                  <ul className="col g-2 mt-3">
                    {m.why.map((w, i) => (
                      <li key={i} className="row-top g-2 t-xs muted">
                        <Icon name="check" size={12} className="c-ok shrink-0" style={{ marginTop: 3 }} />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="row g-2 mt-4">
                    <Button size="sm" variant="ghost" to={`/app/majors/${major.id}`} iconRight="chevron-right">
                      Explore
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card pad="md">
            <p className="t-sm subtle">
              Add a few interests and we can suggest majors. <Link to="/app/settings/profile">Update your profile</Link>.
            </p>
          </Card>
        )}
      </section>

      {dna.careerPaths.length ? (
        <section className="mt-8">
          <SectionHeader title="Career paths" description="Majors connect to careers — never exclusively, and never with a guarantee." />
          <div className="col g-3">
            {dna.careerPaths.map((c) => {
              const career = CAREER_BY_ID.get(c.careerId);
              if (!career) return null;
              return (
                <Card key={c.careerId} pad="md">
                  <div className="row between g-3 wrap">
                    <div className="grow">
                      <div className="row g-2 wrap items-center">
                        <h3 className="t-sm w-600">{career.name}</h3>
                        {ctx.careerIds.includes(c.careerId) ? <Badge tone="accent">You named this</Badge> : null}
                      </div>
                      <p className="t-xs subtle mt-2">{c.why}</p>
                      <div className="tag-list mt-3">
                        {c.viaMajorIds.map((m) => (
                          <Link key={m} to={`/app/majors/${m}`} className="chip chip-sm" style={{ textDecoration: 'none' }}>
                            {MAJOR_BY_ID.get(m)?.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" to={`/app/careers/${career.id}`} iconRight="chevron-right">
                      Details
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid-2 mt-8">
        <section>
          <SectionHeader title="Profile strengths" description="What genuinely stands out." />
          <div className="col g-3">
            {dna.profileStrengths.length ? (
              dna.profileStrengths.map((s) => (
                <Card key={s.title} pad="md">
                  <div className="row g-2">
                    <Icon name="star" size={16} className="c-ok shrink-0" style={{ marginTop: 2 }} />
                    <div>
                      <h3 className="t-sm w-600">{s.title}</h3>
                      <p className="t-xs muted mt-1">{s.detail}</p>
                      {s.evidence.length ? (
                        <ul className="col g-1 mt-2">
                          {s.evidence.slice(0, 3).map((e, i) => (
                            <li key={i} className="t-2xs faint">
                              • {e}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card pad="md">
                <p className="t-sm subtle">Add your activities and awards and this fills in.</p>
              </Card>
            )}
          </div>
        </section>

        <section>
          <SectionHeader
            title="Development opportunities"
            description="Where your profile could become stronger. These are not failures, and we have not invented any to give you work."
          />
          <div className="col g-3">
            {dna.developmentOpportunities.length ? (
              dna.developmentOpportunities.map((d) => (
                <Card key={d.title} pad="md">
                  <div className="row between g-2 items-start">
                    <h3 className="t-sm w-600">{d.title}</h3>
                    <PriorityBadge priority={d.priority} />
                  </div>
                  <p className="t-xs muted mt-2">{d.detail}</p>
                  {d.route ? (
                    <Button size="sm" variant="ghost" to={d.route} className="mt-3" iconRight="chevron-right">
                      Go there
                    </Button>
                  ) : null}
                </Card>
              ))
            ) : (
              <Card pad="md">
                <p className="t-sm">
                  Nothing significant stands out as a gap. That is a genuine result — we do not manufacture weaknesses.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>

      <p className="t-2xs faint mt-8">Generated {formatDateTime(dna.generatedAt)} from your current profile.</p>
    </div>
  );
}
