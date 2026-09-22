import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, SearchInput } from '@/components/ui/primitives';
import { NavCard, PageHeader, SectionHeader } from '@/components/ui/shared';
import { DemoDataBanner, ProvenanceChip } from '@/components/ui/Provenance';
import { COLLEGES, REGIONS } from '@/data/colleges';
import { MAJORS, MAJOR_BY_ID } from '@/data/majors';
import { matchColleges } from '@/domain/engine/collegeMatch';
import { CollegeMatchCard } from './CollegeCard';
import { compactCurrency, countLabel, percent } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* College explorer home — browse plus a jump into personalised matching. */

export function CollegeHome() {
  const ctx = useEngine();
  const { state } = useAppStore();
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('all');
  const [control, setControl] = useState('all');
  const [major, setMajor] = useState('all');
  const [maxNetPrice, setMaxNetPrice] = useState('all');

  const topMatches = useMemo(() => matchColleges(ctx, { limit: 3 }), [ctx]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COLLEGES.filter((c) => {
      if (q && !`${c.name} ${c.shortName ?? ''} ${c.city} ${c.state}`.toLowerCase().includes(q)) return false;
      if (region !== 'all' && c.region !== region) return false;
      if (control !== 'all' && c.control !== control) return false;
      if (major !== 'all' && !c.majors.includes(major)) return false;
      if (maxNetPrice !== 'all' && (c.avgNetPrice ?? Infinity) > Number(maxNetPrice)) return false;
      return true;
    });
  }, [query, region, control, major, maxNetPrice]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Colleges"
        title="Research, match, compare and track"
        description="Browse the catalog, or let the engine match colleges against your academic direction, preferences, opportunities and budget."
        actions={
          <>
            <Button icon="bookmark" to="/app/colleges/list">
              My list ({state.collegeList.length})
            </Button>
            <Button variant="primary" icon="compass" to="/app/colleges/match">
              Find my colleges
            </Button>
          </>
        }
      />

      <DemoDataBanner what="All college figures in this build" />

      <div className="grid-fit-lg">
        <NavCard to="/app/colleges/match" icon="compass" title="Find my colleges" description="Personalised matching across academic, personal, opportunity and financial fit — each explained separately." />
        <NavCard to="/app/colleges/compare" icon="grid" title="Compare colleges" description="Side-by-side across every dimension, with no single overall score." meta={<Badge>{countLabel(state.collegeList.length, 'saved')}</Badge>} />
        <NavCard to="/app/colleges/map" icon="map" title="Fit map" description="Plot colleges on two dimensions you choose — cost against selectivity, size against fit." />
        <NavCard to="/app/colleges/cost" icon="wallet" title="Financial planning" description="Cost, aid, net price and what your stated budget actually reaches." />
      </div>

      {topMatches.length ? (
        <section className="mt-8">
          <SectionHeader
            title="Your top matches right now"
            description="Ordered by fit with what you have told us — not by prestige, and not by your chance of admission."
            action={
              <Button size="sm" variant="ghost" to="/app/colleges/match" iconRight="arrow-right">
                See all matches
              </Button>
            }
          />
          <div className="col g-3">
            {topMatches.map((m) => (
              <CollegeMatchCard key={m.collegeId} match={m} showRank />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <SectionHeader title={`Browse all colleges`} description={`${countLabel(filtered.length, 'college')} in this catalog.`} />
        <Card pad="md" className="mb-4">
          <div className="row g-3 wrap">
            <SearchInput value={query} onChange={setQuery} label="Search colleges" placeholder="Search by name, city or state…" />
            <select className="select" style={{ maxWidth: 180 }} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
              <option value="all">All regions</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select className="select" style={{ maxWidth: 150 }} value={control} onChange={(e) => setControl(e.target.value)} aria-label="Public or private">
              <option value="all">Public & private</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <select className="select" style={{ maxWidth: 220 }} value={major} onChange={(e) => setMajor(e.target.value)} aria-label="Offers major">
              <option value="all">Any major</option>
              {MAJORS.filter((m) => m.id !== 'undecided').map((m) => (
                <option key={m.id} value={m.id}>
                  Offers {m.name}
                </option>
              ))}
            </select>
            <select className="select" style={{ maxWidth: 200 }} value={maxNetPrice} onChange={(e) => setMaxNetPrice(e.target.value)} aria-label="Maximum net price">
              <option value="all">Any net price</option>
              <option value="15000">Under $15k</option>
              <option value="25000">Under $25k</option>
              <option value="35000">Under $35k</option>
              <option value="50000">Under $50k</option>
            </select>
          </div>
          {ctx.majorIds.length ? (
            <div className="row g-2 mt-3 wrap">
              <span className="t-xs subtle">Quick filter:</span>
              {ctx.majorIds.map((m) => (
                <button key={m} type="button" className="chip chip-sm" onClick={() => setMajor(m)}>
                  Offers {MAJOR_BY_ID.get(m)?.name}
                </button>
              ))}
              {ctx.constraints.maxCostPerYear ? (
                <button type="button" className="chip chip-sm" onClick={() => setMaxNetPrice(String(ctx.constraints.maxCostPerYear))}>
                  Within my budget
                </button>
              ) : null}
            </div>
          ) : null}
        </Card>

        {filtered.length ? (
          <div className="grid-fit">
            {filtered.map((c) => (
              <Link key={c.id} to={`/app/colleges/${c.id}`} className="card card-pad card-hover card-link">
                <div className="row between g-2 items-start">
                  <div style={{ minWidth: 0 }}>
                    <h3 className="t-sm w-600 clamp-2">{c.shortName ?? c.name}</h3>
                    <p className="t-2xs subtle mt-1">
                      {c.city}, {c.state}
                    </p>
                  </div>
                  <ProvenanceChip provenance={c.provenance} compact />
                </div>
                <p className="t-xs subtle mt-3 clamp-3">{c.blurb}</p>
                <div className="row g-3 mt-4 t-2xs faint wrap">
                  {c.acceptanceRate !== undefined ? (
                    <span className="row g-1">
                      <Icon name="users" size={11} /> {percent(c.acceptanceRate)}
                    </span>
                  ) : null}
                  {c.avgNetPrice !== undefined ? (
                    <span className="row g-1">
                      <Icon name="wallet" size={11} /> {compactCurrency(c.avgNetPrice)}
                    </span>
                  ) : null}
                  <span className="row g-1">
                    <Icon name="building" size={11} /> {c.sizeBand}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Card pad="lg">
            <p className="t-sm subtle ta-center">
              No colleges matched those filters.{' '}
              <button type="button" className="c-accent" onClick={() => { setQuery(''); setRegion('all'); setControl('all'); setMajor('all'); setMaxNetPrice('all'); }}>
                Clear all filters
              </button>
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}
