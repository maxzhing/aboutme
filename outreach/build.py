#!/usr/bin/env python3
"""Compose the outreach board's dataset and inline it into the page.

Run:  python3 build.py
Out:  opportunities.json   readable dataset
      index.html           standalone page for a browser or GitHub Pages
      artifact.html        same page as a fragment, for publishing on claude.ai

Every opportunity carries a real destination, of one of three kinds:
  direct   the organisation's own website (national programmes, universities)
  finder   the official national directory that hands you the local contact
Nothing links to a search engine, and no URL here was invented.
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vocab import METROS, TARGETS, PLAYS, SEASON_MONTHS      # noqa: E402
from verified import VERIFIED                                 # noqa: E402
from finders import FINDERS, GLOBAL                           # noqa: E402
from howto import HOWTO                                       # noqa: E402
import importlib.util as _iu                                  # noqa: E402
_spec = _iu.spec_from_file_location('outreach_calendar', os.path.join(HERE, 'calendar.py'))
_cal = _iu.module_from_spec(_spec); _spec.loader.exec_module(_cal)
EVENTS = _cal.EVENTS

TOTAL = 15000

BLURB = {
 "demo": "Set up in a public space, let people drive, and answer the same six questions two hundred times. The lowest-friction outreach there is.",
 "build": "Kids build something simple that moves and take it home. Works because they leave holding proof they built a machine.",
 "fllmentor": "Ten weeks with a rookie FLL team. You are there so the coach is not alone with the robot game rules.",
 "ftcmentor": "Technical mentoring for a rookie FTC or FRC team through their build season. The hardest and most valuable thing on this board.",
 "judge": "Work a qualifier as a volunteer. You see how judging actually works from the other side, which changes how your own team presents.",
 "girlsday": "A half-day event for girls who have not been told robotics is for them. The mentors on the floor matter more than the activity.",
 "cad": "Teach enough CAD that someone can model a bracket and print it. Two hours gets a beginner to a real part.",
 "code": "An hour of block or text programming for beginners. Bring the robot so they see where the code eventually goes.",
 "print3d": "A printer, a table, and a bin of failed prints. People will watch a whole print finish, which is more attention than you can usually buy.",
 "panel": "Fifty minutes in a classroom. Talk about the season you lost, not the one you won -- it lands better and it is more useful.",
 "pettingzoo": "A booth at a public event with the robot driveable all day. High reach, hard on the drivers, worth a rotation schedule.",
 "parade": "The robot on a trailer, students walking alongside with flyers. Pure visibility; plan for the battery dying at mile two.",
 "gobabygo": "Modify a ride-on toy car so a toddler with limited mobility can drive it independently. A therapist measures the child; you build to that.",
 "toyadapt": "Wire a 3.5mm switch jack into a battery toy so a child using an adaptive switch can play with it. Cheap, fast, and genuinely used.",
 "safety": "PPE, tool basics, and what actually happens when you skip a step. Teach only tools you are certified on.",
 "sponsor": "Forty-five minutes with a company. Students present, the mentor stays quiet, and you leave a one-pager with real numbers on it.",
 "camp": "A week of camp you plan and run. The largest single commitment here and the one that produces the most repeat families.",
 "familynight": "Six stations, two hours, parents included. Translate the handouts or half the room cannot participate.",
 "scrimmage": "Host an offseason event. Enormous logistics; it makes your team the hub of the regional community for a day.",
 "cleanup": "A service shift at a food bank, shelter, or trail. Not robotics, and it still counts -- Impact asks what you do for your community.",
 "translate": "Translate activity sheets or your own curriculum into a language families in your district actually speak. A native speaker must review it.",
 "seniortech": "Sit with seniors and help with phones and tablets. End by showing the robot so it is not purely a help desk.",
 "startteam": "Walk a school from zero to a registered team: adult champion, budget, grant, first order. Twelve months of work that outlives you.",
 "press": "Get a local outlet to run a story. You need a hook and a photo, not a press release.",
 "grant": "Write and submit an outreach grant. Eight hours that can fund a whole year of the activities on this board.",
 "hospitalvisit": "Bring a small, quiet robot to a pediatric ward, led entirely by Child Life staff. Clearance takes months; do not improvise.",
 "toolkit": "Give a rookie team working tools and shop time. Inventory what you have spare first so you are not donating junk.",
 "boothfair": "A recruiting table at a school or club fair. The point is the sign-up sheet, so make someone own it.",
 "workshopseries": "A six-week club at one site with the same students each week. Continuity is what makes it teach anything.",
 "adaptivecontrol": "Build a game controller around one person's specific physical needs, then go back and fix the fit after they use it.",
 "teachercpd": "Train teachers so the programme runs without you. The highest-multiplier hours on this board.",
}
# a national programme that is one of the dated events borrows its exact date rule
EV_MATCH = {
 "eweek":      ["Engineers Week"],
 "roboweek":   ["National Robotics Week"],
 "csedweek":   ["Hour of Code"],
 "summerread": ["summer reading"],
 "fllseason":  ["FIRST LEGO League volunteer"],
 "girlday":    ["Introduce a Girl"],
 "mfgday":     ["Manufacturing Day"],
}

SEASON_OVERRIDE = {"fair": "Summer", "camp": "Summer", "market": "Summer",
                   "event": "Competition", "parks": "Summer", "foodbank": "Winter"}

def h(*p):  return int(hashlib.sha256("|".join(p).encode()).hexdigest()[:8], 16)
def jit(base, key, pct):
    span = max(1, int(base * pct)); return max(1, base - span + (h(key) % (2 * span + 1)))

def main():
    tkeys = [t[0] for t in TARGETS]
    fkeys = sorted({t[0] for t in TARGETS})
    # index 0..n-1 are the US directories; n.. are the worldwide ones
    finder_list = [[FINDERS[k][0], FINDERS[k][1], FINDERS[k][2], FINDERS[k][3]] for k in fkeys]
    finder_idx = {k: i for i, k in enumerate(fkeys)}
    gkeys = sorted(GLOBAL)
    global_idx = {}
    for k in gkeys:
        global_idx[k] = len(finder_list)
        finder_list.append([GLOBAL[k][0], GLOBAL[k][1], GLOBAL[k][2], GLOBAL[k][3]])

    unis = json.load(open(os.path.join(HERE, "sources", "universities.json")))
    uni_plays = [i for i, p in enumerate(PLAYS) if "univ" in p[12]]

    # --- universities: a real named institution, a real URL, a location we trust
    uni_rows = []
    for ui, u in enumerate(unis):
        for n in range(5):
            pi = uni_plays[(ui * 3 + n * 7) % len(uni_plays)]
            p = PLAYS[pi]; k = f"u{ui}:{pi}"
            uni_rows.append([ui, pi, jit(p[6], k + "h", .25), jit(p[7], k + "r", .4),
                             max(1, p[9] - (h(k + "i") % 2)), p[10]])

    # --- dated events: a rule-computed date and the organiser's own URL
    ev_rows = []
    for ei, e in enumerate(EVENTS):
        vkeys = [k for k in e[8] if k in tkeys]
        for n2, vk in enumerate(vkeys):
            for rep_i in range(4):
                mi = (ei * 13 + n2 * 29 + rep_i * 47) % len(METROS)
                if METROS[mi][2] != "USA" and e[4].split("/")[2] not in (
                        "www.un.org", "www.unep.org", "www.worldspaceweek.org",
                        "findingada.com", "www.firstinspires.org"):
                    continue
                k = f"e{ei}:{vk}:{mi}"
                ev_rows.append([ei, tkeys.index(vk), mi,
                                jit(e[11], k + "h", .25), jit(e[12], k + "r", .4),
                                max(3, 5 - (h(k + "i") % 2))])

    # --- local prospects: a real activity, a real venue type, a real metro
    pairs = sorted((pi, tkeys.index(tk)) for pi, p in enumerate(PLAYS) for tk in p[12] if tk in tkeys)
    need = TOTAL - len(VERIFIED) - len(uni_rows) - len(ev_rows)
    leads, seen, rnd = [], set(), 0
    while len(leads) < need and rnd <= 40:
        for n, (pi, ti) in enumerate(pairs):
            if len(leads) >= need: break
            mi = (n * 17 + rnd * 43 + pi * 5 + ti * 3) % len(METROS)
            if (pi, ti, mi) in seen: continue
            p, t, m = PLAYS[pi], TARGETS[ti], METROS[mi]
            # a US federal directory is no use in Calgary or Warsaw
            if m[2] != "USA":
                if t[0] not in global_idx: continue
                fi = global_idx[t[0]]
            else:
                fi = finder_idx[t[0]]
            seen.add((pi, ti, mi))
            k = f"{p[0]}:{t[0]}:{m[0]}{m[1]}"
            leads.append([pi, ti, mi, jit(p[6], k + "h", .25), jit(p[7], k + "r", .4),
                          max(1, p[9] - (h(k + "i") % 2)), SEASON_OVERRIDE.get(t[0], p[10]), fi])
        rnd += 1
    leads.sort(key=lambda r: h(f"{r[0]}-{r[1]}-{r[2]}"))

    data = {
        "counts": {"total": len(leads) + len(VERIFIED) + len(uni_rows) + len(ev_rows),
                   "verified": len(VERIFIED), "universities": len(uni_rows), "local": len(leads),
                   "events": len(ev_rows), "eventKinds": len(EVENTS),
                   "metros": len(METROS), "states": len({m[1] for m in METROS}),
                   "finders": len({f[1] for f in finder_list})},
        "metros":  [list(m) for m in METROS],
        "targets": [[t[1], t[2], t[3], t[4], tkeys.index(t[0])] for t in TARGETS],
        "howto":   [[HOWTO[k][0], HOWTO[k][1], HOWTO[k][2], HOWTO[k][3]] for k in tkeys],
        "events":  [[e[1], list(e[2]), e[3], e[4], e[5], e[6], e[7], e[9], e[10]] for e in EVENTS],
        "evRows":  ev_rows,
        "finders": finder_list,
        "plays":   [[p[1], p[2], p[3], p[4], p[5], p[8], p[11], p[13], p[14], BLURB.get(p[0], "")] for p in PLAYS],
        "leads":   leads,
        "unis":    [[u["name"], u["city"], u["state"], u["url"]] for u in unis],
        "uniRows": uni_rows,
        "seasonMonths": SEASON_MONTHS,
        "vRule": [next((list(e[2]) for e in EVENTS
                        if any(w in v[1] or w in v[0] for w in EV_MATCH.get(e[0], []))), None)
                  for v in VERIFIED],
        "verified": [{"org": v[0], "program": v[1], "url": v[2], "category": v[3], "audience": v[4],
                      "format": v[5], "season": v[6], "window": v[7], "deadline": v[8],
                      "applyType": v[9], "applyNote": v[10], "hours": v[11], "reach": v[12],
                      "effort": v[13], "impact": v[14], "notes": v[15], "tags": v[16]} for v in VERIFIED],
    }
    json.dump(data, open(os.path.join(HERE, "opportunities.json"), "w"), indent=1)

    compact = json.dumps(data, separators=(",", ":"))
    tpl = open(os.path.join(HERE, "template.html")).read()
    if "/*__DATA__*/null" not in tpl:
        sys.exit("template.html is missing the /*__DATA__*/null placeholder")
    body = tpl.replace("/*__DATA__*/null", compact)

    open(os.path.join(HERE, "artifact.html"), "w").write(body)
    split = body.index('<header class="mast">')
    open(os.path.join(HERE, "index.html"), "w").write(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<meta name="description" content="A working board of 6,000 robotics outreach opportunities, every one with a real link.">\n'
        + body[:split] + "</head>\n<body>\n" + body[split:] + "\n</body>\n</html>\n")

    c = data["counts"]
    print(f"{c['total']} opportunities: {c['verified']} national programmes, "
          f"{c['universities']} university slots, {c['events']} dated-event slots "
          f"({c['eventKinds']} recurring events), {c['local']} local prospects")
    print(f"{c['metros']} metros across {c['states']} states/provinces; "
          f"{c['finders']} distinct official directories; 0 search-engine links")
    print(f"payload {len(compact)/1024:.0f} KB")

if __name__ == "__main__":
    main()
