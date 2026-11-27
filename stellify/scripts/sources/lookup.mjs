// Looks up a real source so a passage can be checked against it.
//   node scripts/sources/lookup.mjs crossref "<title or citation words>"   → top Crossref matches (title, authors, journal, year, DOI)
//   node scripts/sources/lookup.mjs pubmed "<search terms>"                → top PubMed matches with their abstracts
//   node scripts/sources/lookup.mjs doi 10.xxxx/yyyy                       → that work's Crossref record (and PubMed abstract, if any)
//   node scripts/sources/lookup.mjs gutenberg <ebook number> "<phrase>"    → the phrase in context, exactly as printed
const [mode, ...rest] = process.argv.slice(2);
const q = rest.filter((x) => x !== '--no-pubmed').join(' ');
const get = async (u) => { for (let i = 0; i < 4; i++) { const r = await fetch(u, { headers: { 'user-agent': 'stellify-source-check/1.0' } }); if (r.ok) return r; await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); } throw new Error(`fetch failed: ${u}`); };
const fmt = (w) => `${(w.title ?? [''])[0]}\n  ${(w.author ?? []).map((a) => `${a.given ?? ''} ${a.family ?? ''}`.trim()).join(', ')}\n  ${(w['container-title'] ?? [''])[0]} (${(w.issued?.['date-parts']?.[0] ?? [''])[0]})  https://doi.org/${w.DOI}`;
async function pubmedAbstract(term) {
  const s = await (await get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=3&term=${encodeURIComponent(term)}`)).json();
  const ids = s.esearchresult.idlist;
  if (!ids.length) return 'PubMed: no match';
  const t = await (await get(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&rettype=abstract&retmode=text&id=${ids.join(',')}`)).text();
  // keep each record's citation, title and abstract; drop the author affiliations and comment lists
  const recs = t.split(/\n(?=\d+\. [A-Z])/).map((r) => r.replace(/Author information:[\s\S]*?\n\n/, '').replace(/(Update in|Comment in|Erratum in|Comment on)[\s\S]*?\n\n/g, '').replace(/\n(?!\n)/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 1400));
  return `PubMed ids: ${ids.join(', ')}\n` + recs.map((r, i) => `[https://pubmed.ncbi.nlm.nih.gov/${ids[i]}/] ${r}`).join('\n');
}
if (mode === 'crossref') {
  const j = await (await get(`https://api.crossref.org/works?rows=4&query.bibliographic=${encodeURIComponent(q)}`)).json();
  console.log(j.message.items.map(fmt).join('\n\n'));
} else if (mode === 'pubmed') {
  console.log(await pubmedAbstract(q));
} else if (mode === 'doi') {
  const j = await (await get(`https://api.crossref.org/works/${encodeURIComponent(q)}`)).json();
  console.log(fmt(j.message)); if (j.message.abstract) console.log('  ABSTRACT: ' + j.message.abstract.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 1200)); if (!rest.includes('--no-pubmed')) console.log(await pubmedAbstract(`${q}[doi]`));
} else if (mode === 'gutenberg') {
  const [num, ...phrase] = rest; const p = phrase.join(' ').toLowerCase();
  const t = await (await get(`https://www.gutenberg.org/cache/epub/${num}/pg${num}.txt`)).text();
  const flat = t.replace(/\r/g, '');
  const i = flat.toLowerCase().indexOf(p);
  console.log(flat.slice(0, 400).split('\n').slice(0, 8).join('\n'));
  console.log(i < 0 ? `\nPHRASE NOT FOUND: "${p}"` : `\n…${flat.slice(Math.max(0, i - 700), i + 900)}…`);
} else if (mode === 'wikisource') {
  // node lookup.mjs wikisource "<page title>" ["<phrase>"]  → the page's plain text (or the phrase in context)
  const [page, ...phrase] = q.split(' | ');
  const j = await (await get(`https://en.wikisource.org/w/api.php?action=parse&redirects=1&prop=text&format=json&formatversion=2&page=${encodeURIComponent(page)}`)).json();
  if (j.error) { console.log('NOT FOUND', j.error.info); process.exit(0); }
  const text = j.parse.text.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|div|li|h\d)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&#160;|&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”').replace(/&#91;|&#93;/g, '').replace(/\n{3,}/g, '\n\n');
  console.log(`https://en.wikisource.org/wiki/${encodeURIComponent(j.parse.title.replace(/ /g, '_'))}`);
  const ph = (phrase.join(' | ') || '').toLowerCase();
  if (!ph) console.log(text.slice(0, 6000));
  else { const i = text.toLowerCase().indexOf(ph); console.log(i < 0 ? `PHRASE NOT FOUND: "${ph}"` : `…${text.slice(Math.max(0, i - 600), i + 900)}…`); }
} else console.log('modes: crossref | pubmed | doi | gutenberg');
