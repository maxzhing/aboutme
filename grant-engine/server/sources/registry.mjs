/**
 * Source trust registry.
 *
 * The product principle is "primary sources beat grant-list websites", so trust
 * is a property of the *domain*, decided before any content is read. A tier-1
 * domain is the funder speaking for itself; a tier-4 domain is someone else
 * describing a funder and can never on its own justify a verified claim.
 */

export const TIER = Object.freeze({
  OFFICIAL_GOVERNMENT: 1, // .gov / .mil / official government portals
  FUNDER_PRIMARY: 2,      // the funder's own website (foundation, corporate giving, university)
  INSTITUTIONAL: 3,       // universities, libraries, established intermediaries republishing terms
  AGGREGATOR: 4,          // grant-list sites, blogs, SEO pages
  UNTRUSTED: 5,           // known-spam or payment-gated "grant" sites
});

export const TIER_LABEL = Object.freeze({
  1: 'Official government source',
  2: 'Funder\'s own website',
  3: 'Institutional source',
  4: 'Third-party grant listing',
  5: 'Untrusted source',
});

/** Known aggregators: usable as *leads*, never as proof. */
const AGGREGATOR_DOMAINS = new Set([
  'grantwatch.com', 'grantstation.com', 'instrumentl.com', 'candid.org', 'grantsforward.com',
  'fundsforngos.org', 'grantnews.com', 'philanthropynewsdigest.org', 'submittable.com',
  'grantforward.com', 'pivot.proquest.com', 'idealist.org', 'grantselect.com', 'grants.com',
  'fastweb.com', 'scholarships.com', 'niche.com', 'bold.org', 'scholarshipowl.com', 'unigo.com',
  'cappex.com', 'chegg.com', 'salliemae.com', 'going merry.com', 'goingmerry.com',
  'wikipedia.org', 'reddit.com', 'quora.com', 'medium.com', 'linkedin.com', 'facebook.com',
  'youtube.com', 'x.com', 'twitter.com', 'pinterest.com', 'blogspot.com', 'wordpress.com',
]);

/** Patterns that indicate a scam or lead-generation site rather than a funder. */
const UNTRUSTED_PATTERNS = [
  /free-?money/i,
  /government-?grants?-?(?:free|now|today|4u)/i,
  /grant-?money-?(?:free|now)/i,
  /claim-?your-?grant/i,
  /grants?-?for-?you/i,
  /personal-?grants?/i,
];

/** Government-adjacent official portals that are not literally *.gov. */
const OFFICIAL_NON_GOV = new Set([
  'grants.gov', 'sam.gov', 'usaspending.gov', 'nsf.gov', 'nih.gov', 'ed.gov', 'arts.gov', 'neh.gov',
  'imls.gov', 'sba.gov', 'usda.gov', 'energy.gov', 'epa.gov', 'hhs.gov', 'hud.gov', 'doi.gov',
  'research.gov', 'grantsolutions.gov', 'simpler.grants.gov', 'europa.eu', 'ukri.org', 'canada.ca',
]);

/** Institutional TLDs and hosts whose republished terms are usually accurate. */
const INSTITUTIONAL_SUFFIXES = ['.edu', '.ac.uk', '.edu.au'];

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Strip one level of subdomain to compare registrable-ish domains. */
export function baseDomain(host) {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const twoLevelTlds = ['co.uk', 'ac.uk', 'org.uk', 'com.au', 'org.au', 'edu.au', 'co.nz', 'gov.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoLevelTlds.includes(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

export function classifySource(url) {
  const host = hostOf(url);
  if (!host) return { tier: TIER.UNTRUSTED, label: TIER_LABEL[5], host, reason: 'Unparseable URL' };

  const domain = baseDomain(host);

  if (UNTRUSTED_PATTERNS.some((pattern) => pattern.test(host))) {
    return { tier: TIER.UNTRUSTED, label: TIER_LABEL[5], host, reason: 'Domain name matches known grant-scam patterns' };
  }
  if (host.endsWith('.gov') || host.endsWith('.mil') || OFFICIAL_NON_GOV.has(domain) || host.endsWith('.gov.uk')) {
    return { tier: TIER.OFFICIAL_GOVERNMENT, label: TIER_LABEL[1], host, reason: 'Official government domain' };
  }
  if (AGGREGATOR_DOMAINS.has(domain)) {
    return { tier: TIER.AGGREGATOR, label: TIER_LABEL[4], host, reason: 'Third-party grant listing or social platform, not the funder' };
  }
  if (INSTITUTIONAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return { tier: TIER.INSTITUTIONAL, label: TIER_LABEL[3], host, reason: 'Educational institution domain' };
  }
  if (host.endsWith('.org') || host.endsWith('.foundation') || host.endsWith('.fund') || host.endsWith('.charity')) {
    return { tier: TIER.FUNDER_PRIMARY, label: TIER_LABEL[2], host, reason: 'Nonprofit or foundation domain' };
  }
  if (host.endsWith('.com') || host.endsWith('.net') || host.endsWith('.co')) {
    return { tier: TIER.FUNDER_PRIMARY, label: TIER_LABEL[2], host, reason: 'Organization website (verify it is the funder, not a reseller)' };
  }
  return { tier: TIER.INSTITUTIONAL, label: TIER_LABEL[3], host, reason: 'Unclassified domain' };
}

export function isPrimarySource(url) {
  return classifySource(url).tier <= TIER.FUNDER_PRIMARY;
}

export function isAggregator(url) {
  return classifySource(url).tier >= TIER.AGGREGATOR;
}

/**
 * Does a candidate URL plausibly belong to the funder we think it does?
 * Used to catch an aggregator page masquerading as an official application URL.
 */
export function domainMatchesFunder(url, funderName) {
  if (!url || !funderName) return false;
  const host = baseDomain(hostOf(url));
  if (!host) return false;
  const hostTokens = host.replace(/\.[a-z.]+$/, '').split(/[-.]/).filter(Boolean);
  const nameTokens = String(funderName)
    .toLowerCase()
    .replace(/\b(?:the|foundation|fund|trust|inc|llc|corporation|company|charitable|charities|of|for|and|department|office|us|u\.s\.)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
  if (nameTokens.length === 0) return false;
  return nameTokens.some((token) =>
    hostTokens.some((hostToken) => hostToken.includes(token) || token.includes(hostToken)),
  );
}
