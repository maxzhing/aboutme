# CITYOS

A 3D city simulator that runs in the browser.

**Just open `cityos.html`.** One file, no server, no install, no internet.

## Controls

| | |
| --- | --- |
| Pan | left-drag, or `W` `A` `S` `D` |
| Orbit | right-drag, or `Q` / `E` |
| Zoom | wheel |
| Camera presets | `Tab` — city → district → building → street |
| Speed | `1`–`5`, `Space` to pause |
| Map layers | `L` |
| Cancel a tool | `Esc` |

Click anything — a building, a road, a pedestrian, a car, a district — to inspect it.

## What's under it

The city isn't scenery. Traffic is assigned onto the real road network with
congestion and signal delay, so the cars you watch are driving the routes the
model computed. Residents have homes, jobs and daily schedules. Rents follow
supply and demand, developers build when it's profitable, and pollution, crime
and service coverage all feed back into land value and approval.

The **What-If** panel forks the whole city twice, applies your change to one
copy, and fast-forwards both — so the difference you see is your decision, not
the passage of time.

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
`index.html`. To rebuild the single file: `npm i esbuild && node build.mjs`.
