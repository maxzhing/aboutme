/**
 * Deduplication.
 *
 * Ten search strategies deliberately overlap, and the same opportunity is often
 * published on a funder's site, a state portal and three listing sites. Merging
 * is preferred over discarding: when two copies of a grant disagree, the copy
 * from the more authoritative source wins, and facts the weaker copy uniquely
 * verified are kept.
 */

import { isVerified } from '../lib/evidence.mjs';
import { classifySource } from '../sources/registry.mjs';

const TRACKING_PARAMS = /^(?:utm_|fbclid|gclid|msclkid|mc_cid|mc_eid|ref|source|_ga)/i;

export function canonicalUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.protocol = 'https:';
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    let path = parsed.pathname.replace(/\/+$/, '');
    if (path === '') path = '/';
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return String(url || '').trim().toLowerCase();
  }
}

/**
 * The canonical form is a *comparison key only*. The lead keeps the URL it was
 * actually discovered at, because canonicalization normalizes the scheme and
 * trailing slash and fetching the normalized form can hit a different resource
 * (or nothing at all).
 */
export function dedupeLeads(leads) {
  const seen = new Map();
  for (const lead of leads) {
    if (!lead?.url) continue;
    const key = canonicalUrl(lead.url);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...lead, canonical: key, foundByQueries: [lead.query].filter(Boolean) });
      continue;
    }
    if (lead.query && !existing.foundByQueries.includes(lead.query)) existing.foundByQueries.push(lead.query);
    if (!existing.title && lead.title) existing.title = lead.title;
    if (!existing.snippet && lead.snippet) existing.snippet = lead.snippet;
  }
  // A URL found by several independent strategies is a stronger lead.
  return [...seen.values()].sort((a, b) => b.foundByQueries.length - a.foundByQueries.length);
}

/** Loose title comparison: punctuation, case and filler words removed. */
export function titleKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(?:the|a|an|of|for|and|grant|grants|program|fund|funding|award|awards|opportunity|initiative|\d{4})\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function identityKeys(record) {
  const keys = [];
  const url = record.applicationUrl?.value || record.officialUrl?.value;
  if (url) keys.push(`url:${canonicalUrl(url)}`);
  const number = record.opportunityNumber?.value;
  if (number) keys.push(`num:${String(number).toLowerCase().trim()}`);
  const name = titleKey(record.grantName?.value);
  const funder = titleKey(record.funder?.value);
  if (name && funder) keys.push(`nf:${funder}|${name}`);
  return keys;
}

function recordStrength(record) {
  const urls = [record.applicationUrl?.value, record.officialUrl?.value, ...(record.sourceUrls || [])].filter(Boolean);
  const tier = urls.length ? Math.min(...urls.map((url) => classifySource(url).tier)) : 9;
  const verified = Object.values(record).filter((value) => isVerified(value)).length;
  // Lower tier is better; more verified fields is better.
  return { tier, verified };
}

/** Merge b into a, keeping a's identity but adopting any field b verified that a did not. */
export function mergeRecords(primary, secondary) {
  const merged = { ...primary };
  for (const [key, value] of Object.entries(secondary)) {
    if (key === 'id') continue;
    if (Array.isArray(value) && key === 'sourceUrls') {
      merged.sourceUrls = [...new Set([...(primary.sourceUrls || []), ...value])];
      continue;
    }
    if (!isVerified(primary[key]) && isVerified(value)) merged[key] = value;
  }
  merged.mergedFrom = [...new Set([...(primary.mergedFrom || []), secondary.id].filter(Boolean))];
  merged.sourceUrls = [...new Set([...(merged.sourceUrls || []), ...(secondary.sourceUrls || [])])];
  return merged;
}

export function dedupeRecords(records) {
  const byKey = new Map();
  const output = [];

  for (const record of records) {
    const keys = identityKeys(record);
    const matchIndex = keys.map((key) => byKey.get(key)).find((index) => index !== undefined);

    if (matchIndex === undefined) {
      const index = output.push(record) - 1;
      for (const key of keys) byKey.set(key, index);
      continue;
    }

    const existing = output[matchIndex];
    const existingStrength = recordStrength(existing);
    const incomingStrength = recordStrength(record);
    const incomingWins =
      incomingStrength.tier < existingStrength.tier ||
      (incomingStrength.tier === existingStrength.tier && incomingStrength.verified > existingStrength.verified);

    output[matchIndex] = incomingWins ? mergeRecords(record, existing) : mergeRecords(existing, record);
    for (const key of identityKeys(output[matchIndex])) byKey.set(key, matchIndex);
  }

  return output;
}
