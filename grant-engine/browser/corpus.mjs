/**
 * Bundled demonstration corpus.
 *
 * EVERY FUNDER BELOW IS FICTIONAL. None of these organizations, programs,
 * deadlines or award amounts exist. They are written to exercise the engine's
 * real decision paths — a clean match, a 501(c)(3)-only grant, an expired
 * program, a loan, an advance-fee scam, a contest, a rolling micro-grant — so
 * the analysis you see is genuine even though the opportunities are not.
 *
 * Every domain ends in `.demo.invalid`. `.invalid` is reserved by RFC 2606 and
 * can never resolve, so no link here can lead anywhere real and no entry can be
 * mistaken for a genuine funding opportunity.
 *
 * The pages are raw HTML on purpose: the browser build runs the same
 * htmlToText → patternExtract → ground → evaluate path the server runs on live
 * pages, rather than being handed pre-parsed records.
 */

export const CORPUS_NOTICE =
  'These results come from a bundled set of fictional funders, not from a live search. '
  + 'Every funder, deadline and award amount below is invented. The eligibility analysis, '
  + 'scoring, exclusions and evidence checking are the real engine running on them.';

const page = (host, path, title, body) => ({
  url: `https://${host}.demo.invalid${path}`,
  title,
  html: `<html><head><title>${title}</title></head><body>${body}</body></html>`,
});

export const CORPUS = [
  page('openfield', '/grants/youth-stem', 'Youth STEM Innovation Grant — Openfield Family Foundation', `
    <h1>Youth STEM Innovation Grant Program</h1>
    <p>The Openfield Family Foundation supports hands-on science, robotics and computer science
    education for students across the mid-Atlantic region.</p>
    <h2>Eligibility</h2>
    <ul>
      <li>Individuals may apply. Students aged 13 and older are eligible to apply directly.</li>
      <li>Applicants must be located in Maryland, Virginia or the District of Columbia.</li>
      <li>No matching funds are required, and no organizational status is needed.</li>
    </ul>
    <h2>Award</h2>
    <p>Awards range from $1,000 to $8,000 per project.</p>
    <h2>Deadline</h2>
    <p>Deadline: applications are due December 12, 2026.</p>
    <p>Required documents: a one-page project description, a simple budget, and one letter of reference.</p>`),

  page('brightline', '/robotics', 'Robotics Access Fund — Brightline Foundation', `
    <h1>Robotics Access Fund</h1>
    <p>The Brightline Foundation believes every young person deserves the chance to build something.</p>
    <p>Our STEM education and youth development work reaches communities across the country.</p>
    <a href="/robotics/guidelines">Eligibility &amp; Guidelines</a>
    <a href="/news">Latest news</a>`),

  page('brightline', '/robotics/guidelines', 'Robotics Access Fund guidelines — Brightline Foundation', `
    <h1>Robotics Access Fund Guidelines</h1>
    <p>The Brightline Foundation supports youth robotics, maker programs and STEM education projects
    reaching students who would not otherwise have access.</p>
    <h2>Eligibility</h2>
    <p>Individuals may apply. School clubs, community groups and individual students are all welcome.</p>
    <p>Awards range from $500 to $3,000.</p>
    <p>Deadline: applications are due October 9, 2026.</p>`),

  page('harborough', '/stem-capacity', 'STEM Capacity Grant — Harborough Trust', `
    <h1>STEM Capacity Building Grant</h1>
    <p>The Harborough Trust funds STEM education and youth robotics programming across the mid-Atlantic.</p>
    <h2>Who can apply</h2>
    <p>Applicants must be a registered 501(c)(3) organization. Individuals are not eligible to apply.</p>
    <p>Organizations must be located in Maryland.</p>
    <h2>Grant size</h2>
    <p>Grants range from $10,000 to $50,000.</p>
    <p>Deadline: applications close on March 31, 2027.</p>`),

  page('lapsed', '/robotics-mini-grant', 'Robotics Mini-Grant — Lapsed Foundation', `
    <h1>Robotics Mini-Grant Program</h1>
    <p>The Lapsed Foundation supported youth robotics teams and STEM outreach clubs.</p>
    <p>Open to individuals and school clubs. Awards of up to $2,500.</p>
    <p>Deadline: applications were due January 15, 2026.</p>`),

  page('creditco', '/business-growth', 'Business Growth Program — CreditCo', `
    <h1>STEM Business Growth Funding Program</h1>
    <p>CreditCo Financial Corporation offers growth capital for education and STEM businesses.</p>
    <p>Amounts from $5,000 to $100,000. Funds must be repaid over 36 months at an interest rate of 8.9%.</p>
    <p>Applications are accepted on a rolling basis.</p>`),

  page('quickcash', '/stem-grant', 'Guaranteed STEM Grant — QuickCash', `
    <h1>Guaranteed STEM Education Grant</h1>
    <p>Every applicant receives funding. You are guaranteed funding once your file is processed.</p>
    <p>Open to individuals in every state for STEM education projects. Awards up to $9,000.</p>
    <p>A processing fee of $49 is required to release your grant funds.</p>
    <p>Deadline: applications are due October 30, 2026.</p>`),

  page('meridian', '/small-business', 'Neighborhood Business Grant — Meridian Community Foundation', `
    <h1>Neighborhood Business Growth Grant</h1>
    <p>The Meridian Community Foundation supports small business assistance and main street
    revitalization, funding equipment, inventory and staff training for independent businesses.</p>
    <h2>Eligibility</h2>
    <p>Applicants must be a registered business with fewer than 25 employees.</p>
    <p>Individuals may apply if they are the sole proprietor of the business.</p>
    <p>Awards range from $5,000 to $30,000.</p>
    <p>Deadline: applications are due November 6, 2026.</p>`),

  page('calloway', '/artist-fellowship', 'Individual Artist Fellowship — Calloway Arts Trust', `
    <h1>Individual Artist Fellowship Program</h1>
    <p>The Calloway Arts Trust supports individual artists working in painting, sculpture, film,
    music and literature through unrestricted fellowships for studio time and creative practice.</p>
    <h2>Eligibility</h2>
    <p>Individuals may apply. Applicants must be at least 18 years of age.</p>
    <p>Applicants must be a U.S. citizen or permanent resident.</p>
    <p>Students enrolled in a degree program are not eligible to apply.</p>
    <p>Fellowships are $25,000 each.</p>
    <p>Deadline: applications are due September 18, 2026.</p>`),

  page('northgate', '/food-security', 'Food Security Grant — Northgate Foundation', `
    <h1>Community Food Security Grant</h1>
    <p>The Northgate Foundation funds hunger relief, food pantries and nutrition programs serving
    rural communities.</p>
    <h2>Eligibility</h2>
    <p>Applicants must be a registered 501(c)(3) organization with at least 2 years of operating history.</p>
    <p>Matching funds of 1:1 are required.</p>
    <p>Grants range from $20,000 to $75,000.</p>
    <p>Deadline: applications close on January 30, 2027.</p>`),

  page('vantage', '/research-seed', 'Research Seed Grant — Vantage Institute', `
    <h1>Early Career Research Seed Grant</h1>
    <p>The Vantage Institute funds investigator-initiated research in the health and environmental
    sciences, supporting pilot studies that lead to larger federal awards.</p>
    <h2>Eligibility</h2>
    <p>Applicants must be affiliated with an accredited institution of higher education.</p>
    <p>Applicants must have at least 3 years of postdoctoral research experience.</p>
    <p>Awards are up to $60,000 over two years.</p>
    <p>Deadline: applications are due February 27, 2027.</p>`),

  page('kestrel', '/classroom-tech', 'Classroom Technology Grant — Kestrel Education Fund', `
    <h1>Classroom Technology and Digital Literacy Grant</h1>
    <p>The Kestrel Education Fund provides equipment, laptops and curriculum support for public
    school classrooms teaching computer science and digital literacy.</p>
    <h2>Eligibility</h2>
    <p>Applicants must be a public school, charter school or school district.</p>
    <p>Individual teachers may apply on behalf of their school.</p>
    <p>Awards range from $2,000 to $15,000.</p>
    <p>Deadline: applications are due October 3, 2026.</p>`),

  page('anchor', '/micro-grant', 'Community Micro-Grant — Anchor Neighborhood Fund', `
    <h1>Community Micro-Grant Program</h1>
    <p>The Anchor Neighborhood Fund makes small, fast grants for community projects: block parties,
    murals, community gardens, tool libraries, tutoring circles and youth programming.</p>
    <h2>Eligibility</h2>
    <p>Individuals may apply. No organizational status, no 501(c)(3) and no budget history is required.</p>
    <p>Applications are accepted on a rolling basis throughout the year.</p>
    <p>Awards of up to $1,500.</p>`),

  page('summit', '/pitch-competition', 'Youth Innovation Prize — Summit Education Council', `
    <h1>Youth Innovation Prize</h1>
    <p>The Summit Education Council runs an annual pitch competition for student-led STEM and
    social innovation projects.</p>
    <h2>How it works</h2>
    <p>Finalists present to a panel and judges will select the winner in a live pitch competition.</p>
    <p>Individuals may apply. Applicants must be enrolled high school students.</p>
    <p>The grand prize is $10,000, with three runner-up prizes of $2,500.</p>
    <p>Deadline: applications are due November 21, 2026.</p>`),

  page('ridgeway', '/capital-partnership', 'Community Facilities Partnership — Ridgeway Trust', `
    <h1>Community Facilities Capital Partnership</h1>
    <p>The Ridgeway Trust funds construction and renovation of community facilities including
    youth centers, libraries and community health buildings.</p>
    <h2>Eligibility</h2>
    <p>Applicants must be a registered 501(c)(3) organization or a unit of local government.</p>
    <p>Applicants must partner with at least one other community organization.</p>
    <p>Matching funds are required on a dollar-for-dollar basis.</p>
    <p>Applicants must have a demonstrated track record of managing capital projects.</p>
    <p>Awards range from $100,000 to $750,000.</p>
    <p>Deadline: applications close on April 15, 2027.</p>`),
];
