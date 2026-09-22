import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Chip, SearchInput, Tabs } from '@/components/ui/primitives';
import { PageHeader, SectionHeader, ExplainCard, FeedbackButtons } from '@/components/ui/shared';
import { AIGuidanceNote, DemoDataBanner } from '@/components/ui/Provenance';
import { MAJORS, MAJOR_BY_ID, MAJOR_FAMILIES } from '@/data/majors';
import { CAREER_BY_ID } from '@/data/careers';
import { INTEREST_BY_ID } from '@/data/interests';
import { buildStudentDNA } from '@/domain/engine/dna';
import { explanation } from '@/domain/engine/explain';
import { searchItems } from '@/lib/search';
import { countLabel } from '@/lib/format';
import { Icon } from '@/components/ui/Icon';

/* --------------------------------------------------------------------------
   Sections 12–14 — Major explorer.

   The DNA engine already decided which majors line up with this student. This
   page makes that reasoning visible: every match carries its evidence, and
   nothing is ranked by prestige or earnings.
   ----------------------------------------------------------------------- */

const TIER_LABEL: Record<string, string> = {
  'strong-match': 'Strong match',
  'possible-match': 'Worth a look',
  exploration: 'Exploration',
};

const TIER_TONE: Record<string, 'ok' | 'accent' | 'default'> = {
  'strong-match': 'ok',
  'possible-match': 'accent',
  exploration: 'default',
};

export function MajorExplorer() {
  const ctx = useEngine();
  const { state, updateProfile, toggleSaved, recordFeedback, toast } = useAppStore();
  const [tab, setTab] = useState('matches');
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [mathMax, setMathMax] = useState('all');

  const dna = useMemo(() => buildStudentDNA(ctx), [ctx]);
  const declared = state.profile.majors;
  const declaredIds = new Set(declared.map((m) => m.majorId));
  const savedIds = new Set(state.savedItems.filter((s) => s.targetType === 'major' && s.status !== 'dismissed').map((s) => s.targetId));

  const browse = useMemo(() => {
    let pool = MAJORS.filter((m) => m.id !== 'undecided');
    if (family !== 'all') pool = pool.filter((m) => m.family === family);
    if (mathMax !== 'all') pool = pool.filter((m) => m.mathIntensity <= Number(mathMax));
    if (query.trim()) {
      return searchItems(query, pool, [
        { get: (m) => m.name, weight: 1 },
        { get: (m) => m.family, weight: 0.7 },
        { get: (m) => m.skills, weight: 0.6 },
        { get: (m) => m.whatYouStudy, weight: 0.45 },
        { get: (m) => m.typicalCourses, weight: 0.4 },
      ]).map((r) => r.item);
    }
    return pool;
  }, [query, family, mathMax]);

  function declare(majorId: string, confidence: 'firm' | 'leaning' | 'exploring') {
    updateProfile((p) => {
      const existing = p.majors.find((m) => m.majorId === majorId);
      if (existing) existing.confidence = confidence;
      else p.majors.push({ majorId, confidence });
      p.majors = p.majors.filter((m) => m.majorId !== 'undecided');
    });
    toast(`${MAJOR_BY_ID.get(majorId)?.name} added to your direction. Everything else in the app has been recalculated.`, 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Academics"
        title="Majors"
        description="What each field actually involves, which ones line up with the evidence in your profile, and how to test a direction before you commit to it."
        actions={
          <>
            <Button variant="ghost" icon="balance" to="/app/majors/compare">
              Compare majors
            </Button>
            <Button variant="ghost" icon="building" to="/app/careers">
              Careers
            </Button>
          </>
        }
      />

      {declared.length ? (
        <Card pad="md">
          <div className="row between g-3 wrap items-start">
            <div>
              <p className="t-2xs eyebrow">Your stated direction</p>
              <div className="row g-2 mt-2 wrap">
                {declared.map((m) => (
                  <span key={m.majorId} className="chip chip-static">
                    {MAJOR_BY_ID.get(m.majorId)?.name ?? m.majorId}
                    <span className="t-2xs faint">· {m.confidence}</span>
                  </span>
                ))}
              </div>
            </div>
            <Button size="sm" variant="ghost" to="/app/settings/profile" icon="edit">
              Edit direction
            </Button>
          </div>
          <p className="t-xs subtle mt-3">
            Changing this changes everything downstream — colleges, AP plan, activities, projects, research and your four-year plan. It is meant
            to be revised; most students do.
          </p>
        </Card>
      ) : (
        <Card pad="md">
          <p className="t-sm">
            <Icon name="info" size={14} /> You have not committed to a direction yet, and that is a completely normal place to be. Matches below
            are drawn from your interests, coursework and activities rather than a declared major.
          </p>
        </Card>
      )}

      <div className="mt-6">
        <Tabs
          ariaLabel="Major explorer sections"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'matches', label: 'Matched to you', count: dna.majorMatches.length },
            { id: 'browse', label: 'Browse all', count: MAJORS.length - 1 },
            { id: 'saved', label: 'Saved', count: savedIds.size },
          ]}
        />
      </div>

      {tab === 'matches' ? (
        <div className="col g-4 mt-4">
          <AIGuidanceNote>
            These matches are generated from what you have told us — interests, grades, activities and coursework. They describe alignment, not
            aptitude, and they are not a prediction of how well you would do in a field. Nothing here closes a door.
          </AIGuidanceNote>

          {dna.missingInputs.length ? (
            <Card pad="md">
              <p className="t-2xs eyebrow">What would sharpen this</p>
              <ul className="col g-1 mt-2">
                {dna.missingInputs.map((m) => (
                  <li key={m} className="t-xs subtle">
                    • {m}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {dna.majorMatches.length ? (
            <div className="col g-3">
              {dna.majorMatches.map((match) => {
                const major = MAJOR_BY_ID.get(match.majorId);
                if (!major) return null;
                return (
                  <Card key={match.majorId} pad="md" hover>
                    <div className="row between g-3 items-start wrap">
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="row g-2 items-center wrap">
                          <Link to={`/app/majors/${major.id}`} className="t-md w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {major.name}
                          </Link>
                          <Badge tone={TIER_TONE[match.tier]}>{TIER_LABEL[match.tier]}</Badge>
                          {declaredIds.has(major.id) ? <Badge tone="info">On your path</Badge> : null}
                        </div>
                        <p className="t-2xs subtle mt-1">{major.family}</p>
                      </div>
                      <div className="row g-2">
                        <Button
                          size="sm"
                          variant={savedIds.has(major.id) ? 'soft' : 'ghost'}
                          icon="bookmark"
                          onClick={() => toggleSaved('major', major.id)}
                        >
                          {savedIds.has(major.id) ? 'Saved' : 'Save'}
                        </Button>
                        <Button size="sm" variant="ghost" to={`/app/majors/${major.id}`} iconRight="chevron-right">
                          Open
                        </Button>
                      </div>
                    </div>

                    <p className="t-sm muted mt-3">{major.summary}</p>

                    <div className="mt-4">
                      <ExplainCard
                        explanation={explanation({
                          whyThis: match.why.join(' '),
                          connection: `Connects to ${major.careers
                            .slice(0, 3)
                            .map((c) => CAREER_BY_ID.get(c)?.name ?? c)
                            .join(', ')}.`,
                          evidence: match.why,
                          uncertainty:
                            'Alignment is not aptitude, and it is not a forecast. Students change direction all the time, and the strongest signal is what happens when you actually try the work.',
                        })}
                      />
                    </div>

                    <div className="row between g-3 mt-4 wrap items-center">
                      <div className="row g-2 wrap">
                        {!declaredIds.has(major.id) ? (
                          <>
                            <Button size="sm" onClick={() => declare(major.id, 'exploring')}>
                              I&rsquo;m exploring this
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => declare(major.id, 'leaning')}>
                              I&rsquo;m leaning toward it
                            </Button>
                          </>
                        ) : (
                          <Badge tone="ok">Already part of your direction</Badge>
                        )}
                      </div>
                      <FeedbackButtons
                        compact
                        onFeedback={(kind) => {
                          recordFeedback({ targetType: 'major', targetId: major.id, kind });
                          toast(kind === 'not-interested' ? 'Noted — we will stop suggesting it.' : 'Thanks, that sharpens future suggestions.', 'default');
                        }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                We do not have enough in your profile to match majors honestly yet. Add a few interests and your current courses in{' '}
                <Link to="/app/settings/profile" className="c-accent">
                  your profile
                </Link>
                , and this will fill in.
              </p>
            </Card>
          )}

          {dna.careerPaths.length ? (
            <Card pad="md">
              <SectionHeader
                title="Where these lead"
                description="Careers that commonly follow from the majors above. No major guarantees a career, and most careers are reachable from several majors."
                action={
                  <Button size="sm" variant="ghost" to="/app/careers" iconRight="arrow-right">
                    Career explorer
                  </Button>
                }
              />
              <div className="grid-fit">
                {dna.careerPaths.slice(0, 6).map((p) => {
                  const career = CAREER_BY_ID.get(p.careerId);
                  if (!career) return null;
                  return (
                    <Link key={p.careerId} to={`/app/careers/${career.id}`} className="card card-pad-sm card-hover card-link">
                      <p className="t-sm w-600">{career.name}</p>
                      <p className="t-2xs subtle mt-2">{p.why}</p>
                      <p className="t-2xs faint mt-2">
                        via {p.viaMajorIds.map((m) => MAJOR_BY_ID.get(m)?.name ?? m).join(', ')}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'browse' ? (
        <div className="col g-4 mt-4">
          <DemoDataBanner what="Course lists, competitions and example programmes" />
          <Card pad="md">
            <div className="row g-3 wrap">
              <SearchInput value={query} onChange={setQuery} label="Search majors" placeholder="Search by name, skill or subject…" />
              <select className="select" style={{ maxWidth: 240 }} value={family} onChange={(e) => setFamily(e.target.value)} aria-label="Major family">
                <option value="all">All families</option>
                {MAJOR_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select className="select" style={{ maxWidth: 230 }} value={mathMax} onChange={(e) => setMathMax(e.target.value)} aria-label="Maximum maths intensity">
                <option value="all">Any maths load</option>
                <option value="2">Light maths (1–2)</option>
                <option value="3">Moderate maths (up to 3)</option>
                <option value="4">Heavy maths (up to 4)</option>
              </select>
            </div>
            {ctx.interestIds.length ? (
              <div className="row g-2 mt-3 wrap items-center">
                <span className="t-xs subtle">Your interests:</span>
                {ctx.interestIds.slice(0, 8).map((i) => (
                  <Chip key={i} size="sm" onClick={() => setQuery(INTEREST_BY_ID.get(i)?.name ?? i)}>
                    {INTEREST_BY_ID.get(i)?.name ?? i}
                  </Chip>
                ))}
              </div>
            ) : null}
          </Card>

          <p className="t-xs subtle">{countLabel(browse.length, 'major')} shown.</p>

          <div className="grid-fit">
            {browse.map((m) => (
              <Link key={m.id} to={`/app/majors/${m.id}`} className="card card-pad card-hover card-link">
                <div className="row between g-2 items-start">
                  <h3 className="t-sm w-600">{m.name}</h3>
                  {declaredIds.has(m.id) ? <Badge tone="info">Yours</Badge> : savedIds.has(m.id) ? <Icon name="bookmark" size={13} /> : null}
                </div>
                <p className="t-2xs eyebrow mt-1">{m.family}</p>
                <p className="t-xs subtle mt-3 clamp-3">{m.summary}</p>
                <div className="row g-3 mt-4 t-2xs faint wrap">
                  <span>Maths {m.mathIntensity}/5</span>
                  <span>Writing {m.writingIntensity}/5</span>
                  <span>Lab {m.labIntensity}/5</span>
                </div>
              </Link>
            ))}
          </div>

          {!browse.length ? (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">
                Nothing matched.{' '}
                <button type="button" className="c-accent" onClick={() => { setQuery(''); setFamily('all'); setMathMax('all'); }}>
                  Clear the filters
                </button>
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'saved' ? (
        <div className="mt-4">
          {savedIds.size ? (
            <div className="grid-fit">
              {Array.from(savedIds).map((id: string) => {
                const m = MAJOR_BY_ID.get(id);
                if (!m) return null;
                return (
                  <Card key={id} pad="md" hover>
                    <div className="row between g-2 items-start">
                      <Link to={`/app/majors/${m.id}`} className="t-sm w-600" style={{ color: 'inherit', textDecoration: 'none' }}>
                        {m.name}
                      </Link>
                      <Button size="sm" variant="ghost" icon="x" aria-label="Remove from saved" onClick={() => toggleSaved('major', m.id)} />
                    </div>
                    <p className="t-xs subtle mt-2 clamp-3">{m.summary}</p>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">Nothing saved yet. Bookmark a major from the matches or browse tab and it will appear here.</p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
