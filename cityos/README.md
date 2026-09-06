# CITYOS

A 3D city-building game that runs in the browser.

**Just open `cityos.html`.** One file, no server, no install, no internet.

You are the mayor of a city that already exists, with problems it already has.
The game hands you one at a time.

## The loop

The panel on the right always names the single worst thing about your city,
measured from live simulation state — never a script. It tells you **why** it is
happening, **who** it is hurting (by name — one of them is a real resident you
can follow through their day), and **what you can do about it**. Every option is
a button that puts you straight into the tool, panel or simulation that does it.

Fix it and the city tells you what changed, and what changed for that person:
*power at home — being shed → connected.* Then it finds the next problem.

Grow and the city changes what it is: **Town → Growing City → Metropolis →
Global City → Megacity**. Subways, universities, commuter rail and stadiums
stay locked and visible until the population that justifies them arrives.

## Controls

| | |
| --- | --- |
| Pan | left-drag, or `W` `A` `S` `D` |
| Orbit | right-drag, or `Q` / `E` |
| Zoom | wheel |
| Camera presets | `Tab` — city → district → building → street |
| Speed | `1`–`5`, `Space` to pause |
| Map layers | `L` |
| Rotate a building before placing | `R` |
| Cancel a tool, or stop following | `Esc` |

Click anything — a building, a road, a pedestrian, a car, a district — to inspect it.

## What's under it

The city isn't scenery. Traffic is assigned onto the real road network with
congestion and signal delay, so the cars you watch are driving the routes the
model computed. Residents have homes, jobs and daily schedules. Rents follow
supply and demand, developers build when it's profitable, and pollution, crime
and service coverage all feed back into land value and approval.

The **What-If** panel forks the whole city twice, applies your change to one
copy, and fast-forwards both — so the difference you see is your decision, not
the passage of time. When you like the answer, **Build it**: the same mutation
that ran on the fork is applied to the real city, so what you were shown is what
you get.

## Editing the source

`cityos.html` is generated. The source is the `js/` folder:

```
js/core/     constants, RNG
js/world/    map generation, road network, routing
js/sim/      traffic, transit, citizens, economy, events
js/render/   buildings, streets, vehicles, sky, overlays
js/ui/       HUD, tools, panels, advisors, what-if
```

To work on it, serve the folder (`python3 -m http.server 8000`) and open
`index.html`. To rebuild the single file: `npm i && npm run build`.

`npm test` drives the built file in a real browser and checks that each system
changes the thing it claims to — that a placed fire station actually projects
coverage, that closing a road actually re-routes its traffic, that the what-if
result can actually be built. Not that the buttons exist. It needs a Chromium
(`npx playwright install chromium`, or point `PW_CHROME` at one you already
have) and renders in software, so it takes a few minutes.
