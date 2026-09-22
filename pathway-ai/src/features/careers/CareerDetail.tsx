import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, NavCard } from '@/components/ui/shared';
import { DemoDataBanner, ProvenanceFooter } from '@/components/ui/Provenance';
import { CAREER_BY_ID } from '@/data/careers';
import { MAJOR_BY_ID } from '@/data/majors';
import { findOpportunities } from '@/domain/engine/opportunities';
import { Icon } from '@/components/ui/Icon';

/* Section 15 — one career, honestly. */

export function CareerDetail() {
  const { careerId } = useParams<{ careerId: string }>();
  const ctx = useEngine();
  const { state, updateProfile, toggleSaved, toast } = useAppStore();

  const career = careerId ? CAREER_BY_ID.get(careerId) : undefined;
  const scored = useMemo(() => findOpportunities(ctx, {}, 60), [ctx]);

  if (!career) {
    return (
      <div className="page">
        <Card pad="lg">
          <p className="t-sm subtle ta-center">
            No career with that id.{' '}
            <Link to="/app/careers" className="c-accent">
              Back to the career explorer
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  const stated = state.profile.careers.includes(career.id);
  const isSaved = state.savedItems.some((s) => s.targetType === 'career' && s.targetId === career.id && s.status !== 'dismissed');
  const majorsOnPath = career.relatedMajors.filter((m) => ctx.majorIds.includes(m));

  /* Opportunities tagged with a major this career leads through. */
  const relatedMajorSet = new Set(career.relatedMajors);
  const relevantOpportunities = scored.filter((s) => s.opportunity.majorTags.some((t) => relatedMajorSet.has(t))).slice(0, 4);

  function toggleStated() {
    updateProfile((p) => {
      p.careers = p.careers.includes(career!.id) ? p.careers.filter((c) => c !== career!.id) : [...p.careers, career!.id];
    });
    toast(stated ? 'Removed from your stated interests.' : `${career!.name} noted as an interest.`, stated ? 'default' : 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Careers"
        title={career.name}
        description={career.summary}
        back={{ to: '/app/careers', label: 'All careers' }}
        actions={
          <>
            <Button variant="ghost" icon="bookmark" onClick={() => toggleSaved('career', career.id)}>
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            <Button variant={stated ? 'soft' : 'primary'} icon={stated ? 'check' : 'plus'} onClick={toggleStated}>
              {stated ? 'Marked as interesting' : "I'm interested in this"}
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">{career.pathNote}</span>
      </Notice>

      <div className="split-aside mt-4">
        <div className="col g-4">
          <Card pad="md">
            <SectionHeader title="What the work actually involves" description="Day to day, not the job title version." />
            <ul className="col g-2">
              {career.dayToDay.map((d) => (
                <li key={d} className="row g-2 t-sm subtle">
                  <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card pad="md">
            <SectionHeader title="What high school can genuinely do for this" description="Real preparation. Not a checklist to perform for admissions." />
            <div className="col g-4">
              <div>
                <p className="t-2xs eyebrow mb-2">Coursework and skills</p>
                <ul className="col g-1">
                  {career.highSchoolPrep.map((p) => (
                    <li key={p} className="t-sm subtle">
                      • {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="t-2xs eyebrow mb-2">Activities where this work shows up</p>
                <ul className="col g-1">
                  {career.extracurriculars.map((e) => (
                    <li key={e} className="t-sm subtle">
                      • {e}
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="ghost" to="/app/activities" iconRight="arrow-right" className="mt-3">
                  Find activities like these
                </Button>
              </div>
            </div>
            <Notice tone="info" icon="info" className="mt-4">
              Doing one of these seriously for two years beats doing five of them for a term. Depth is what reads as real — to admissions
              readers and to you.
            </Notice>
          </Card>

          {relevantOpportunities.length ? (
            <Card pad="md">
              <SectionHeader
                title="Opportunities that touch this field"
                description="Drawn from the demo opportunity catalog and filtered against this career's skills and industries."
                action={
                  <Button size="sm" variant="ghost" to="/app/activities" iconRight="arrow-right">
                    All opportunities
                  </Button>
                }
              />
              <div className="col g-2">
                {relevantOpportunities.map((s) => (
                  <div key={s.opportunity.id} className="card card-pad-sm">
                    <div className="row between g-2 items-start wrap">
                      <p className="t-sm w-600">{s.opportunity.name}</p>
                      <Badge>{s.opportunity.category.replace(/-/g, ' ')}</Badge>
                    </div>
                    <p className="t-xs subtle mt-2 clamp-2">{s.opportunity.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card pad="md">
            <SectionHeader title="The education route" description="The common path, which is not the only path." />
            <p className="t-sm">{career.typicalEducation}</p>
            <p className="t-xs subtle mt-3">
              Plenty of people reach this work by other routes — transfers, second degrees, apprenticeships, or long detours through something
              else entirely. Treat the typical path as the well-lit one, not the only one.
            </p>
          </Card>
        </div>

        <div className="col g-4">
          <Card pad="md">
            <h3 className="t-sm w-600">Majors that lead here</h3>
            <div className="col g-2 mt-3">
              {career.relatedMajors.map((id) => {
                const m = MAJOR_BY_ID.get(id);
                if (!m) return null;
                const onPath = ctx.majorIds.includes(id);
                return (
                  <Link key={id} to={`/app/majors/${id}`} className="row between g-2 card-link">
                    <span className="t-xs w-600">{m.name}</span>
                    {onPath ? <Badge tone="ok">Yours</Badge> : <Icon name="chevron-right" size={13} className="subtle" />}
                  </Link>
                );
              })}
            </div>
            {majorsOnPath.length ? (
              <p className="t-2xs mt-3" style={{ color: 'var(--ai-text)' }}>
                <Icon name="sparkles" size={11} /> Your current direction already points this way.
              </p>
            ) : (
              <p className="t-2xs faint mt-3">
                None of these is in your stated direction yet. Several careers are reachable from majors you have not considered — that is worth
                knowing before you narrow things.
              </p>
            )}
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Skills the work rewards</h3>
            <div className="row g-2 wrap mt-3">
              {career.skills.map((s) => (
                <span key={s} className="chip chip-static chip-sm">
                  {s}
                </span>
              ))}
            </div>
          </Card>

          <Card pad="md">
            <h3 className="t-sm w-600">Where people do this</h3>
            <div className="row g-2 wrap mt-3">
              {career.industries.map((i) => (
                <span key={i} className="chip chip-static chip-sm">
                  {i}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid-fit-lg mt-6">
        <NavCard to="/app/projects" icon="rocket" title="Build something in this space" description="Project ideas that let you find out whether the work suits you." />
        <NavCard to="/app/research" icon="microscope" title="Research and mentorship" description="Programmes where this kind of work happens at high school level." />
        <NavCard to="/app/counselor" icon="sparkles" title="Ask the counselor" description="Put a specific question about this path with your profile already loaded." />
      </div>

      <DemoDataBanner what="Career descriptions, education routes and industry lists" />
      <ProvenanceFooter provenance={career.provenance} className="mt-4" />
    </div>
  );
}
