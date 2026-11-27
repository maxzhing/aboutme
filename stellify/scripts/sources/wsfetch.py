"""Saves Wikisource pages as plain text, politely, so quotations can be copied and checked exactly.
   python3 scripts/sources/wsfetch.py <out_dir> "Page title" ["Page title" ...]"""
import html, json, os, re, sys, time, urllib.parse, urllib.request

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
for title in sys.argv[2:]:
    url = 'https://en.wikisource.org/w/api.php?action=parse&redirects=1&prop=text&format=json&formatversion=2&page=' + urllib.parse.quote(title)
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'stellify-source-check/1.0 (educational question sourcing)'})
            data = json.load(urllib.request.urlopen(req, timeout=40))
            break
        except Exception:
            time.sleep(4 * (attempt + 1))
    else:
        print('FAILED', title); continue
    if 'error' in data:
        print('NOT FOUND', title); continue
    t = data['parse']['text']
    t = re.sub(r'<style[\s\S]*?</style>', '', t)
    t = re.sub(r'<sup[\s\S]*?</sup>', '', t)  # footnote markers
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = re.sub(r'</(p|div|li|h\d|tr)>', '\n', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t)).replace('​', '')
    t = re.sub(r'\n{3,}', '\n\n', t)
    page = data['parse']['title']
    slug = re.sub(r'[^a-z0-9]+', '-', page.lower()).strip('-')[:60]
    with open(os.path.join(out, slug + '.txt'), 'w') as f:
        f.write('https://en.wikisource.org/wiki/' + urllib.parse.quote(page.replace(' ', '_'), safe='/()!,') + '\n\n' + t)
    print('saved', slug, len(t))
    time.sleep(1.5)
