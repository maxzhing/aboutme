/**
 * `npm run doctor` — find out what this installation can actually do.
 *
 * Every check makes a real call. Nothing is inferred from configuration: a key
 * being present is not evidence that it works. Each failure prints the specific
 * remedy, because "it doesn't work" is not a useful thing for a tool to say
 * about itself.
 */

import { config, hasLlm, searchProvider, hasWebSearch } from '../server/lib/config.mjs';
import { searchGrantsGov, fetchOpportunity } from '../server/sources/grantsgov.mjs';
import { webSearch } from '../server/sources/websearch.mjs';
import { fetchPage } from '../server/sources/page.mjs';
import { jsonCall } from '../server/ai/llm.mjs';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const results = [];

function report(status, name, detail, remedy) {
  const icon = status === 'ok' ? `${GREEN}✓${RESET}` : status === 'warn' ? `${YELLOW}!${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${icon} ${BOLD}${name}${RESET}`);
  if (detail) console.log(`      ${detail}`);
  if (remedy) console.log(`      ${DIM}→ ${remedy}${RESET}`);
  console.log('');
  results.push({ status, name });
}

async function timed(work) {
  const started = Date.now();
  const value = await work();
  return { value, ms: Date.now() - started };
}

console.log(`\n${BOLD}Grant Match Engine — checking what this installation can do${RESET}\n`);

// ---------------------------------------------------------------- federal
if (!config.grantsGov.enabled) {
  report('warn', 'Federal opportunities (Grants.gov)', 'Disabled by configuration.',
    'Set GRANTS_GOV_ENABLED=true to search federal funding.');
} else {
  try {
    const { value: search, ms } = await timed(() => searchGrantsGov('education', { rows: 5 }));
    if (!search.ok) {
      report('fail', 'Federal opportunities (Grants.gov)', `Could not reach the API: ${search.reason}`,
        'This needs no API key. Check your network, proxy or firewall allows https://api.grants.gov');
    } else if (search.hits.length === 0) {
      report('warn', 'Federal opportunities (Grants.gov)', `Reachable in ${ms}ms but returned no results for a common keyword.`,
        'The API may have changed its response shape. Re-run with a different keyword to confirm.');
    } else {
      report('ok', 'Federal opportunities (Grants.gov)',
        `${search.hitCount} matches for "education" in ${ms}ms. No API key needed.`);

      const first = search.hits[0];
      const detail = await fetchOpportunity(first.id ?? first.opportunityId);
      if (detail.ok) {
        const synopsis = detail.data?.synopsis || {};
        const fields = ['awardCeiling', 'responseDate', 'applicantEligibilityDesc'].filter((key) => synopsis[key]);
        report('ok', 'Federal opportunity detail',
          `Full record retrieved for "${first.title}". Structured fields present: ${fields.join(', ') || 'none'}.`);
      } else {
        report('warn', 'Federal opportunity detail', `Search works but detail lookup failed: ${detail.reason}`,
          'Federal results will still appear, with fewer verified fields.');
      }
    }
  } catch (error) {
    report('fail', 'Federal opportunities (Grants.gov)', error.message, 'Check network access to https://api.grants.gov');
  }
}

// ------------------------------------------------------------- web search
const provider = searchProvider();
if (!hasWebSearch()) {
  report('warn', 'Web search (foundations, state, local, corporate)',
    'No provider configured, so only federal opportunities can be found. This is the single biggest gap in coverage.',
    'Get a free Brave Search key at https://brave.com/search/api (free tier ~2,000 queries/month), then put '
    + 'BRAVE_SEARCH_API_KEY=... in a .env file. SERPER_API_KEY, TAVILY_API_KEY, GOOGLE_CSE_KEY+GOOGLE_CSE_CX '
    + 'and SEARXNG_URL also work.');
} else {
  try {
    const { value: search, ms } = await timed(() => webSearch('Maryland community foundation grant program'));
    if (!search.ok) {
      report('fail', `Web search (${provider})`, `The provider rejected the request: ${search.reason}`,
        'Check the key is correct and the account is active. A 401 means a bad key; a 429 means the quota is spent.');
    } else if (search.leads.length === 0) {
      report('warn', `Web search (${provider})`, `Reachable in ${ms}ms but returned no results.`,
        'The provider may have changed its response shape.');
    } else {
      report('ok', `Web search (${provider})`, `${search.leads.length} results in ${ms}ms. Example: ${search.leads[0].url}`);
    }
  } catch (error) {
    report('fail', `Web search (${provider})`, error.message, 'Check the API key and network access.');
  }
}

// ------------------------------------------------------------ page reading
try {
  const { value: page, ms } = await timed(() => fetchPage('https://www.grants.gov/', {}));
  report('ok', 'Reading funder pages', `Fetched and extracted ${page.text.length.toLocaleString()} characters in ${ms}ms.`);
} catch (error) {
  report('fail', 'Reading funder pages', error.message,
    'Without this the engine cannot verify anything against a funder\'s own site. Check outbound HTTPS is allowed.');
}

// -------------------------------------------------------------- the model
if (!hasLlm()) {
  report('warn', 'Language model (optional)',
    'Not configured. Descriptions are parsed with rules and funder pages with patterns. This works — it just '
    + 'verifies fewer facts on awkwardly structured pages.',
    'Optional: set ANTHROPIC_API_KEY to improve reading. Nothing is guessed either way.');
} else {
  try {
    const { value, ms } = await timed(() => jsonCall({ prompt: 'Return exactly {"ok": true} and nothing else.', maxTokens: 32 }));
    if (value?.ok === true) report('ok', `Language model (${config.llm.model})`, `Responded correctly in ${ms}ms.`);
    else report('warn', `Language model (${config.llm.model})`, `Responded, but not as expected: ${JSON.stringify(value).slice(0, 80)}`);
  } catch (error) {
    report('fail', `Language model (${config.llm.model})`, error.message,
      'Check ANTHROPIC_API_KEY. The engine still runs without it.');
  }
}

// ---------------------------------------------------------------- verdict
const failed = results.filter((entry) => entry.status === 'fail').length;
const warned = results.filter((entry) => entry.status === 'warn').length;

console.log(`${BOLD}Verdict${RESET}\n`);
if (failed === 0 && warned === 0) {
  console.log(`  ${GREEN}Everything works.${RESET} Run ${BOLD}npm start${RESET} and search.\n`);
} else if (results.some((entry) => entry.status === 'ok' && entry.name.startsWith('Federal'))) {
  console.log(`  ${GREEN}Live search works${RESET} for federal opportunities with no setup at all.`);
  if (!hasWebSearch()) {
    console.log(`  ${YELLOW}Foundations, state, local and corporate funders are missing${RESET} until a search key is set.`);
  }
  if (failed) console.log(`  ${RED}${failed} check${failed === 1 ? '' : 's'} failed${RESET} — see the remedies above.`);
  console.log(`\n  Run ${BOLD}npm start${RESET} to use what does work.\n`);
} else {
  console.log(`  ${RED}No live source is reachable.${RESET} The engine cannot find real grants in this environment.`);
  console.log(`  Most often this is a network restriction rather than a configuration problem — the checks above name the host.\n`);
}

process.exit(failed > 0 ? 1 : 0);
