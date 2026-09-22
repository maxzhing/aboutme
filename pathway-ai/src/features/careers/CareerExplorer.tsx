import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Notice, SearchInput, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader } from '@/components/ui/shared';
import { DemoDataBanner } from '@/components/ui/Provenance';
import { CAREERS, CAREER_BY_ID } from '@/data/careers';
import { MAJOR_BY_ID } from '@/data/majors';
import { buildStudentDNA } from '@/domain/engine/dna';
import { searchItems } from '@/lib/search';
import { countLabel, uniq } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* Section 15 — career explorer. Directions, never destinies. */

export function CareerExplorer() {
  const ctx = useEngine();
  const { state, updateProfile, toast } = useAppStore();
  const [tab, setTab] = useState('yours');
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('all');

  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);
  const stated = new Set(state.profile.careers);
  const savedIds = new Set(
    state.savedItems.filter((s) => s.targetType === 'career' && s.status !== 'dismissed').map((s) => s.targetId),
  );

  const industries = useMemo(() => uniq(CAREERS.flatMap((c) => c.industries)).sort(), []);

  const browse = useMemo(() => {
    let pool = CAREERS;
    if (industry !== 'all') pool = pool.filter((c) => c.industries.includes(industry));
    if (!query.trim()) return pool;
    return searchItems(query, pool, [
      { get: (c) => c.name, weight: 1 },
      { get: (c) => c.summary, weight: 0.5 },
      { get: (c) => c.skills, weight: 0.6 },
      { get: (c) => c.industries, weight: 0.5 },
      { get: (c) => c.dayToDay, weight: 0.4 },
    ]).map((r) => r.item);
  }, [query, industry]);

  function toggleStated(careerId: string) {
    updateProfile((p) => {
      p.careers = p.careers.includes(careerId) ? p.careers.filter((c) => c !== careerId) : [...p.careers, careerId];
    });
    toast(
      stated.has(careerId)
        ? 'Removed from your stated interests.'
        : `${CAREER_BY_ID.get(careerId)?.name} added. Matching across the app now takes it into account.`,
      stated.has(careerId) ? 'default' : 'ok',
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Academics"
        title="Careers"
        description="What these jobs actually involve day to day, which majors lead toward them, and what is worth doing in high school. Nothing here predicts where you will end up."
        actions={
          <Button variant="ghost" icon="book" to="/app/majors">
            Majors
          </Button>
        }
      />

      <Notice tone="info" icon="info">
        Careers change shape faster than any catalog can track, and most people end up somewhere they had not heard of at sixteen. Use these
        pages to understand what the work is like, not to lock in a destination.
      </Notice>

      <div className="mt-6">
        <Tabs
          ariaLabel="Career explorer sections"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'yours', label: 'From your direction', count: dna.careerPaths.length },
            { id: 'browse', label: 'Browse all', count: CAREERS.length },
            { id: 'stated', label: 'Your interests', count: stated.size },
          ]}
        />
      </div>

      {tab === 'yours' ? (
        <div className="col g-4 mt-4">
          {dna.careerPaths.length ? (
            <div className="grid-fit">
              {dna.careerPaths.map((p) => {
                const career = CAREER_BY_ID.get(p.careerId);
                if (!career) return null;
                return (
                  <Card key={p.careerId} pad="md" hover>
                    <div className="row between g-2 items-start">
                      <Link to={`/app/careers/${career.id}`} className="t-md w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {career.name}
                      </Link>
                      {stated.has(career.id) ? <Badge tone="info">Stated</Badge> : null}
                    </div>
                    <p className="t-xs subtle mt-2">{career.summary}</p>
                    <p className="t-2xs mt-3" style={{ color: 'var(--ai-text)' }}>
                      <Icon name="sparkles" size={11} /> {p.why}
                    </p>
                    <p className="t-2xs faint mt-2">
                      Reached via {p.viaMajorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m).join(', ')}
                    </p>
                    <div className="row g-2 mt-4">
                      <Button size="sm" variant={stated.has(career.id) ? 'soft' : 'ghost'} icon={stated.has(career.id) ? 'check' : 'plus'} onClick={() => toggleStated(career.id)}>
                        {stated.has(career.id) ? 'Interested' : "I'm interested"}
                      </Button>
                      <Button size="sm" variant="ghost" to={`/app/careers/${career.id}`} iconRight="chevron-right">
                        Open
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                Add a major or a few interests in{' '}
                <Link to="/app/majors" className="c-accent">
                  the major explorer
                </Link>{' '}
                and career paths will appear here.
              </p>
            </Card>
          )}

          <Card pad="md">
            <SectionHeader
              title="A caution worth reading"
              description="The single most common mistake in career planning at this stage."
            />
            <p className="t-sm subtle">
              Picking a career first and reverse-engineering every decision from it tends to produce a narrow, brittle application and a
              miserable few years. The students who end up happiest chose things they wanted to understand, went deep, and let the career
              question resolve itself later — usually into something they could not have named in high school.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === 'browse' ? (
        <div className="col g-4 mt-4">
          <DemoDataBanner what="Career descriptions and typical education paths" />
          <Card pad="md">
            <div className="row g-3 wrap">
              <SearchInput value={query} onChange={setQuery} label="Search careers" placeholder="Search by name, skill or industry…" />
              <select className="select" style={{ maxWidth: 240 }} value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry">
                <option value="all">All industries</option>
                {industries.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <p className="t-xs subtle">{countLabel(browse.length, 'career')} shown.</p>

          <div className="grid-fit">
            {browse.map((c) => (
              <Link key={c.id} to={`/app/careers/${c.id}`} className="card card-pad card-hover card-link">
                <div className="row between g-2 items-start">
                  <h3 className="t-sm w-600">{c.name}</h3>
                  {stated.has(c.id) ? <Badge tone="info">Yours</Badge> : savedIds.has(c.id) ? <Icon name="bookmark" size={13} /> : null}
                </div>
                <p className="t-xs subtle mt-2 clamp-3">{c.summary}</p>
                <p className="t-2xs faint mt-3">{c.typicalEducation}</p>
                <div className="row g-1 mt-3 wrap">
                  {c.relatedMajors.slice(0, 3).map((m) => (
                    <span key={m} className="chip chip-static chip-sm">
                      {MAJOR_BY_ID.get(m)?.name ?? m}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          {!browse.length ? (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                Nothing matched.{' '}
                <button type="button" className="c-accent" onClick={() => { setQuery(''); setIndustry('all'); }}>
                  Clear the filters
                </button>
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'stated' ? (
        <div className="mt-4">
          {stated.size ? (
            <div className="grid-fit">
              {Array.from(stated).map((id: string) => {
                const c = CAREER_BY_ID.get(id);
                if (!c) {
                  return (
                    <Card key={id} pad="md">
                      <p className="t-sm w-600">{id}</p>
                      <p className="t-2xs faint mt-2">You entered this yourself — it is not in our catalog, so we cannot show detail for it.</p>
                    </Card>
                  );
                }
                return (
                  <Card key={id} pad="md" hover>
                    <div className="row between g-2 items-start">
                      <Link to={`/app/careers/${c.id}`} className="t-sm w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {c.name}
                      </Link>
                      <Button size="sm" variant="ghost" icon="x" aria-label="Remove" onClick={() => toggleStated(c.id)} />
                    </div>
                    <p className="t-xs subtle mt-2 clamp-3">{c.summary}</p>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                You have not marked any careers as interesting yet. That is fine — plenty of students do not, and the app works without it.
              </p>
            </Card>
          )}
          {state.profile.customCareers.length ? (
            <Card pad="md" className="mt-4">
              <p className="t-2xs eyebrow">Careers you typed yourself</p>
              <div className="row g-2 mt-2 wrap">
                {state.profile.customCareers.map((c) => (
                  <span key={c} className="chip chip-static chip-sm">
                    {c}
                  </span>
                ))}
              </div>
              <p className="t-2xs faint mt-3">
                We keep these exactly as you wrote them and use them for matching where we can, but we will not invent a career page we do not
                have real information for.
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
