/* Grant Match Engine — dashboard client.
   Vanilla ES modules, no build step. The client renders what the server proves;
   it never computes or softens an eligibility verdict of its own. */

import { createServerTransport } from './transport-server.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  capabilities: null,
  run: null,
  filters: { minScore: 0, deadline: '', eligibility: '', difficulty: '', funderType: '', applicantType: '', minAward: '', sort: 'balanced' },
  saved: [],
  tracker: [],
  alerts: [],
  streaming: null,
};

/* ------------------------------------------------------------------ utils */

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const money = (amount) =>
  amount === null || amount === undefined || !Number.isFinite(Number(amount))
    ? null
    : `$${Math.round(Number(amount)).toLocaleString('en-US')}`;

const titleCase = (text) => String(text || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Everything that leaves the interface goes through a transport. Two exist: one
 * talks to the engine server over HTTP, the other runs the engine in this page
 * over a bundled corpus. The rendering code below cannot tell them apart, which
 * is what lets one interface serve both builds.
 */
let transport = null;

/* ------------------------------------------------------------------ theme */

const savedTheme = localStorage.getItem('gme-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
else if (window.matchMedia?.('(prefers-color-scheme: light)').matches) document.documentElement.dataset.theme = 'light';

$('#themeToggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('gme-theme', next);
});

/* ------------------------------------------------------------------ views */

function showView(name) {
  $$('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.topnav button').forEach((button) => button.setAttribute('aria-selected', String(button.dataset.view === name)));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.topnav button').forEach((button) => {
  button.addEventListener('click', () => {
    const view = button.dataset.view;
    showView(view);
    if (view === 'saved') loadSaved();
    if (view === 'tracker') loadTracker();
    if (view === 'alerts') loadAlerts();
  });
});

/* -------------------------------------------------------------- bootstrap */

const EXAMPLES = [
  "I'm a high school student interested in robotics. I want funding to start a STEM outreach program for younger students in Maryland and need about $5,000.",
  'We are a 501(c)(3) food pantry in rural Ohio serving about 400 families a month. We need $40,000 for a refrigerated van.',
  'I run a two-person coffee roastery in Oakland and want $25,000 to buy a larger roaster and hire one part-time employee.',
  "I'm a painter in New Mexico looking for a fellowship or individual artist grant to fund six months of studio work.",
  'Our public middle school in Detroit wants $12,000 for classroom laptops and a coding club.',
];

async function bootstrap() {
  state.capabilities = await transport.capabilities();
  renderCapabilities();
  populateVocabulary();

  $('#exampleChips').innerHTML = EXAMPLES.map(
    (example, index) => `<button class="chip" data-example="${index}">${esc(example.slice(0, 52))}…</button>`,
  ).join('');
  $$('#exampleChips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      $('#description').value = EXAMPLES[Number(chip.dataset.example)];
      $('#description').focus();
    });
  });

  if (!transport.features?.alerts) {
    const button = $('#saveProfileBtn');
    button.textContent = 'Alerts need the engine server';
    button.title = transport.features.alertsNote;
    button.style.opacity = '0.65';
  }

  refreshCounts();
}

function renderCapabilities() {
  const { capabilities, degraded } = state.capabilities;
  const rows = Object.values(capabilities).map((capability) => `
    <div class="cap-row">
      <div class="cap-dot ${capability.available ? 'cap-on' : 'cap-off'}"></div>
      <div>
        <div class="cap-name">${esc(capability.name)} — ${capability.available ? 'active' : 'not configured'}</div>
        <div class="cap-note">${esc(capability.note)}</div>
      </div>
    </div>`).join('');

  $('#capabilities').innerHTML = `
    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-faint);margin-bottom:12px">
      What this deployment can see
    </h3>
    ${rows}
    ${degraded.length ? `<div class="notice" style="margin-top:14px"><div><strong>Coverage is limited right now.</strong>
      Results will be honest about the gap rather than filling it with guesses. ${degraded.length} source${degraded.length === 1 ? ' is' : 's are'} unavailable.</div></div>` : ''}
    ${transport.mode === 'local' ? connectPanel() : ''}`;

  const connectButton = $('#connectBtn');
  if (connectButton) connectButton.addEventListener('click', connectToEngine);
}

/** Offered only when the current transport cannot search live. */
function connectPanel() {
  return `
    <div class="notice info" style="margin-top:14px;display:block">
      <strong>Search live instead</strong>
      <p style="margin:4px 0 10px">Start the engine on your machine (<code class="mono">npm start</code>) and connect to it here.
      Federal opportunities need no API key at all; add a search key for foundations, state, local and corporate funders.</p>
      <div class="answer-row">
        <input type="text" id="engineUrl" value="http://localhost:8787" style="max-width:260px" aria-label="Engine URL">
        <button class="btn btn-sm" id="connectBtn">Connect</button>
        <span class="faint small" id="connectState"></span>
      </div>
    </div>`;
}

/**
 * Swap the local engine for a live one. The connection is proven by a real
 * request before anything is swapped, so a failed connect leaves the working
 * offline build untouched rather than half-broken.
 */
async function connectToEngine() {
  const url = $('#engineUrl').value.trim().replace(/\/+$/, '');
  const status = $('#connectState');
  if (!url) return;

  status.textContent = 'Connecting…';
  const candidate = createServerTransport(url);
  try {
    const capabilities = await candidate.capabilities();
    transport = candidate;
    state.capabilities = capabilities;
    state.run = null;
    renderCapabilities();
    populateVocabulary();
    refreshCounts();
    document.querySelector('.demo-banner')?.remove();
    $('#capabilities').insertAdjacentHTML('afterbegin',
      `<div class="notice info"><div><strong>Connected to the engine at ${esc(url)}.</strong>
        Searches now go to live sources. Results are real opportunities, verified against the funders' own pages.</div></div>`);
  } catch (error) {
    status.textContent = '';
    $('#capabilities').insertAdjacentHTML('beforeend',
      `<div class="notice danger"><div><strong>Could not reach an engine at ${esc(url)}.</strong>
        ${esc(error.message)} Start it with <code class="mono">npm start</code>, then try again.
        Nothing changed — this page is still running the offline engine.</div></div>`);
  }
}

function populateVocabulary() {
  const { vocabulary } = state.capabilities;
  const fill = (id, values, blank) => {
    const select = $(`#${id}`);
    select.innerHTML = (blank ? `<option value="">${blank}</option>` : '') +
      values.map((value) => `<option value="${esc(value[0] ?? value)}">${esc(value[1] ?? titleCase(value))}</option>`).join('');
  };
  fill('applicantType', vocabulary.applicantTypes, 'Not specified');
  fill('organizationStatus', vocabulary.organizationStatuses, 'Not specified');
  fill('fundingPurpose', vocabulary.fundingPurposes, null);
  fill('state', Object.entries(vocabulary.states), 'Not specified');
  fill('educationLevel', ['elementary', 'middle_school', 'high_school', 'undergraduate', 'graduate', 'doctoral'], 'Not specified');
  fill('deadlinePreference', [['any', 'Any deadline'], ['asap', 'As soon as possible'], ['within_3_months', 'Within 3 months'], ['within_year', 'Within a year']], null);
}

function collectProfile() {
  const value = (id) => $(`#${id}`).value.trim();
  return {
    rawDescription: value('description'),
    applicantType: value('applicantType') || null,
    state: value('state') || null,
    age: value('age') || null,
    citizenship: value('citizenship') || null,
    organizationStatus: value('organizationStatus') || null,
    educationLevel: value('educationLevel') || null,
    fundingNeeded: value('fundingNeeded') || null,
    deadlinePreference: value('deadlinePreference') || 'any',
    locationServed: value('locationServed') || null,
    previousAwards: value('previousAwards') || null,
    specialQualifications: value('specialQualifications') || null,
    fundingPurpose: [...$('#fundingPurpose').selectedOptions].map((option) => option.value),
  };
}

/* ----------------------------------------------------------------- search */

$('#searchBtn').addEventListener('click', () => runSearch());
$('#cancelBtn').addEventListener('click', () => {
  state.streaming?.abort();
  showView('intake');
});

async function runSearch(profileOverride) {
  const profile = profileOverride || collectProfile();
  if (!profile.rawDescription && !profile.applicantType) {
    alert('Describe your project first — even one sentence is enough to work with.');
    return;
  }

  showView('research');
  renderStages();

  const controller = new AbortController();
  state.streaming = controller;

  try {
    state.run = await transport.search(profile, state.filters.sort, updateStage, controller.signal);
    renderResults();
    showView('results');
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('#stageList').insertAdjacentHTML('beforeend',
      `<div class="notice danger"><div><strong>The search could not complete.</strong>${esc(error.message)}</div></div>`);
  } finally {
    state.streaming = null;
  }
}

function renderStages() {
  const stages = state.capabilities.stages;
  $('#stageList').innerHTML = stages.map((stage) => `
    <div class="stage pending" data-stage="${esc(stage.key)}">
      <div class="stage-icon"></div>
      <div><div class="stage-label">${esc(stage.label)}…</div><div class="stage-detail"></div></div>
    </div>`).join('');
  $('#progressFill').style.width = '0%';
}

function updateStage(event) {
  const stages = state.capabilities.stages;
  const index = stages.findIndex((stage) => stage.key === event.key);
  if (index === -1) return;

  $$('#stageList .stage').forEach((element, position) => {
    element.classList.toggle('done', position < index);
    element.classList.toggle('active', position === index);
    element.classList.toggle('pending', position > index);
  });
  const current = $(`#stageList .stage[data-stage="${event.key}"]`);
  if (current && event.detail) $('.stage-detail', current).textContent = event.detail;
  $('#progressFill').style.width = `${Math.round(((index + 1) / stages.length) * 100)}%`;
}

/* ---------------------------------------------------------------- results */

function renderResults() {
  const run = state.run;
  const strong = run.results.filter((r) => r.eligibility.status === 'ELIGIBLE');
  const possible = run.results.filter((r) => r.eligibility.status === 'UNCERTAIN');

  $('#resultsContent').innerHTML = `
    <div class="results-head">
      <h2>Research complete</h2>
      <span class="dim small">${run.counts.recordsBuilt} opportunities examined · ${run.counts.returned} returned · ${run.counts.excluded} excluded · ${(run.elapsedMs / 1000).toFixed(1)}s</span>
    </div>
    <p class="results-sub">${esc(run.strategy.summary)}</p>

    ${renderNotices(run)}
    ${renderFollowUps(run)}
    ${run.results.length ? renderBest(run) : ''}
    ${run.results.length ? renderStrategy(run) : ''}
    ${run.results.length ? renderFilterBar() : ''}

    <div id="resultSections">
      ${renderSection('🟢 Verified strong matches', 'You appear eligible and the opportunity aligns with your project.', strong, 'strong')}
      ${renderSection('🟡 Possible matches', 'Promising, but one or more eligibility factors need confirming before you invest time.', possible, 'possible')}
    </div>

    ${renderExcluded(run)}
    ${renderSearchAudit(run)}`;

  bindResultActions();
  applyFilters();
}

function renderNotices(run) {
  const notices = [];
  if (!run.results.length) {
    notices.push(`<div class="notice"><div><strong>No opportunities passed verification.</strong>
      This is a real answer, not a failure. ${esc(run.strategy.summary)}</div></div>`);
  }
  for (const note of run.notes) {
    notices.push(`<div class="notice"><div>${esc(note)}</div></div>`);
  }
  if (run.missingProfileFields.length) {
    notices.push(`<div class="notice info"><div><strong>These details would sharpen the results.</strong>
      ${run.missingProfileFields.map((field) => esc(field.label)).join(', ')}. Nothing was assumed for them.</div></div>`);
  }
  return notices.join('');
}

function renderFollowUps(run) {
  if (!run.followUps.length) return '';
  const items = run.followUps.slice(0, 4).map((question) => `
    <div class="followup" data-question="${esc(question.id)}" data-field="${esc(question.field)}">
      <div class="q">${esc(question.prompt)}</div>
      <div class="why">${esc(question.why)}</div>
      <div class="answer-row">${answerControl(question)}</div>
      <div class="unlocks">Would resolve: ${question.unlocks.map((u) => esc(u.grantName || 'an opportunity')).join(' · ')}</div>
    </div>`).join('');

  return `<div class="section-title">Smart follow-up questions <span class="count">${run.followUps.length} would change your results</span></div>
    ${items}
    <div class="btn-row"><button class="btn btn-sm" id="rerunBtn">Answer &amp; re-run the search</button></div>`;
}

function answerControl(question) {
  if (question.kind === 'boolean') {
    return `<button class="btn btn-secondary btn-sm ans" data-value="true">Yes</button>
            <button class="btn btn-secondary btn-sm ans" data-value="false">No</button>
            <span class="faint small ans-state"></span>`;
  }
  if (question.kind === 'number') {
    return `<input type="number" class="ans-input" style="max-width:130px" placeholder="Enter a number">`;
  }
  if (question.kind === 'state') {
    const states = Object.entries(state.capabilities.vocabulary.states);
    return `<select class="ans-input" style="max-width:220px"><option value="">Select a state</option>
      ${states.map(([code, name]) => `<option value="${code}">${esc(name)}</option>`).join('')}</select>`;
  }
  if (question.kind === 'choice') {
    const options = question.field === 'applicantType'
      ? state.capabilities.vocabulary.applicantTypes
      : question.field === 'organizationStatus'
        ? state.capabilities.vocabulary.organizationStatuses
        : ['elementary', 'middle_school', 'high_school', 'undergraduate', 'graduate', 'doctoral'];
    return `<select class="ans-input" style="max-width:260px"><option value="">Select…</option>
      ${options.map((option) => `<option value="${esc(option)}">${esc(titleCase(option))}</option>`).join('')}</select>`;
  }
  return `<input type="text" class="ans-input" style="max-width:260px" placeholder="Your answer">`;
}

function renderBest(run) {
  const result = run.results[0];
  const record = result.record;
  const award = awardRange(record);

  return `
    <div class="section-title">Your best match</div>
    <div class="best">
      <div class="best-flag">🎯 Strongest verified opportunity</div>
      <div class="best-grid">
        <div>
          <h3>${esc(fieldValue(record.grantName) || 'Unnamed opportunity')}</h3>
          <div class="funder">${esc(fieldValue(record.funder) || 'Funder not verified')}</div>

          <div class="badges">
            ${eligibilityBadge(result)}
            ${confidenceBadge(result)}
            <span class="badge badge-neutral">${esc(result.deadlineInfo.display)}</span>
            <span class="badge badge-neutral">Difficulty: ${esc(result.difficulty.level)}</span>
            <span class="badge badge-neutral">Competition: ${esc(result.competition.level)}</span>
          </div>

          <div class="stat-row">
            <div class="stat"><b>Award</b>${esc(award)}</div>
            <div class="stat"><b>Deadline</b>${esc(fieldValue(record.deadline) || 'Not verified')}</div>
            <div class="stat"><b>Source</b>${esc(result.confidence.bestSourceTier === 1 ? 'Official government' : result.confidence.bestSourceTier === 2 ? "Funder's own site" : 'Institutional')}</div>
          </div>

          <div class="why">
            <div class="why-block"><b>Why it matches</b>${esc(result.score.components.missionAlignment.rationale)}</div>
            <div class="why-block"><b>Why we believe you qualify</b>${esc(result.eligibility.summary)}</div>
            ${riskBlock(result)}
          </div>

          <div class="btn-row" style="margin-top:4px">
            ${applyButton(record)}
            <button class="btn btn-secondary btn-sm act-assistant" data-id="${esc(result.id)}">Application assistant</button>
            <button class="btn btn-secondary btn-sm act-save" data-id="${esc(result.id)}">Save</button>
            <button class="reason-toggle act-reason" data-id="${esc(result.id)}">Show the full reasoning</button>
          </div>

          <div class="verified-stamp">
            <span>🕒 ${esc(verificationStamp(record.lastVerified))}</span>
            <span>·</span>
            <span>${result.groundingReport.checked} claim${result.groundingReport.checked === 1 ? '' : 's'} checked against source text,
              ${result.groundingReport.rejected} discarded as unsupported</span>
          </div>
        </div>
        ${scoreRing(result.score.overall, result.score.gated)}
      </div>
      <div id="reason-${esc(result.id)}" hidden></div>
    </div>`;
}

function renderStrategy(run) {
  const cards = run.strategy.picks.map((pick) => `
    <div class="spick ${pick.grantId ? '' : 'empty'}">
      <div class="role">${esc(pick.title)}</div>
      <div class="gname">${esc(pick.grantName || 'No opportunity fills this role')}</div>
      ${pick.funder ? `<div class="small dim">${esc(pick.funder)}${pick.score !== undefined ? ` · ${pick.score}/100` : ''}</div>` : ''}
      <span class="why" style="margin-top:8px">${esc(pick.why)}</span>
      ${pick.note ? `<div class="note">${esc(pick.note)}</div>` : ''}
    </div>`).join('');

  const backups = run.strategy.backups.length
    ? `<div class="spick"><div class="role">Backup options</div>
        ${run.strategy.backups.map((backup) => `<div class="small" style="padding:4px 0;border-top:1px solid var(--line-soft)">
          <b>${esc(backup.grantName || 'Opportunity')}</b> · ${backup.score}/100 · ${esc(backup.deadline)}</div>`).join('')}</div>`
    : '';

  return `<div class="section-title">Your funding strategy</div>
    <div class="strategy-grid">${cards}${backups}</div>`;
}

function renderFilterBar() {
  const filter = (label, id, options) => `
    <div><label for="${id}">${label}</label>
      <select id="${id}">${options.map(([value, text]) => `<option value="${esc(value)}">${esc(text)}</option>`).join('')}</select></div>`;

  return `<div class="filterbar">
    ${filter('Sort by', 'f-sort', [['balanced', 'Match + urgency'], ['match', 'Match score'], ['deadline', 'Deadline soonest']])}
    ${filter('Eligibility', 'f-elig', [['', 'Any'], ['ELIGIBLE', 'Verified eligible'], ['UNCERTAIN', 'Needs confirming']])}
    ${filter('Deadline', 'f-deadline', [['', 'Any'], ...state.capabilities.deadlineFilters.map((entry) => [entry.key, entry.label])])}
    ${filter('Difficulty', 'f-difficulty', [['', 'Any'], ['Easy', 'Easy'], ['Moderate', 'Moderate'], ['Difficult', 'Difficult']])}
    ${filter('Funder', 'f-funder', [['', 'Any'], ['federal_government', 'Government'], ['private', 'Private / foundation']])}
    <div><label for="f-award">Min award</label><input type="text" id="f-award" placeholder="e.g. 5000" style="max-width:110px"></div>
    <div><label for="f-score">Min match score <span class="range-out" id="f-score-out">0</span></label>
      <input type="range" id="f-score" min="0" max="100" step="5" value="0"></div>
    <button class="filter-clear" id="f-clear">Reset</button>
  </div>`;
}

function renderSection(title, subtitle, results, key) {
  return `
    <div class="section-title" data-section-title="${key}">${esc(title)} <span class="count">${results.length}</span></div>
    <p class="dim small" style="margin:-8px 0 14px">${esc(subtitle)}</p>
    <div class="grid" data-section="${key}">
      ${results.length ? results.map(grantCard).join('') : `<div class="empty-state" style="grid-column:1/-1">
        <div class="big">∅</div><h3>Nothing in this category</h3>
        <p>${key === 'strong'
          ? 'No opportunity in this search could be confirmed as one you are eligible for. Check the possible matches and answer the follow-up questions — that is usually what moves grants into this section.'
          : 'Every opportunity found was either confirmed or excluded outright.'}</p></div>`}
    </div>`;
}

function grantCard(result) {
  const record = result.record;
  const deadline = result.deadlineInfo;
  const urgencyClass = deadline.urgency === 'critical' ? 'urgent' : deadline.urgency === 'soon' ? 'soon' : '';
  const risk = result.eligibility.risks[0]?.reason || result.eligibility.unresolved.find((c) => c.result === 'unknown_applicant')?.reason;

  return `
  <article class="gcard" data-id="${esc(result.id)}"
    data-score="${result.score.overall}"
    data-eligibility="${esc(result.eligibility.status)}"
    data-difficulty="${esc(result.difficulty.level)}"
    data-urgency="${esc(deadline.urgency)}"
    data-days="${deadline.daysRemaining ?? ''}"
    data-funder-type="${esc(fieldValue(record.funderType) || 'private')}"
    data-award-max="${fieldValue(record.awardMaximum) ?? ''}">
    <div class="gcard-head">
      <div>
        <h4>${esc(fieldValue(record.grantName) || 'Unnamed opportunity')}</h4>
        <div class="funder">${esc(fieldValue(record.funder) || '⚠️ Funder unverified')}</div>
      </div>
      ${scoreRing(result.score.overall, result.score.gated, true)}
    </div>

    <div class="badges">
      ${eligibilityBadge(result)}
      ${confidenceBadge(result)}
      ${(result.quality.labels || []).map((label) => `<span class="badge badge-amber">${esc(label.label)}</span>`).join('')}
    </div>

    <div class="gcard-facts">
      <div class="fact"><span class="k">💰 Award</span><span>${esc(awardRange(record))}</span></div>
      <div class="fact"><span class="k">📅 Deadline</span><span class="${urgencyClass}">${esc(deadline.display)}</span></div>
      <div class="fact"><span class="k">📝 Difficulty</span><span>${esc(result.difficulty.level)}</span></div>
      <div class="fact"><span class="k">👥 Competition</span><span>${esc(result.competition.level)}</span></div>
    </div>

    <div class="gcard-why"><b>Why you match</b>${esc(result.score.components.missionAlignment.rationale)}</div>
    ${risk ? `<div class="gcard-why"><b>Potential problem</b>${esc(risk)}</div>` : ''}

    <div class="gcard-foot">
      ${applyButton(record, true)}
      <button class="btn btn-secondary btn-sm act-assistant" data-id="${esc(result.id)}">Assistant</button>
      <button class="btn btn-secondary btn-sm act-save" data-id="${esc(result.id)}">Save</button>
      <button class="reason-toggle act-reason" data-id="${esc(result.id)}">Reasoning</button>
    </div>
    <div id="reason-${esc(result.id)}" hidden></div>
  </article>`;
}

function renderExcluded(run) {
  if (!run.excluded.length) return '';
  const rows = run.excluded.map((entry) => `
    <div class="gcard excluded">
      <div>
        <h4>${esc(entry.grantName || 'Unnamed opportunity')}</h4>
        <div class="funder">${esc(entry.funder || 'Funder not identified')}</div>
      </div>
      ${entry.missionAlignment !== undefined ? `<div class="badges">
        <span class="badge badge-neutral">Mission match: ${entry.missionAlignment}%</span>
        <span class="badge badge-red">Overall match: 0</span></div>` : ''}
      ${entry.reasons.map((reason) => `
        <div class="gcard-why"><b>Rejected — ${esc(reason.label || reason.code)}</b>${esc(reason.reason)}
        ${reason.evidence?.quote ? `<blockquote class="evidence">“${esc(reason.evidence.quote)}”
          ${reason.evidence.sourceUrl ? `<cite>${esc(reason.evidence.sourceUrl)}</cite>` : ''}</blockquote>` : ''}</div>`).join('')}
      ${entry.url ? `<div class="gcard-foot"><a class="small" href="${esc(entry.url)}" target="_blank" rel="noopener noreferrer">Check it yourself ↗</a></div>` : ''}
    </div>`).join('');

  return `<details class="more" style="margin-top:36px">
    <summary>🔴 Excluded opportunities (${run.excluded.length}) — see exactly why each was rejected</summary>
    <div><p class="dim small" style="margin-bottom:14px">Every exclusion below is auditable. If one looks wrong, the reason and the source are shown so you can check it yourself.</p>
    <div class="grid">${rows}</div></div>
  </details>`;
}

function renderSearchAudit(run) {
  const federal = run.searchDiagnostics.federal.map((entry) =>
    `<li>${esc(entry.keyword)} — ${entry.ok ? `${entry.count} results` : `failed: ${esc(entry.reason || 'unknown error')}`}</li>`).join('');
  const web = run.searchDiagnostics.web.map((entry) =>
    `<li>${esc(entry.query)} — ${entry.ok ? `${entry.count} results` : `failed: ${esc(entry.reason || 'unknown error')}`}</li>`).join('');
  const strategies = run.strategies.map((strategy) =>
    `<li><b>${esc(strategy.label)}:</b> <span class="mono small">${esc(strategy.query)}</span><br><span class="faint small">${esc(strategy.rationale)}</span></li>`).join('');

  return `<details class="more" style="margin-top:24px">
    <summary>How this search was run (${run.strategies.length} strategies)</summary>
    <div class="packet">
      <section><h4>Search strategies generated from your profile</h4><ul>${strategies}</ul></section>
      ${federal ? `<section><h4>Federal source queries</h4><ul>${federal}</ul></section>` : ''}
      ${web ? `<section><h4>Web search queries</h4><ul>${web}</ul></section>` : ''}
    </div>
  </details>`;
}

/* ------------------------------------------------------------- components */

function scoreRing(score, gated, small = false) {
  const color = gated ? 'var(--red)' : score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : 'var(--amber)';
  return `<div class="ring ${small ? 'sm' : ''}" style="--pct:${score};--ring-color:${color}">
    <div class="ring-inner"><div class="ring-value">${score}</div><div class="ring-label">Match</div></div></div>`;
}

function eligibilityBadge(result) {
  const map = {
    ELIGIBLE: ['badge-green', '🟢 Eligibility verified'],
    UNCERTAIN: ['badge-amber', '🟡 Eligibility uncertain'],
    INELIGIBLE: ['badge-red', '❌ Not eligible'],
  };
  const [className, text] = map[result.eligibility.status] || map.UNCERTAIN;
  return `<span class="badge ${className}" title="${esc(result.eligibility.summary)}">${text}</span>`;
}

function confidenceBadge(result) {
  const className = { HIGH: 'badge-green', MEDIUM: 'badge-amber', LOW: 'badge-red' }[result.confidence.level];
  return `<span class="badge ${className}" title="${esc(result.confidence.reasons.join(' '))}">
    Source confidence: ${esc(result.confidence.label)}</span>`;
}

/** Confidence level as a plain word, for prose that already has its own icon. */
function confidenceWord(level) {
  return { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[level] || 'unknown';
}

function riskBlock(result) {
  const risks = [
    ...result.eligibility.risks.map((risk) => risk.reason),
    ...result.eligibility.unresolved.filter((c) => c.result === 'unknown_applicant').map((c) => c.reason),
    ...(result.confidence.level !== 'HIGH' ? [`Source confidence is ${confidenceWord(result.confidence.level)}: ${result.confidence.reasons[0]}`] : []),
  ];
  if (!risks.length) return '';
  return `<div class="why-block risk"><b>Important risks &amp; requirements</b>${risks.slice(0, 3).map(esc).join(' ')}</div>`;
}

function applyButton(record, small = false) {
  const url = fieldValue(record.applicationUrl) || fieldValue(record.officialUrl);
  if (!url) return `<span class="badge badge-red">⚠️ No verified application link</span>`;
  return `<a class="btn ${small ? 'btn-sm' : ''}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Official application ↗</a>`;
}

function awardRange(record) {
  const min = fieldValue(record.awardMinimum);
  const max = fieldValue(record.awardMaximum);
  if (min === null && max === null) return '⚠️ Not verified';
  if (min !== null && max !== null && min !== max) return `${money(min)} – ${money(max)}`;
  if (max !== null) return `Up to ${money(max)}`;
  return `From ${money(min)}`;
}

function fieldValue(field) {
  if (!field || typeof field !== 'object') return null;
  return field.verified ? field.value : null;
}

function verificationStamp(iso) {
  if (!iso) return 'Never verified';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never verified';
  return `Last verified: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

/* ------------------------------------------------------- reasoning panels */

function reasoningPanel(result) {
  const checks = result.eligibility.checks.map((check) => {
    const mark = { pass: '✅', fail: '❌', unknown_applicant: '🟡', not_stated: '·', not_applicable: '–' }[check.result];
    return `<div class="checkline">
      <div class="mark">${mark}</div>
      <div class="body">
        <div class="req">${esc(check.label)}${check.blocking ? '' : ' <span class="faint small">(not disqualifying)</span>'}</div>
        <div class="rsn">${esc(check.reason)}</div>
        ${check.evidence?.quote ? `<blockquote class="evidence">“${esc(check.evidence.quote)}”
          ${check.evidence.sourceUrl ? `<cite>${esc(check.evidence.sourceUrl)}</cite>` : ''}</blockquote>` : ''}
      </div></div>`;
  }).join('');

  const breakdown = Object.entries(result.score.components).map(([, component]) => `
    <div class="bd-row">
      <div class="bd-label">${esc(component.label)}
        <span class="bd-weight">${Math.round(component.weight * 100)}%</span>
        ${component.known ? '' : '<span class="badge badge-neutral" style="padding:1px 6px;font-size:10px">unassessed</span>'}</div>
      <div class="bd-val">${component.percent}%</div>
      <div class="bd-bar ${component.known ? '' : 'unknown'}"><i style="width:${component.percent}%"></i></div>
    </div>
    <div class="faint small" style="margin:-4px 0 8px">${esc(component.rationale)}</div>`).join('');

  const citations = result.citations.map((citation) => `
    <li><a href="${esc(citation.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(citation.sourceUrl)}</a>
      <span class="faint small"> — fetched ${esc((citation.fetchedAt || '').slice(0, 10))}</span>
      ${citation.quotes.length ? `<blockquote class="evidence">“${esc(citation.quotes[0])}”</blockquote>` : ''}</li>`).join('');

  const discarded = result.groundingReport.discarded.map((entry) =>
    `<li><span class="mono small">${esc(entry.field)}</span> — ${esc(entry.reason)}${entry.claimed ? `; discarded claim: “${esc(String(entry.claimed).slice(0, 90))}”` : ''}</li>`).join('');

  return `<div class="reason-panel">
    <h5>Eligibility analysis — every requirement checked</h5>
    ${checks}

    <h5>Match score breakdown</h5>
    ${result.score.gated ? `<div class="notice danger" style="margin-bottom:10px"><div>${esc(result.score.gateReason)}</div></div>` : ''}
    <div class="breakdown">${breakdown}</div>
    ${result.score.unassessedComponents.length ? `<p class="faint small" style="margin-top:8px">
      Unassessed and scored neutrally: ${result.score.unassessedComponents.map(esc).join(', ')}. They are not counted as strengths.</p>` : ''}

    <h5>Application difficulty</h5>
    <p class="small dim">${esc(result.difficulty.level)} — ${result.difficulty.factors.map(esc).join(' ')}
      <br><span class="faint">${esc(result.difficulty.basis)}</span></p>

    <h5>Competition</h5>
    <p class="small dim">${esc(result.competition.level)} — ${esc(result.competition.basis)}</p>

    <h5>Source confidence: ${esc(result.confidence.label)}</h5>
    <p class="small dim">${esc(result.confidence.meaning)} ${result.confidence.reasons.map(esc).join(' ')}</p>

    <h5>Sources used</h5>
    <ul class="packet" style="display:block">${citations || '<li class="faint">No source citations were recorded.</li>'}</ul>

    <h5>Verification audit</h5>
    <p class="small dim">${result.groundingReport.checked} quoted claim${result.groundingReport.checked === 1 ? '' : 's'} were re-checked
      against the downloaded page text. ${result.groundingReport.rejected} failed and ${result.groundingReport.rejected === 1 ? 'was' : 'were'} discarded.</p>
    ${discarded ? `<ul>${discarded}</ul>` : ''}
  </div>`;
}

/* ---------------------------------------------------------------- actions */

function bindResultActions() {
  $$('.act-reason').forEach((button) => {
    button.addEventListener('click', () => {
      const result = state.run.results.find((r) => r.id === button.dataset.id);
      const panel = document.getElementById(`reason-${button.dataset.id}`);
      if (!panel || !result) return;
      if (panel.hidden) {
        panel.innerHTML = reasoningPanel(result);
        panel.hidden = false;
        button.textContent = 'Hide reasoning';
      } else {
        panel.hidden = true;
        panel.innerHTML = '';
        button.textContent = 'Reasoning';
      }
    });
  });

  $$('.act-save').forEach((button) => {
    button.addEventListener('click', async () => {
      const result = state.run.results.find((r) => r.id === button.dataset.id);
      if (!result) return;
      await transport.saved.add(savedPayload(result));
      button.textContent = 'Saved ✓';
      button.disabled = true;
      refreshCounts();
    });
  });

  $$('.act-assistant').forEach((button) => {
    button.addEventListener('click', () => openAssistant(button.dataset.id));
  });

  $$('.followup').forEach((element) => {
    $$('.ans', element).forEach((button) => {
      button.addEventListener('click', () => {
        $$('.ans', element).forEach((other) => other.classList.remove('btn'));
        element.dataset.answer = button.dataset.value;
        $('.ans-state', element).textContent = `Answered: ${button.dataset.value === 'true' ? 'Yes' : 'No'}`;
      });
    });
  });

  const rerun = $('#rerunBtn');
  if (rerun) rerun.addEventListener('click', submitAnswers);

  bindFilters();
}

function savedPayload(result) {
  return {
    grantId: result.id,
    runId: state.run.id,
    grantName: fieldValue(result.record.grantName),
    funder: fieldValue(result.record.funder),
    deadline: fieldValue(result.record.deadline),
    score: result.score.overall,
    eligibility: result.eligibility.status,
    applicationUrl: fieldValue(result.record.applicationUrl) || fieldValue(result.record.officialUrl),
  };
}

async function submitAnswers() {
  const answers = [];
  $$('.followup').forEach((element) => {
    const questionId = element.dataset.question;
    const field = element.dataset.field;
    const input = $('.ans-input', element);
    if (element.dataset.answer !== undefined) {
      answers.push({ questionId, field, value: element.dataset.answer === 'true' });
    } else if (input && input.value.trim()) {
      const raw = input.value.trim();
      answers.push({ questionId, field, value: input.type === 'number' ? Number(raw) : raw });
    }
  });
  if (!answers.length) {
    alert('Answer at least one question first.');
    return;
  }

  showView('research');
  renderStages();
  updateStage({ key: 'profile', detail: 'Applying your answers' });
  try {
    state.run = await transport.answer(state.run.id, answers, state.filters.sort);
    renderResults();
    showView('results');
  } catch (error) {
    alert(`Re-run failed: ${error.message}`);
    showView('results');
  }
}

/* ---------------------------------------------------------------- filters */

function bindFilters() {
  const bind = (id, key, transform = (v) => v) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener('input', () => {
      state.filters[key] = transform(element.value);
      if (id === 'f-score') $('#f-score-out').textContent = element.value;
      if (key === 'sort') return resort();
      applyFilters();
    });
  };
  bind('f-sort', 'sort');
  bind('f-elig', 'eligibility');
  bind('f-deadline', 'deadline');
  bind('f-difficulty', 'difficulty');
  bind('f-funder', 'funderType');
  bind('f-award', 'minAward');
  bind('f-score', 'minScore', Number);

  const clear = $('#f-clear');
  if (clear) {
    clear.addEventListener('click', () => {
      state.filters = { ...state.filters, minScore: 0, deadline: '', eligibility: '', difficulty: '', funderType: '', minAward: '' };
      ['f-elig', 'f-deadline', 'f-difficulty', 'f-funder', 'f-award'].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });
      $('#f-score').value = 0;
      $('#f-score-out').textContent = '0';
      applyFilters();
    });
  }
}

function applyFilters() {
  const { minScore, deadline, eligibility, difficulty, funderType, minAward } = state.filters;
  const awardFloor = Number(String(minAward).replace(/[^\d.]/g, '')) || 0;

  $$('.gcard[data-id]').forEach((card) => {
    const days = card.dataset.days === '' ? null : Number(card.dataset.days);
    const urgency = card.dataset.urgency;
    const awardMax = card.dataset.awardMax === '' ? null : Number(card.dataset.awardMax);

    let visible = Number(card.dataset.score) >= minScore;
    if (visible && eligibility) visible = card.dataset.eligibility === eligibility;
    if (visible && difficulty) visible = card.dataset.difficulty === difficulty;
    if (visible && funderType) {
      visible = funderType === 'federal_government'
        ? card.dataset.funderType === 'federal_government'
        : card.dataset.funderType !== 'federal_government';
    }
    if (visible && awardFloor) visible = awardMax !== null && awardMax >= awardFloor;
    if (visible && deadline) {
      if (deadline === 'closing_this_week') visible = days !== null && days >= 0 && days <= 7;
      else if (deadline === 'closing_this_month') visible = days !== null && days >= 0 && days <= 31;
      else if (deadline === 'open_indefinitely') visible = urgency === 'rolling';
      else if (deadline === 'future') visible = days !== null && days > 31;
    }
    card.style.display = visible ? '' : 'none';
  });

  $$('[data-section]').forEach((section) => {
    const shown = $$('.gcard[data-id]', section).filter((card) => card.style.display !== 'none').length;
    const title = $(`[data-section-title="${section.dataset.section}"] .count`);
    if (title) title.textContent = String(shown);
  });
}

async function resort() {
  if (!state.run) return;
  state.run = await transport.search(state.run.profile, state.filters.sort);
  renderResults();
}

/* -------------------------------------------------------------- assistant */

async function openAssistant(grantId) {
  const packet = await transport.assistant(state.run.id, grantId);
  const list = (items) => items.map((item) => `<li>${esc(item)}</li>`).join('');

  const documents = packet.requiredDocuments.verified
    ? `<ul>${list(packet.requiredDocuments.items.map((entry) => entry.item))}</ul>
       <p class="faint small" style="margin-top:8px">${esc(packet.requiredDocuments.note)}</p>`
    : `<p class="small dim">${esc(packet.requiredDocuments.note)}</p>
       <ul style="margin-top:10px">${list(packet.requiredDocuments.standardPractice)}</ul>`;

  const questions = packet.applicationQuestions.verified
    ? `<ul>${list(packet.applicationQuestions.items)}</ul>`
    : `<p class="small dim">${esc(packet.applicationQuestions.note)}</p>
       <ul style="margin-top:10px">${list(packet.applicationQuestions.standardPractice)}</ul>`;

  const html = `
  <div class="modal-back" id="modalBack">
    <div class="modal">
      <div class="modal-head">
        <div>
          <h2 style="font-size:20px">${esc(packet.grantName || 'Application packet')}</h2>
          <div class="dim small">${esc(packet.funder || 'Funder not verified')} · ${esc(packet.deadlineDisplay)} · ${esc(packet.fundingAmount)}</div>
        </div>
        <button class="icon-btn" id="modalClose" aria-label="Close">✕</button>
      </div>

      <div class="packet">
        <section><h4>1. Eligibility checklist</h4>
          ${packet.eligibilityChecklist.map((item) => `<div class="checkline">
            <div class="mark">${item.satisfied ? '✅' : item.status === 'fail' ? '❌' : item.status === 'unknown_applicant' ? '🟡' : '·'}</div>
            <div class="body"><div class="req">${esc(item.requirement)}</div>
              <div class="rsn">${esc(item.detail)}</div>
              <div class="rsn" style="color:var(--accent)">→ ${esc(item.action)}</div>
              ${item.evidence?.quote ? `<blockquote class="evidence">“${esc(item.evidence.quote)}”</blockquote>` : ''}
            </div></div>`).join('')}
        </section>

        <section><h4>2. Required documents</h4>${documents}</section>
        <section><h4>3. Application questions</h4>${questions}</section>

        <section><h4>4. Project requirements</h4>
          <ul>${packet.projectRequirements.map((requirement) =>
            `<li><b>${esc(requirement.label)}:</b> ${esc(requirement.detail)}</li>`).join('')}</ul></section>

        <section><h4>5. Suggested strategy</h4>
          <ul>${packet.strategy.map((point) => `<li><b>${esc(point.point)}.</b> ${esc(point.detail)}</li>`).join('')}</ul></section>

        <section><h4>6. Timeline (working backward from the deadline)</h4>
          ${packet.timeline.length
            ? packet.timeline.map((entry) => `<div class="timeline-row ${entry.past ? 'past' : ''}">
                <div class="d">${esc(entry.date)}</div><div>${esc(entry.task)}</div></div>`).join('')
            : '<p class="small dim">No verified deadline, so no timeline can be built. Confirm the deadline with the funder first.</p>'}
        </section>

        <section><h4>7. Proposal outline</h4>
          <ul>${packet.proposalOutline.map((section) =>
            `<li><b>${esc(section.section)}.</b> ${esc(section.guidance)}</li>`).join('')}</ul></section>

        <section><h4>8. Budget outline — target request ${esc(packet.budgetOutline.targetRequest)}</h4>
          <p class="small dim" style="margin-bottom:10px">${esc(packet.budgetOutline.note)}</p>
          <ul>${packet.budgetOutline.lines.map((line) =>
            `<li><b>${esc(line.category)}.</b> ${esc(line.guidance)}</li>`).join('')}</ul></section>

        <section><h4>9. Missing information checklist</h4>
          <ul>${packet.missingInformation.map((item) =>
            `<li>${item.blocking ? '🚩 ' : ''}<b>${esc(item.item)}</b> — ${esc(item.why)} <span class="faint">(ask ${esc(item.askOf)})</span></li>`).join('')}</ul></section>

        <section><h4>Sources</h4>
          <ul>${packet.sources.map((source) =>
            `<li><a href="${esc(source.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(source.sourceUrl)}</a>
             <span class="faint small">fetched ${esc((source.fetchedAt || '').slice(0, 10))}</span></li>`).join('') || '<li class="faint">No sources recorded.</li>'}</ul>
          <p class="faint small" style="margin-top:12px">${esc(packet.disclaimer)}</p></section>
      </div>

      <div class="btn-row">
        ${packet.applicationUrl ? `<a class="btn" href="${esc(packet.applicationUrl)}" target="_blank" rel="noopener noreferrer">Open the official application ↗</a>` : ''}
        <button class="btn btn-secondary btn-sm" id="trackBtn">Add to application tracker</button>
      </div>
    </div>
  </div>`;

  $('#modalRoot').innerHTML = html;
  const close = () => { $('#modalRoot').innerHTML = ''; };
  $('#modalClose').addEventListener('click', close);
  $('#modalBack').addEventListener('click', (event) => { if (event.target.id === 'modalBack') close(); });
  $('#trackBtn').addEventListener('click', async () => {
    await transport.tracker.put({
      grantId: packet.grantId,
      grantName: packet.grantName,
      funder: packet.funder,
      deadline: packet.deadline,
      applicationUrl: packet.applicationUrl,
      stage: 'considering',
      checklist: packet.eligibilityChecklist.map((item) => ({ item: item.requirement, done: item.satisfied })),
    });
    $('#trackBtn').textContent = 'Added ✓';
    $('#trackBtn').disabled = true;
  });
}

/* -------------------------------------------------- saved / tracker / alerts */

async function refreshCounts() {
  const [saved, alerts] = await Promise.all([
    transport.saved.list(),
    transport.features?.alerts ? transport.alerts.list() : Promise.resolve({ alerts: [], unread: 0 }),
  ]);
  state.saved = saved.saved;
  state.alerts = alerts.alerts;
  const savedBadge = $('#savedCount');
  savedBadge.hidden = state.saved.length === 0;
  savedBadge.textContent = String(state.saved.length);
  const alertBadge = $('#alertCount');
  alertBadge.hidden = alerts.unread === 0;
  alertBadge.textContent = String(alerts.unread);
}

async function loadSaved() {
  const { saved } = await transport.saved.list();
  state.saved = saved;
  $('#savedContent').innerHTML = saved.length
    ? `<div class="section-title">Saved grants <span class="count">${saved.length}</span></div>
       ${saved.map((entry) => `<div class="list-row">
          <div class="grow"><div class="name">${esc(entry.grantName || entry.grantId)}</div>
            <div class="meta">${esc(entry.funder || 'Funder not recorded')} · ${entry.score ?? '—'}/100 ·
              ${esc(entry.eligibility || 'unknown')} · deadline ${esc(entry.deadline || 'not verified')}</div></div>
          ${entry.applicationUrl ? `<a class="btn btn-secondary btn-sm" href="${esc(entry.applicationUrl)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ''}
          <button class="btn btn-secondary btn-sm del-saved" data-id="${esc(entry.id)}">Remove</button>
        </div>`).join('')}`
    : emptyState('No saved grants yet', 'Save an opportunity from your results and it will wait for you here.');

  $$('.del-saved').forEach((button) => button.addEventListener('click', async () => {
    await transport.saved.remove(button.dataset.id);
    loadSaved();
    refreshCounts();
  }));
}

async function loadTracker() {
  const { entries, stages } = await transport.tracker.list();
  $('#trackerContent').innerHTML = entries.length
    ? `<div class="section-title">Application tracker <span class="count">${entries.length}</span></div>
       ${entries.map((entry) => {
        const done = (entry.checklist || []).filter((item) => item.done).length;
        return `<div class="list-row">
          <div class="grow"><div class="name">${esc(entry.grantName || entry.grantId)}</div>
            <div class="meta">${esc(entry.funder || '')} · deadline ${esc(entry.deadline || 'not verified')} ·
              ${done}/${(entry.checklist || []).length} eligibility items confirmed</div></div>
          <select class="track-stage" data-id="${esc(entry.id)}" style="max-width:150px">
            ${stages.map((stage) => `<option value="${esc(stage)}" ${stage === entry.stage ? 'selected' : ''}>${esc(titleCase(stage))}</option>`).join('')}
          </select>
          <button class="btn btn-secondary btn-sm del-track" data-id="${esc(entry.id)}">Remove</button>
        </div>`;
      }).join('')}`
    : emptyState('Nothing being tracked', 'Open the application assistant for a grant and add it to the tracker to follow it through to submission.');

  $$('.track-stage').forEach((select) => select.addEventListener('change', async () => {
    const entry = entries.find((candidate) => candidate.id === select.dataset.id);
    await transport.tracker.put({ ...entry, stage: select.value });
  }));
  $$('.del-track').forEach((button) => button.addEventListener('click', async () => {
    await transport.tracker.remove(button.dataset.id);
    loadTracker();
  }));
}

async function loadAlerts() {
  if (!transport.features?.alerts) {
    $('#alertsContent').innerHTML = `
      <div class="section-title">Grant alerts</div>
      <div class="notice"><div><strong>Not available in this build.</strong>${esc(transport.features.alertsNote)}</div></div>`;
    return;
  }
  const [{ alerts }, { profiles }] = await Promise.all([transport.alerts.list(), transport.profiles.list()]);

  const profileRows = profiles.length
    ? profiles.map((profile) => `<div class="list-row">
        <div class="grow"><div class="name">${esc(profile.name)}</div>
          <div class="meta">Alerts ${profile.alertsEnabled ? 'on' : 'off'} ·
            ${profile.lastSweptAt ? `last checked ${esc(profile.lastSweptAt.slice(0, 10))}` : 'not checked yet'}</div></div>
        <button class="btn btn-secondary btn-sm sweep-now" data-id="${esc(profile.id)}">Check now</button>
      </div>`).join('')
    : `<p class="dim small">No saved profiles yet. Save one from the search page to have new opportunities checked for you automatically.</p>`;

  $('#alertsContent').innerHTML = `
    <div class="section-title">Saved profiles</div>${profileRows}
    <div class="section-title">Alerts <span class="count">${alerts.length}</span></div>
    ${alerts.length
      ? alerts.map((alert) => `<div class="list-row" style="${alert.read ? 'opacity:.6' : ''}">
          <div class="grow"><div class="name">${esc(alert.message)}</div>
            <div class="meta">${esc(alert.profileName || '')} · ${esc((alert.createdAt || '').slice(0, 10))} ·
              ${esc(alert.eligibility || '')} ${alert.confidence ? `· source confidence ${esc(alert.confidence)}` : ''}</div></div>
          ${alert.applicationUrl ? `<a class="btn btn-secondary btn-sm" href="${esc(alert.applicationUrl)}" target="_blank" rel="noopener noreferrer">Open ↗</a>` : ''}
        </div>`).join('')
      : emptyState('No alerts yet', 'When a saved profile is re-checked and a strong new opportunity appears, it shows up here.')}`;

  $$('.sweep-now').forEach((button) => button.addEventListener('click', async () => {
    button.textContent = 'Checking…';
    button.disabled = true;
    try {
      const result = await transport.profiles.sweep(button.dataset.id);
      alert(`${result.alerts.length} new alert${result.alerts.length === 1 ? '' : 's'} from ${result.counts.returned} opportunities.`);
      loadAlerts();
      refreshCounts();
    } catch (error) {
      alert(`Check failed: ${error.message}`);
    } finally {
      button.textContent = 'Check now';
      button.disabled = false;
    }
  }));

  const unread = alerts.filter((alert) => !alert.read).map((alert) => alert.id);
  if (unread.length) {
    await transport.alerts.markRead(unread);
    refreshCounts();
  }
}

function emptyState(title, body) {
  return `<div class="empty-state"><div class="big">◇</div><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`;
}

$('#saveProfileBtn').addEventListener('click', async () => {
  if (!transport.features?.alerts) {
    alert(transport.features.alertsNote);
    return;
  }
  const profile = collectProfile();
  if (!profile.rawDescription) {
    alert('Describe your project first so the saved profile has something to search for.');
    return;
  }
  const name = prompt('Name this profile', profile.rawDescription.slice(0, 40));
  if (!name) return;
  await transport.profiles.save({ name, profile, alertsEnabled: true });
  alert('Profile saved. It will be re-checked automatically and new strong matches will appear under Alerts.');
});

/**
 * Entry point. The build supplies the transport: HTTP for the served app,
 * an in-page engine for the single-file build.
 */
export function startApp(implementation) {
  transport = implementation;
  bootstrap().catch((error) => {
    document.body.insertAdjacentHTML('afterbegin',
      `<div class="notice danger" style="margin:20px">Could not start: ${esc(error.message)}</div>`);
  });
}
