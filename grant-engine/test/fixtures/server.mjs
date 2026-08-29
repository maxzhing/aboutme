/**
 * Fixture server: stands in for the live internet so the whole pipeline can be
 * exercised end-to-end offline.
 *
 * Serves a Grants.gov-shaped API, a SearXNG-shaped search endpoint, and a set of
 * funder pages that between them cover every branch the engine has to handle:
 * a clean match, a 501(c)(3)-only grant that must exclude an individual, an
 * expired opportunity, a loan disguised as a grant, an advance-fee scam, and an
 * aggregator page with no primary source.
 */

import http from 'node:http';

export const PAGES = {
  '/funders/openfield/youth-stem': {
    title: 'Youth STEM Innovation Grant — Openfield Family Foundation',
    html: `<html><head><title>Youth STEM Innovation Grant</title></head><body>
      <h1>Youth STEM Innovation Grant Program</h1>
      <p>The Openfield Family Foundation supports hands-on science, robotics and computer science education
      for students in Maryland, Virginia and the District of Columbia.</p>
      <h2>Eligibility</h2>
      <ul>
        <li>Individuals may apply. Students aged 14 and older are eligible to apply directly.</li>
        <li>Applicants must be located in Maryland, Virginia or the District of Columbia.</li>
        <li>No matching funds are required.</li>
      </ul>
      <h2>Award</h2>
      <p>Awards range from $1,000 to $8,000 per project.</p>
      <h2>Deadline</h2>
      <p>Deadline: applications are due December 12, 2026.</p>
      <h2>How to apply</h2>
      <p>Required documents: a one-page project description, a simple budget, and one letter of reference.</p>
      </body></html>`,
  },
  // A landing page that states nothing verifiable, linking to the page that does.
  // Exercises the pipeline's one-hop follow to a guidelines page.
  '/funders/brightline/robotics': {
    title: 'Robotics Access Fund — Brightline Foundation',
    html: `<html><head><title>Robotics Access Fund</title></head><body>
      <h1>Robotics Access Fund</h1>
      <p>The Brightline Foundation believes every young person deserves the chance to build something.</p>
      <p>Our STEM education work reaches communities across Maryland.</p>
      <a href="/funders/brightline/robotics/guidelines">Eligibility &amp; Guidelines</a>
      <a href="/news">Latest news</a>
      </body></html>`,
  },
  '/funders/brightline/robotics/guidelines': {
    title: 'Robotics Access Fund guidelines — Brightline Foundation',
    html: `<html><head><title>Robotics Access Fund guidelines</title></head><body>
      <h1>Robotics Access Fund Guidelines</h1>
      <p>The Brightline Foundation supports youth robotics and STEM education projects.</p>
      <h2>Eligibility</h2>
      <p>Individuals may apply. Applicants must be located in Maryland.</p>
      <p>Awards range from $500 to $3,000.</p>
      <p>Deadline: applications are due October 9, 2026.</p>
      </body></html>`,
  },
  '/funders/harborough/stem-capacity': {
    title: 'STEM Capacity Grant — Harborough Trust',
    html: `<html><head><title>STEM Capacity Grant</title></head><body>
      <h1>STEM Capacity Building Grant</h1>
      <p>The Harborough Trust funds STEM education and youth robotics programming across the mid-Atlantic region.</p>
      <h2>Who can apply</h2>
      <p>Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.</p>
      <p>Organizations must be located in Maryland.</p>
      <h2>Grant size</h2>
      <p>Grants range from $10,000 to $50,000.</p>
      <p>Deadline: applications close on March 31, 2027.</p>
      </body></html>`,
  },
  '/funders/lapsed/robotics-mini-grant': {
    title: 'Robotics Mini-Grant — Lapsed Foundation',
    html: `<html><head><title>Robotics Mini-Grant</title></head><body>
      <h1>Robotics Mini-Grant Program</h1>
      <p>The Lapsed Foundation supported youth robotics teams and STEM outreach clubs.</p>
      <p>Open to individuals and school clubs. Awards of up to $2,500.</p>
      <p>Deadline: applications were due January 15, 2026.</p>
      </body></html>`,
  },
  '/funders/creditco/business-growth': {
    title: 'Business Growth Program — CreditCo',
    html: `<html><head><title>Business Growth Program</title></head><body>
      <h1>STEM Business Growth Funding Program</h1>
      <p>CreditCo Financial offers growth capital for education and STEM businesses.</p>
      <p>Amounts from $5,000 to $100,000. Funds must be repaid over 36 months at an interest rate of 8.9%.</p>
      <p>Applications are accepted on a rolling basis.</p>
      </body></html>`,
  },
  '/funders/quickcash/stem-grant': {
    title: 'Guaranteed STEM Grant — QuickCash',
    html: `<html><head><title>Guaranteed STEM Grant</title></head><body>
      <h1>Guaranteed STEM Education Grant</h1>
      <p>Every applicant receives funding. You are guaranteed funding once your file is processed.</p>
      <p>Open to individuals in Maryland for STEM education projects. Awards up to $9,000.</p>
      <p>A processing fee of $49 is required to release your grant funds.</p>
      <p>Deadline: applications are due October 30, 2026.</p>
      </body></html>`,
  },
};

export const GRANTS_GOV_HITS = [
  {
    id: 355001,
    number: 'ED-STEM-2027-001',
    title: 'STEM Education Outreach Partnerships',
    agencyName: 'Department of Education',
    openDate: '01102026',
    closeDate: '11202026',
    oppStatus: 'posted',
  },
  {
    id: 355002,
    number: 'NSF-AISL-2027',
    title: 'Advancing Informal STEM Learning',
    agencyName: 'National Science Foundation',
    openDate: '02012026',
    closeDate: '02152027',
    oppStatus: 'posted',
  },
];

export const GRANTS_GOV_DETAILS = {
  355001: {
    id: 355001,
    opportunityTitle: 'STEM Education Outreach Partnerships',
    agencyName: 'Department of Education',
    opportunityNumber: 'ED-STEM-2027-001',
    fundingActivityCategories: [{ description: 'Education' }],
    synopsis: {
      synopsisDesc: 'Supports partnerships that expand STEM education and robotics outreach to underserved students in grades 6-12.',
      applicantEligibilityDesc: 'Local educational agencies and nonprofit organizations with 501(c)(3) status may apply. Individuals are not eligible to apply.',
      awardFloor: '75000',
      awardCeiling: '400000',
      estimatedFunding: '4000000',
      numberOfAwards: '10',
      responseDate: '2026-11-20',
      postingDate: '2026-01-10',
      costSharing: true,
      additionalInformationUrl: 'https://www.ed.gov/stem-outreach-partnerships',
      applicantTypes: [
        { id: '06', description: 'Public and State controlled institutions of higher education' },
        { id: '12', description: 'Nonprofits having a 501(c)(3) status with the IRS, other than institutions of higher education' },
      ],
    },
  },
  355002: {
    id: 355002,
    opportunityTitle: 'Advancing Informal STEM Learning',
    agencyName: 'National Science Foundation',
    opportunityNumber: 'NSF-AISL-2027',
    fundingActivityCategories: [{ description: 'Science and Technology' }],
    synopsis: {
      synopsisDesc: 'Funds research and practice in informal science education, including museums, after-school robotics and youth STEM outreach programs.',
      applicantEligibilityDesc: 'Institutions of higher education and non-profit, non-academic organizations may submit proposals.',
      awardFloor: '150000',
      awardCeiling: '3000000',
      responseDate: '2027-02-15',
      costSharing: false,
      additionalInformationUrl: 'https://www.nsf.gov/funding/aisl',
      applicantTypes: [
        { id: '06', description: 'Public and State controlled institutions of higher education' },
        { id: '25', description: 'Others (see text field entitled Additional Information for Eligibility)' },
      ],
    },
  },
};

/** Which fixture pages a query should surface. Keyword-matched, like a real engine. */
function searchIndex(query) {
  const q = query.toLowerCase();
  const all = Object.keys(PAGES);
  return all.filter((path) => {
    const text = `${path} ${PAGES[path].title} ${PAGES[path].html}`.toLowerCase();
    const terms = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 3);
    return terms.some((term) => text.includes(term));
  });
}

export function startFixtureServer({ port = 0 } = {}) {
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = (status, body, type = 'application/json') => {
      response.writeHead(status, { 'content-type': type });
      response.end(typeof body === 'string' ? body : JSON.stringify(body));
    };

    if (url.pathname === '/robots.txt') return send(200, 'User-agent: *\nAllow: /\n', 'text/plain');

    if (url.pathname === '/api/search2') {
      const body = await readJson(request);
      const keyword = String(body.keyword || '').toLowerCase();
      const hits = GRANTS_GOV_HITS.filter((hit) =>
        keyword.split(/\s+/).some((term) => term.length > 3 && `${hit.title} ${hit.agencyName}`.toLowerCase().includes(term)));
      return send(200, { errorcode: 0, data: { hitCount: hits.length, startRecord: 0, oppHits: hits } });
    }

    if (url.pathname === '/api/fetchOpportunity') {
      const body = await readJson(request);
      const detail = GRANTS_GOV_DETAILS[body.opportunityId];
      if (!detail) return send(200, { errorcode: 1, msg: 'Opportunity not found' });
      return send(200, { errorcode: 0, data: detail });
    }

    if (url.pathname === '/search') {
      const query = url.searchParams.get('q') || '';
      const base = `http://localhost:${server.address().port}`;
      const results = searchIndex(query).map((path) => ({
        url: `${base}${path}`,
        title: PAGES[path].title,
        content: PAGES[path].title,
      }));
      // A real search engine also returns aggregator noise; include some so the
      // trust filter has something to reject.
      results.push({ url: 'https://grantwatch.com/stem-grants-list', title: '25 STEM Grants for 2026', content: 'A list of grants' });
      return send(200, { results });
    }

    if (PAGES[url.pathname]) {
      return send(200, PAGES[url.pathname].html, 'text/html; charset=utf-8');
    }

    send(404, { error: 'not found' });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      server,
      port: server.address().port,
      origin: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise((done) => server.close(done)),
    }));
  });
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const instance = await startFixtureServer({ port: Number(process.env.FIXTURE_PORT) || 8899 });
  console.log(`fixture server on ${instance.origin}`);
}
