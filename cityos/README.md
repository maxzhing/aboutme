# CITYOS — 3D Living City Simulator

A browser-based city simulator: a procedurally generated metropolis you can fly
through, build in, and manage, with a simulation underneath that actually drives
what you see.

## Running it

It is a static site with no build step. Serve the folder over HTTP:

```bash
cd cityos
python3 -m http.server 8000
# then open http://localhost:8000
```

(It must be served over HTTP rather than opened as a file — it uses ES modules.)
Three.js is vendored in `vendor/`, so there are no network dependencies.

## Controls

| Action | Input |
| --- | --- |
| Pan | Left-drag, or `W` `A` `S` `D` |
| Orbit | Right-drag, or `Q` / `E` |
| Zoom | Mouse wheel (toward the cursor), or `R` / `F` |
| Camera presets | `Tab` cycles city → district → building → street |
| Speed | `1`–`5`, `Space` to pause |
| Map layers | `L` |
| Cancel the current tool | `Esc` |
| Brush size | `[` and `]` |

Click anything — a building, a road, a pedestrian, a vehicle, a district — to
inspect it.

## What is actually simulated

- **Road network.** Every road cell is a node in a routing graph with a capacity,
  a free-flow speed and signal delay. Travel time uses a BPR volume-delay curve;
  junction delay grows with the cube of saturation.
- **Traffic.** A gravity demand model over 64 zones is assigned onto the network
  with iterative equilibrium (method of successive averages), including a logit
  car/transit mode split. The vehicles you see driving are a visual sample of
  that assignment, routed with A* over the same costs and stopping at the same
  signals.
- **Citizens.** A persistent sample of residents with homes, workplaces, incomes,
  educations and daily schedules. Their commute times come from the network, and
  their satisfaction from the fields around their home.
- **Economy.** Demand (how much households and firms want to be here) is tracked
  separately from developer incentive (whether building is profitable), so a
  scarce, expensive city can repel residents while attracting builders.
  Construction, redevelopment, abandonment, jobs and the municipal budget all
  follow from those two numbers.
- **Fields.** Pollution, noise, crime, green cover and service coverage are real
  128×128 scalar fields updated by diffusion from sources, and they feed back
  into land value, rents and approval.
- **Utilities.** Electricity, water and waste have capacity and time-of-day
  demand. Over-subscribe them and buildings are load-shed — losing output,
  approval and their lights at night.
- **Events.** Accidents close roads, fires need fire coverage, outages follow
  from an overloaded grid, downturns shift demand. Each has a mechanical
  consequence somewhere else in the model.

## The what-if simulator

Forks the entire simulation twice, applies your change to one copy, and
fast-forwards both by the same horizon. The difference between the two is the
effect of the decision with the passage of time cancelled out.

## Layout

```
js/core/     constants, RNG, heap
js/world/    procedural generation, road network and routing
js/sim/      traffic, transit, citizens, economy, fields, events, orchestrator
js/render/   surface, buildings, props, agents, environment, overlays, camera
js/ui/       HUD, tools, panels, inspector, advisors, what-if, save
```

The simulation contains no renderer types, which is what makes forking it for
what-if scenarios and serialising it for saves possible.
