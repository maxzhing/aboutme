"""Finds Wikisource page titles, politely (one request at a time, with a pause and a user agent).
   python3 scripts/sources/wssearch.py "query one" "query two" ..."""
import json, sys, time, urllib.parse, urllib.request

for q in sys.argv[1:]:
    url = 'https://en.wikisource.org/w/api.php?action=query&list=search&srlimit=4&format=json&srsearch=' + urllib.parse.quote(q)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'stellify-source-check/1.0 (educational question sourcing)'})
            data = json.load(urllib.request.urlopen(req, timeout=30))
            print(f'{q[:44]:<46}', ' || '.join(x['title'] for x in data['query']['search']))
            break
        except Exception as e:  # rate limited or busy: wait and retry
            time.sleep(3 * (attempt + 1))
    else:
        print(f'{q[:44]:<46} (no answer)')
    time.sleep(1.5)
