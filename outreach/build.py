#!/usr/bin/env python3
"""Compose the outreach board's dataset and inline it into index.html.

Run:  python3 build.py
Out:  opportunities.json  (readable dataset)
      index.html          (single-file app with the dataset inlined)
"""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vocab import METROS, TARGETS, PLAYS, SEASON_MONTHS          # noqa: E402
from verified import VERIFIED                                     # noqa: E402

TOTAL = 1000

# One-line description of what each play actually involves.
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
 "teachercpd": "Train teachers so the program runs without you. The highest-multiplier hours on this board.",
}

# What to type into a search engine to find the real local contact.
SEARCH = {
 "library": '"public library" youth services programming', "elem": '"elementary school" district STEM coordinator',
 "middle": '"middle school" science department', "highschool": '"high school" CTE coordinator',
 "museum": 'science center OR "children\'s museum" education programs', "bgc": '"Boys and Girls Club" program director',
 "ymca": 'YMCA youth development director', "gs": '"Girl Scouts" council program department',
 "scouts": 'Scouting America council OR "scout troop"', "fourh": '4-H county extension youth development agent',
 "hospital": '"children\'s hospital" child life services', "senior": '"senior center" activities director',
 "parks": '"parks and recreation" recreation programs', "cc": '"community college" STEM outreach',
 "univ": 'university "K-12 outreach" engineering', "maker": 'makerspace OR hackerspace',
 "fair": '"county fair" OR "state fair" exhibitor information', "market": '"farmers market" manager',
 "city": 'city council OR mayor office community', "chamber": '"chamber of commerce" events',
 "rotary": 'Rotary OR Kiwanis OR Lions club program chair', "manuf": 'manufacturer OR "machine shop" community relations',
 "tech": 'technology company community outreach STEM', "faith": 'church OR synagogue OR mosque youth group',
 "refugee": 'refugee resettlement OR ESL youth program', "sped": '"special education" director of special services',
 "dhh": '"school for the deaf" OR "school for the blind" outreach', "title1": '"Title I" school district federal programs',
 "homeschool": 'homeschool co-op enrichment', "afterschool": '"21st Century Community Learning Centers" site',
 "media": 'local news station OR public radio community', "foodbank": 'food bank volunteer coordinator',
 "shelter": 'animal shelter volunteer', "habitat": '"Habitat for Humanity" volunteer',
 "tribal": 'tribal youth program OR Native American education', "military": 'military base school liaison officer',
 "juvenile": 'juvenile justice education program', "housing": 'public housing resident services',
 "rural": 'rural school district superintendent', "bilingual": 'dual language OR bilingual school district',
 "fll": '"FIRST LEGO League" OR "FIRST Tech Challenge" team', "event": '"FIRST" regional event volunteer',
 "camp": 'summer camp director youth', "shelterfam": 'family shelter OR transitional housing services',
}

# Target types that pull an activity into a different part of the calendar.
SEASON_OVERRIDE = {"fair": "Summer", "camp": "Summer", "market": "Summer",
                   "event": "Competition", "parks": "Summer", "foodbank": "Winter"}

def h(*parts):
    return int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:8], 16)

def jitter(base, key, pct):
    """Stable pseudo-variation so two cities do not report identical estimates."""
    span = max(1, int(base * pct))
    return max(1, base - span + (h(key) % (2 * span + 1)))

def main():
    target_by_key = {t[0]: t for t in TARGETS}
    tkeys = [t[0] for t in TARGETS]
    play_keys = [p[0] for p in PLAYS]

    # every sensible (play, target) pairing
    pairs = [(pi, tkeys.index(tk)) for pi, p in enumerate(PLAYS) for tk in p[12] if tk in target_by_key]
    pairs.sort()

    need = TOTAL - len(VERIFIED)
    leads, seen = [], set()
    rnd = 0
    while len(leads) < need:
        for n, (pi, ti) in enumerate(pairs):
            if len(leads) >= need:
                break
            mi = (n * 17 + rnd * 43 + pi * 5 + ti * 3) % len(METROS)
            if (pi, ti, mi) in seen:
                continue
            seen.add((pi, ti, mi))
            p, t, m = PLAYS[pi], TARGETS[ti], METROS[mi]
            k = f"{p[0]}:{t[0]}:{m[0]}"
            season = SEASON_OVERRIDE.get(t[0], p[10])
            leads.append([
                pi, ti, mi,
                jitter(p[6], k + "h", 0.25),                 # hours
                jitter(p[7], k + "r", 0.40),                 # people reached
                max(1, p[9] - (h(k + "i") % 2)),             # impact 1-5
                season,
            ])
        rnd += 1
        if rnd > 12:
            break

    # deterministic shuffle so the first screen is not 40 library rows
    leads.sort(key=lambda r: h(f"{r[0]}-{r[1]}-{r[2]}"))

    data = {
        "generated": "composed from real place, institution and activity vocabularies",
        "counts": {"total": len(leads) + len(VERIFIED), "verified": len(VERIFIED), "leads": len(leads)},
        "metros":  [list(m) for m in METROS],
        "targets": [[t[1], t[2], t[3], t[4], SEARCH.get(t[0], t[1])] for t in TARGETS],
        "plays":   [[p[1], p[2], p[3], p[4], p[5], p[8], p[11], p[13], p[14], BLURB.get(p[0], "")] for p in PLAYS],
        "leads":   leads,
        "seasonMonths": SEASON_MONTHS,
        "verified": [{
            "org": v[0], "program": v[1], "url": v[2], "category": v[3], "audience": v[4],
            "format": v[5], "season": v[6], "window": v[7], "deadline": v[8],
            "applyType": v[9], "applyNote": v[10], "hours": v[11], "reach": v[12],
            "effort": v[13], "impact": v[14], "notes": v[15], "tags": v[16],
        } for v in VERIFIED],
    }

    with open(os.path.join(HERE, "opportunities.json"), "w") as f:
        json.dump(data, f, indent=1)

    compact = json.dumps(data, separators=(",", ":"))
    tpl = open(os.path.join(HERE, "template.html")).read()
    if "/*__DATA__*/null" not in tpl:
        sys.exit("template.html is missing the /*__DATA__*/null placeholder")
    body = tpl.replace("/*__DATA__*/null", compact)

    # artifact.html is the fragment claude.ai wraps in its own document skeleton.
    open(os.path.join(HERE, "artifact.html"), "w").write(body)

    # index.html is a standalone document for GitHub Pages or a local browser.
    split = body.index("<header class=\"mast\">")
    open(os.path.join(HERE, "index.html"), "w").write(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<meta name="description" content="A working board of 1,000 robotics outreach opportunities.">\n'
        + body[:split]
        + "</head>\n<body>\n" + body[split:] + "\n</body>\n</html>\n")

    print(f"{data['counts']['total']} opportunities "
          f"({data['counts']['verified']} verified, {data['counts']['leads']} leads)")
    print(f"payload {len(compact)/1024:.0f} KB")

if __name__ == "__main__":
    main()
