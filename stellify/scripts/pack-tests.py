#!/usr/bin/env python3
"""Merges exported full practice tests into a private question pack and shrinks their images.

    python3 scripts/pack-tests.py private/pack-qb-only.json export1.json [export2.json ...] -o private/pack.json

Each export is {"items": [...], "tests": [...]} as saved by the app after importing a College Board
practice test (see the README). Question images become grayscale JPEGs at 80% size; explanation
images (typeset text) become 8-shade PNGs at 90% size, which stay sharp and are much smaller.
The pack holds the College Board's copyrighted questions: keep it, and any build made from it, private.
"""
import base64, io, json, sys
from PIL import Image

def shrink(data_url, kind):
    im = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('L')
    out = io.BytesIO()
    if kind == 'question':
        im = im.resize((round(im.width * 0.8), round(im.height * 0.8)), Image.LANCZOS)
        im.save(out, 'JPEG', quality=68, optimize=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(out.getvalue()).decode()
    im = im.resize((round(im.width * 0.9), round(im.height * 0.9)), Image.LANCZOS)
    im.quantize(colors=8).save(out, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(out.getvalue()).decode()

def main():
    args = sys.argv[1:]
    out_path = args[args.index('-o') + 1]
    sources = [a for i, a in enumerate(args) if a != '-o' and (i == 0 or args[i - 1] != '-o')]
    base = json.load(open(sources[0]))
    items = list(base if isinstance(base, list) else base['items'])
    tests = [] if isinstance(base, list) else list(base.get('tests', []))
    have = {i['id'] for i in items}
    for src in sources[1:]:
        d = json.load(open(src))
        for t in d['tests']:
            t.pop('imported', None)
            tests = [x for x in tests if x['id'] != t['id']] + [t]
        for it in d['items']:
            if it['id'] in have:
                continue
            it.pop('imported', None)
            if it.get('image'): it['image'] = shrink(it['image'], 'question')
            if it.get('rationaleImage'): it['rationaleImage'] = shrink(it['rationaleImage'], 'explanation')
            items.append(it); have.add(it['id'])
    tests.sort(key=lambda t: t.get('number') or 0)
    json.dump({'items': items, 'tests': tests}, open(out_path, 'w'), separators=(',', ':'))
    print(f'{len(items)} questions, {len(tests)} full tests: {", ".join(t["name"] for t in tests)}')

main()
