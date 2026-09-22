import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEngine } from '@/store/useEngine';
import { useAppStore } from '@/store/useAppStore';
import { Badge, Button, Card, Field, Notice, Tabs, useLocalState } from '@/components/ui/primitives';
import { DataRow, PageHeader, SectionHeader, Stat } from '@/components/ui/shared';
import { DemoDataBanner, SourceList } from '@/components/ui/Provenance';
import { BarChart } from '@/components/charts';
import { COLLEGES, COLLEGE_BY_ID } from '@/data/colleges';
import { SCHOLARSHIPS } from '@/data/scholarships';
import { SRC } from '@/data/provenance';
import type { College } from '@/domain/types';
import { compactCurrency, countLabel, currency, percent, sum } from '@/lib/format';
import { downloadCSV } from '@/lib/export';
import { Icon } from '@/components/ui/Icon';

/* --------------------------------------------------------------------------
   Section 54 — Financial planning.

   Two rules run through this whole screen:
     1. An estimate is never an aid offer. Every number here is a published
        average or a figure the student typed; the only body that can tell them
        what they will pay is the college's financial aid office.
     2. Sticker price is not the price. We show both, and we say which is which.
   ----------------------------------------------------------------------- */

interface CostLine {
  college: College;
  tuition?: number;
  housing?: number;
  sticker?: number;
  netPrice?: number;
  gapToBudget?: number;
  withinBudget?: boolean;
}

function stickerFor(c: College, residency: 'in' | 'out'): { tuition?: number; housing?: number; sticker?: number } {
  const tuition = c.control === 'public' ? (residency === 'in' ? c.tuitionInState : c.tuitionOutState) : c.tuitionInState ?? c.tuitionOutState;
  const housing = c.roomAndBoard;
  if (tuition === undefined) return { tuition, housing, sticker: undefined };
  return { tuition, housing, sticker: tuition + (housing ?? 0) };
}

export function CostPage() {
  const ctx = useEngine();
  const { state, updateProfile, toast } = useAppStore();
  const prefs = state.profile.collegePrefs;

  const [residency, setResidency] = useLocalState<'in' | 'out'>('cost.residency', 'in');
  const [tab, setTab] = useState('list');
  const [budgetDraft, setBudgetDraft] = useState(prefs.budgetPerYear !== undefined ? String(prefs.budgetPerYear) : '');
  const [savings, setSavings] = useLocalState('cost.savings', '');
  const [workStudy, setWorkStudy] = useLocalState('cost.workstudy', '');

  const budget = prefs.budgetPerYear;

  const lines = useMemo<CostLine[]>(() => {
    const ids = state.collegeList.length ? state.collegeList.map((e) => e.collegeId) : [];
    const colleges = ids.map((id) => COLLEGE_BY_ID.get(id)).filter((c): c is College => Boolean(c));
    return colleges.map((college) => {
      const { tuition, housing, sticker } = stickerFor(college, residency);
      const netPrice = college.avgNetPrice;
      const gapToBudget = budget !== undefined && netPrice !== undefined ? netPrice - budget : undefined;
      return {
        college,
        tuition,
        housing,
        sticker,
        netPrice,
        gapToBudget,
        withinBudget: gapToBudget === undefined ? undefined : gapToBudget <= 0,
      };
    });
  }, [state.collegeList, residency, budget]);

  const priced = lines.filter((l) => l.netPrice !== undefined);
  const within = priced.filter((l) => l.withinBudget === true);
  const over = priced.filter((l) => l.withinBudget === false);
  const unknown = lines.filter((l) => l.netPrice === undefined);

  const householdContribution =
    (Number(savings) || 0) + (Number(workStudy) || 0);

  /* Whole catalog, so a student with an empty list still gets something useful. */
  const affordableInCatalog = useMemo(() => {
    if (budget === undefined) return [];
    return COLLEGES.filter((c) => c.avgNetPrice !== undefined && c.avgNetPrice <= budget)
      .sort((a, b) => (a.avgNetPrice ?? 0) - (b.avgNetPrice ?? 0))
      .slice(0, 12);
  }, [budget]);

  const generousAid = useMemo(
    () => COLLEGES.filter((c) => c.meetsFullNeed || c.noLoanAid).sort((a, b) => (a.avgNetPrice ?? 1e9) - (b.avgNetPrice ?? 1e9)),
    [],
  );

  const meritColleges = useMemo(() => COLLEGES.filter((c) => c.meritAid && (c.acceptanceRate ?? 0) > 20), []);

  const relevantScholarships = useMemo(() => {
    const signals = ctx.signalSet;
    return SCHOLARSHIPS.filter((s) => s.majorTags.some((t) => ctx.majorIds.includes(t) || signals.has(t))).slice(0, 6);
  }, [ctx]);

  const chartData = useMemo(
    () =>
      priced
        .slice()
        .sort((a, b) => (a.netPrice ?? 0) - (b.netPrice ?? 0))
        .slice(0, 12)
        .map((l) => ({ label: l.college.shortName ?? l.college.name, value: l.netPrice ?? 0 })),
    [priced],
  );

  function saveBudget() {
    const parsed = budgetDraft.trim() === '' ? undefined : Math.max(0, Math.round(Number(budgetDraft)));
    if (budgetDraft.trim() !== '' && (parsed === undefined || Number.isNaN(parsed))) {
      toast('Enter a whole number, or leave it blank to clear the budget.', 'warn');
      return;
    }
    updateProfile((p) => {
      p.collegePrefs.budgetPerYear = parsed;
    });
    toast(parsed === undefined ? 'Budget cleared.' : `Budget set to ${currency(parsed)} a year. Financial fit has been recalculated.`, 'ok');
  }

  function exportCosts() {
    downloadCSV(
      'pathway-college-costs.csv',
      lines.map((l) => ({
        College: l.college.name,
        State: l.college.state,
        Control: l.college.control,
        Tuition: l.tuition ?? '',
        'Housing and food': l.housing ?? '',
        'Sticker price': l.sticker ?? '',
        'Average net price': l.netPrice ?? '',
        'Meets full need': l.college.meetsFullNeed ? 'yes' : 'no',
        'No-loan policy': l.college.noLoanAid ? 'yes' : 'no',
        'Within stated budget': l.withinBudget === undefined ? 'unknown' : l.withinBudget ? 'yes' : 'no',
        Source: 'Pathway AI demo catalog — verify with the college',
      })),
    );
    toast('Cost table exported as CSV.', 'ok');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Colleges"
        title="Financial planning"
        description="What college actually costs, what aid typically covers, and which of your colleges land inside the budget you set. Estimates only — no number here is an aid offer."
        actions={
          <>
            <Button variant="ghost" icon="download" onClick={exportCosts} disabled={!lines.length}>
              Export CSV
            </Button>
            <Button variant="ghost" icon="map" to="/app/colleges/map">
              Fit map
            </Button>
          </>
        }
      />

      <Notice tone="warn" icon="alert">
        <span className="w-600">These are estimates, not financial aid determinations.</span> Average net price describes what aided students
        paid in a past year — your family&rsquo;s figure depends on income, assets, household size and the college&rsquo;s own formula. The only
        authoritative numbers come from each college&rsquo;s net price calculator and, after you apply, its official aid letter.
      </Notice>

      <DemoDataBanner what="Tuition, housing and net-price figures" />

      <div className="split-aside mt-4">
        <Card pad="md">
          <SectionHeader title="Your budget" description="Used by the financial fit dimension across the whole app. Change it here and matching updates immediately." />
          <div className="row g-3 wrap items-end">
            <Field label="Comfortable annual out-of-pocket" hint="Tuition, housing and fees your family expects to cover each year, after aid.">
              {(p) => (
                <div className="input-affix">
                  <span className="affix">$</span>
                  <input
                    {...p}
                    className="input"
                    inputMode="numeric"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 25000"
                  />
                </div>
              )}
            </Field>
            <Button onClick={saveBudget} icon="check">
              Save budget
            </Button>
          </div>

          <div className="row g-3 wrap mt-3">
            <Field label="Family savings per year" hint="Optional. Only stored on this device.">
              {(p) => (
                <div className="input-affix">
                  <span className="affix">$</span>
                  <input {...p} className="input" inputMode="numeric" value={savings} onChange={(e) => setSavings(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                </div>
              )}
            </Field>
            <Field label="Term-time earnings per year" hint="Work-study or a term-time job, if you plan on one.">
              {(p) => (
                <div className="input-affix">
                  <span className="affix">$</span>
                  <input {...p} className="input" inputMode="numeric" value={workStudy} onChange={(e) => setWorkStudy(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                </div>
              )}
            </Field>
          </div>

          {householdContribution > 0 ? (
            <p className="t-xs subtle mt-3">
              Those add up to <span className="mono w-600">{currency(householdContribution)}</span> a year
              {budget !== undefined ? (
                <>
                  {' '}
                  against a stated budget of <span className="mono w-600">{currency(budget)}</span>. We do not assume they cover the same
                  costs — enter the budget as what you can actually pay, all sources included.
                </>
              ) : (
                '.'
              )}
            </p>
          ) : null}

          <div className="row g-3 mt-4 wrap">
            <label className="col g-1">
              <span className="t-2xs eyebrow">Residency for public colleges</span>
              <select className="select" style={{ minWidth: 220 }} value={residency} onChange={(e) => setResidency(e.target.value as 'in' | 'out')}>
                <option value="in">In-state tuition</option>
                <option value="out">Out-of-state tuition</option>
              </select>
            </label>
            {state.profile.academics.state ? (
              <p className="t-2xs subtle self-center">
                You told us you are in {state.profile.academics.state}. Public colleges elsewhere will charge out-of-state rates.
              </p>
            ) : null}
          </div>
        </Card>

        <Card pad="md">
          <h3 className="t-sm w-600">Where your list stands</h3>
          {budget === undefined ? (
            <p className="t-xs subtle mt-2">Set a budget to see which colleges fall inside it.</p>
          ) : (
            <div className="col g-3 mt-3">
              <Stat label="Inside your budget" value={`${within.length} of ${priced.length}`} tone="var(--ok)" />
              <Stat label="Above your budget" value={String(over.length)} tone={over.length ? 'var(--warn)' : undefined} />
              {unknown.length ? <Stat label="No published net price" value={String(unknown.length)} /> : null}
              {priced.length ? (
                <p className="t-2xs subtle">
                  Average published net price across your list:{' '}
                  <span className="mono w-600">{currency(Math.round(sum(priced.map((l) => l.netPrice ?? 0)) / priced.length))}</span>
                </p>
              ) : null}
            </div>
          )}
          {over.length ? (
            <p className="t-xs c-warn mt-3">
              <Icon name="alert" size={12} /> Above-budget does not mean out of reach — the most expensive colleges on paper are often the ones
              with the largest aid budgets. Run each one&rsquo;s net price calculator before ruling it out.
            </p>
          ) : null}
        </Card>
      </div>

      <div className="mt-6">
        <Tabs
          ariaLabel="Financial planning sections"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'list', label: 'Your list', count: lines.length },
            { id: 'reach', label: 'What your budget reaches' },
            { id: 'aid', label: 'Aid & scholarships' },
            { id: 'learn', label: 'How aid works' },
          ]}
        />
      </div>

      {tab === 'list' ? (
        lines.length ? (
          <div className="col g-4 mt-4">
            {chartData.length > 2 ? (
              <Card pad="md">
                <SectionHeader title="Average net price across your list" description="Lowest first. Bars are what aided students paid on average, not what you will pay." />
                <BarChart data={chartData} format={(n: number) => currency(n)} ariaLabel="Average net price by college" />
              </Card>
            ) : null}

            <Card pad="none">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">College</th>
                      <th scope="col" className="ta-right">Tuition</th>
                      <th scope="col" className="ta-right">Housing &amp; food</th>
                      <th scope="col" className="ta-right">Sticker price</th>
                      <th scope="col" className="ta-right">Avg net price</th>
                      <th scope="col">Against your budget</th>
                      <th scope="col">Aid policy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines
                      .slice()
                      .sort((a, b) => (a.netPrice ?? Infinity) - (b.netPrice ?? Infinity))
                      .map((l) => (
                        <tr key={l.college.id}>
                          <th scope="row">
                            <Link to={`/app/colleges/${l.college.id}`}>{l.college.shortName ?? l.college.name}</Link>
                            <span className="block t-2xs faint">
                              {l.college.state} · {l.college.control}
                            </span>
                          </th>
                          <td className="mono ta-right">{l.tuition !== undefined ? currency(l.tuition) : '—'}</td>
                          <td className="mono ta-right">{l.housing !== undefined ? currency(l.housing) : '—'}</td>
                          <td className="mono ta-right">{l.sticker !== undefined ? currency(l.sticker) : '—'}</td>
                          <td className="mono ta-right">{l.netPrice !== undefined ? currency(l.netPrice) : <span className="faint">not published</span>}</td>
                          <td>
                            {l.withinBudget === undefined ? (
                              <span className="t-2xs faint">{budget === undefined ? 'no budget set' : 'unknown'}</span>
                            ) : l.withinBudget ? (
                              <Badge tone="ok">{currency(Math.abs(l.gapToBudget ?? 0))} under</Badge>
                            ) : (
                              <Badge tone="warn">{currency(l.gapToBudget ?? 0)} over</Badge>
                            )}
                          </td>
                          <td className="t-2xs subtle">
                            {l.college.meetsFullNeed ? <Badge tone="ok">Meets full need</Badge> : null}
                            {l.college.noLoanAid ? <Badge tone="info">No-loan</Badge> : null}
                            {l.college.meritAid ? <Badge>Merit aid</Badge> : null}
                            {!l.college.meetsFullNeed && !l.college.noLoanAid && !l.college.meritAid ? '—' : null}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card pad="md">
              <SectionHeader title="Run the official calculators" description="Every US college that takes federal aid must publish a net price calculator. Twenty minutes with each one beats any estimate on this page." />
              <div className="grid-fit">
                {lines.map((l) => (
                  <div key={l.college.id} className="card card-pad-sm">
                    <p className="t-sm w-600">{l.college.shortName ?? l.college.name}</p>
                    {l.college.netPriceCalculatorUrl ? (
                      <a className="t-xs c-accent row g-1 mt-2" href={l.college.netPriceCalculatorUrl} target="_blank" rel="noreferrer noopener">
                        <Icon name="external" size={11} /> Net price calculator
                      </a>
                    ) : (
                      <p className="t-2xs faint mt-2">
                        We do not hold a verified calculator link for this college. Search its financial aid site rather than trusting a guess.
                      </p>
                    )}
                    {l.college.admissionsUrl ? (
                      <a className="t-xs c-accent row g-1 mt-1" href={l.college.admissionsUrl} target="_blank" rel="noreferrer noopener">
                        <Icon name="external" size={11} /> Admissions site
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card pad="lg" className="mt-4">
            <p className="t-sm subtle ta-center">
              Your college list is empty, so there is nothing to cost out yet.{' '}
              <Link to="/app/colleges/match" className="c-accent">
                Find matches
              </Link>{' '}
              and add a few, or look at what your budget reaches in the next tab.
            </p>
          </Card>
        )
      ) : null}

      {tab === 'reach' ? (
        <div className="col g-4 mt-4">
          {budget === undefined ? (
            <Card pad="lg">
              <p className="t-sm subtle ta-center">Set an annual budget above and this tab will show which colleges in the catalog land inside it.</p>
            </Card>
          ) : (
            <>
              <Card pad="md">
                <SectionHeader
                  title={`Inside ${currency(budget)} a year on published averages`}
                  description={`${countLabel(affordableInCatalog.length, 'college')} in this catalog, cheapest first. Averages hide a lot of variation — a college above the line can still be cheaper for you than one below it.`}
                />
                {affordableInCatalog.length ? (
                  <div className="grid-fit">
                    {affordableInCatalog.map((c) => (
                      <Link key={c.id} to={`/app/colleges/${c.id}`} className="card card-pad-sm card-hover card-link">
                        <p className="t-sm w-600">{c.shortName ?? c.name}</p>
                        <p className="t-2xs subtle mt-1">
                          {c.city}, {c.state}
                        </p>
                        <p className="t-md mono w-600 mt-2">{currency(c.avgNetPrice ?? 0)}</p>
                        <p className="t-2xs faint">average net price</p>
                        {c.pctReceivingAid !== undefined ? <p className="t-2xs subtle mt-2">{percent(c.pctReceivingAid)} of students receive aid</p> : null}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="t-sm subtle">
                    Nothing in this catalog publishes an average net price at or below {currency(budget)}. That is a limit of a 56-college demo
                    catalog, not a statement about your options: in-state publics, community college transfer paths and colleges with large
                    merit programmes routinely land well below it.
                  </p>
                )}
              </Card>

              <Card pad="md">
                <SectionHeader title="Colleges that commit to meeting full demonstrated need" description="Where a high sticker price most often turns into a low real price. Policy as published — always confirm on the college's own aid page." />
                <div className="grid-fit">
                  {generousAid.slice(0, 9).map((c) => (
                    <Link key={c.id} to={`/app/colleges/${c.id}`} className="card card-pad-sm card-hover card-link">
                      <div className="row between g-2 items-start">
                        <p className="t-sm w-600">{c.shortName ?? c.name}</p>
                        {c.noLoanAid ? <Badge tone="info">No-loan</Badge> : null}
                      </div>
                      <div className="row g-3 mt-3 t-2xs">
                        <span className="col g-0">
                          <span className="faint">Sticker</span>
                          <span className="mono">{compactCurrency(stickerFor(c, residency).sticker)}</span>
                        </span>
                        <span className="col g-0">
                          <span className="faint">Avg net</span>
                          <span className="mono w-600 c-ok">{compactCurrency(c.avgNetPrice)}</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>

              {meritColleges.length ? (
                <Card pad="md">
                  <SectionHeader title="Where merit aid is part of the picture" description="Colleges that offer merit awards to first-year students and admit a meaningful share of applicants. Merit aid is competitive and never guaranteed." />
                  <div className="row g-2 wrap">
                    {meritColleges.map((c) => (
                      <Link key={c.id} to={`/app/colleges/${c.id}`} className="chip chip-sm">
                        {c.shortName ?? c.name}
                      </Link>
                    ))}
                  </div>
                </Card>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'aid' ? (
        <div className="col g-4 mt-4">
          <Card pad="md">
            <SectionHeader title="Scholarships that connect to your direction" description="Matched against the majors and interests in your profile. Every deadline and amount here is demo data — verify on the sponsor's own site before you rely on it." />
            {relevantScholarships.length ? (
              <div className="col g-3">
                {relevantScholarships.map((s) => (
                  <div key={s.id} className="card card-pad-sm">
                    <div className="row between g-3 items-start wrap">
                      <div>
                        <p className="t-sm w-600">{s.name}</p>
                        <p className="t-2xs subtle mt-1">{s.sponsor}</p>
                      </div>
                      <Badge tone="accent">{s.amountText}</Badge>
                    </div>
                    <p className="t-xs subtle mt-2">{s.description}</p>
                  </div>
                ))}
                <Button variant="ghost" to="/app/scholarships" iconRight="arrow-right" size="sm">
                  Open the scholarship finder
                </Button>
              </div>
            ) : (
              <p className="t-sm subtle">
                Nothing in the demo scholarship set lines up with your profile yet. Add majors or interests and this will fill in — or browse the{' '}
                <Link to="/app/scholarships" className="c-accent">
                  full scholarship finder
                </Link>
                .
              </p>
            )}
          </Card>

          <Card pad="md">
            <SectionHeader title="The forms, and when they open" description="Dates below are the usual pattern in recent years. Confirm the current cycle on the official sites — we do not hold verified dates for the coming year." />
            <DataRow label="FAFSA" value="Free Application for Federal Student Aid" note="Required for federal grants, work-study and federal loans. Opens in the autumn before the academic year; file as early as you can, because some aid is first-come." />
            <DataRow label="CSS Profile" value="Used by many private colleges" note="A separate, more detailed form for institutional aid. Fee waivers are available. Not every college uses it — check each one." />
            <DataRow label="Institutional forms" value="College-specific" note="Some colleges ask for additional documents, particularly for divorced or self-employed parents." />
            <SourceList sources={[SRC.fafsa, SRC.netPrice]} className="mt-3" />
          </Card>
        </div>
      ) : null}

      {tab === 'learn' ? (
        <div className="col g-4 mt-4">
          <Card pad="md">
            <SectionHeader title="Sticker price is not the price" description="The single most expensive misunderstanding in college admissions." />
            <div className="col g-3">
              <div>
                <p className="t-sm w-600">Cost of attendance</p>
                <p className="t-xs subtle mt-1">
                  Tuition, fees, housing, food, books and an allowance for travel and personal costs. This is the published number, and almost
                  nobody with financial need pays it.
                </p>
              </div>
              <div>
                <p className="t-sm w-600">Need-based aid</p>
                <p className="t-xs subtle mt-1">
                  Grants and scholarships you do not repay, awarded on your family&rsquo;s finances. Some colleges commit to meeting demonstrated
                  need in full; most do not, and the gap between what a formula says you can pay and what a college actually funds is real.
                </p>
              </div>
              <div>
                <p className="t-sm w-600">Merit aid</p>
                <p className="t-xs subtle mt-1">
                  Awarded for academic or other strengths regardless of need. It is most common at colleges trying to attract students who have
                  other options, which is why the most selective colleges often offer none at all.
                </p>
              </div>
              <div>
                <p className="t-sm w-600">Net price</p>
                <p className="t-xs subtle mt-1">
                  Cost of attendance minus gift aid. This is the number that matters, and the only reliable way to estimate yours before applying
                  is the college&rsquo;s own net price calculator.
                </p>
              </div>
              <div>
                <p className="t-sm w-600">Loans are not aid you keep</p>
                <p className="t-xs subtle mt-1">
                  An aid letter that closes the gap with loans has not made the college cheaper. Read what is a grant and what is borrowed before
                  comparing two offers.
                </p>
              </div>
            </div>
          </Card>

          <Card pad="md">
            <SectionHeader title="Questions worth asking each financial aid office" description="Directly, by email or phone. They answer these all the time." />
            <ul className="col g-2">
              {[
                'Does your published aid policy meet full demonstrated need, and how is need determined?',
                'Is the aid package I receive in first year typically renewed at the same level for all four years?',
                'What happens to my aid if my family circumstances change mid-degree?',
                'What merit awards exist, and is there a separate application or deadline for them?',
                'How much of a typical package is grant, and how much is loan or work expectation?',
                'Do you require the CSS Profile, and is there a fee waiver?',
              ].map((q) => (
                <li key={q} className="row g-2 t-sm subtle">
                  <Icon name="chevron-right" size={13} className="mt-1 shrink-0" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Notice tone="info" icon="info">
            Pathway AI does not calculate your Student Aid Index, model your family&rsquo;s tax position, or estimate what any individual college
            would offer you. Those depend on information we deliberately do not collect. What we do here is arrange published averages next to
            the budget you set, so you know which conversations to have.
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
