<div align="center">

# Solar System Explorer

**An interactive 3D solar system visualization that runs entirely in the browser —
no build step, no backend, and 100% offline.**

[![Live demo](https://img.shields.io/badge/demo-GitHub%20Pages-181717?logo=githubpages&logoColor=white)](https://mifada2543.github.io/SolarSystem/)
[![License GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![three.js 0.186.1](https://img.shields.io/badge/three.js-0.186.1-049ef4.svg)](https://threejs.org/)
[![WebGPU](https://img.shields.io/badge/renderer-WebGPU%20%7C%20WebGL2%20fallback-333333.svg)](#technology)
[![100% offline](https://img.shields.io/badge/offline-100%25-2ea44f.svg)](#getting-started)
[![Textures CC BY 4.0](https://img.shields.io/badge/textures-CC%20BY%204.0-orange.svg)](assets/textures/ATTRIBUTION.txt)
[![UI language](https://img.shields.io/badge/UI-Indonesian-0969da.svg)](README.md)

English · **[Bahasa Indonesia](README.md)**

</div>

---

## Live demo

Deployed on GitHub Pages — just open it, nothing to install:

**👉 [mifada2543.github.io/SolarSystem](https://mifada2543.github.io/SolarSystem/)**

![Desktop view](docs/tampilan-desktop.png)

---

## Overview

Solar System Explorer renders the entire solar system in a single HTML page. Planet
positions are computed from **JPL orbital elements (J2000 epoch)** rather than decorative
circles, so what you see genuinely tracks the simulation date you pick.

Three things set it apart:

- **Fully offline** — three.js, 19 2K textures, CSS, and every module ship inside the
  project folder. Zero outbound requests, so it keeps working without an internet
  connection.
- **Modern renderer** — `WebGPURenderer` with automatic fallback to WebGL2 when WebGPU
  is unavailable, using TSL (Three Shading Language) for custom shaders.
- **No build step** — plain ES modules + `importmap`. No `npm install`, no bundler,
  no configuration.

---

## Table of contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Getting started](#getting-started)
- [Controls](#controls)
- [Visualization scales](#visualization-scales)
- [Architecture](#architecture)
- [Technology](#technology)
- [Data & attribution](#data--attribution)
- [Development notes](#development-notes)
- [License](#license)

---

## Features

### Simulation

- **Keplerian orbits** — positions derive from JPL orbital elements (J2000 epoch), not
  decorative circles.
- **Sun rotation** — driven by the 607.1 h (25.3 day) data value with the 7.25° axial
  tilt. Previously a hardcoded `0.004 rad/day` constant (one rotation ≈ 4.3 years) left
  the Sun effectively motionless.
- **Barycenter** — the Sun is no longer pinned to the world origin (0,0,0): it revolves
  around the system's center of mass (amplitude ±0.5–1.5 solar radii, dominated by
  Jupiter's 11.86-year period), and `sunLight` moves with it so the lighting direction
  stays correct. The `Barycenter` button (Options panel) shows the center-of-mass
  marker together with its connector line to the Sun.
- **Adjustable speed** from `0.1×` to `100×`, with time units per second (minutes →
  years) and a simulation date picker, including `±1 day` / `±1 month` / `±1 year`
  jumps, `J2000` and `Today` buttons, and a custom date input.
- **Instant unit toggle** between metric and imperial (`km · °C` ↔ `mi · °F`).

### Visualization

- **Three scales** — `Explorer` (distances and sizes both compressed), `Relative`, and
  `Scientific (≈1:1)` where 1 world unit = 10⁶ km.
- **2K planet textures** stored locally with **automatic procedural fallback** — if a
  file fails to load, the view stays intact with no error message.
- **Constellations**, an asteroid belt with pixel-based point sizing, elliptical orbits
  for 7 moons (Moon, Io, Europa, Ganymede, Callisto, Titan, Triton — shaped by each
  body's own eccentricity) that appear automatically once their host is close enough,
  Earth's night city lights, atmospheres, and Saturn's ring shadows.
- **Kuiper belt** beyond Neptune's orbit — about 2,600 particles in two populations:
  a "cold" classical one (42–47 AU, thin band) and a "hot" one (30–50 AU, thicker and
  more inclined). Always visible with no dedicated toggle, and also drawn as a faint
  band on the navigation map. Its randomness uses its own fixed-seed PRNG, so it
  **does not shift** the shared `rnd()` seed — the asteroid belt, star colors, and
  existing textures stay identical.
- **22 constellations** — Orion, Scorpius, Ursa Major, … drawn along the official
  **Sky & Telescope 2014** figures (the same ones Stellarium uses), plus a **star point**
  at every vertex sized by magnitude (≈1.7–6.8 px). Labels are in Indonesian and
  automatically **never overlap**: constellations with brighter stars win priority, the
  rest wait until there is room on screen.

### Navigation

- **3D navigation map** in the top-right corner — a separate scene clipped to a *scissor
  viewport* on the same renderer. The map stays centred on the Sun while its heading
  follows the main camera. Two layouts can be compared via the `Compressed` ↔
  `Linear 1:1` button, and the map **grows on hover** (172 → 236 px; 148 → 200 px on
  narrow screens).

  Click a planet to fly there, click empty space to explore — the viewing direction is
  preserved.

  ![Map growing on hover](docs/peta-hover.png)

- **Bilingual search** — `earth` finds `Bumi`, `sun` finds `Matahari`.
- **Zoom auto-focuses** the planet under the cursor.

### Interface

- **HUD card** in the bottom-right corner: simulation status, date, `FOCUSED ON`,
  `DISTANCE` (camera → focused object), `SPEED` (always shown, including `0 km/s`),
  camera, scale, renderer.
- **Per-object info panel** with physical data, orbit, atmosphere, and a short
  description, plus an `Explore {name}` button to orbit up close and `Close` to return
  to the previous camera position.
- **Responsive** from wide displays down to 400 px phones, with
  *prefers-reduced-motion* support.
- **No emoji** — the whole interface uses plain words and typographic symbols.

> The interface itself is in Indonesian. Object names follow the official Indonesian
> spellings (`Bumi`, `Merkurius`, `Saturnus`), and search accepts both languages.

---

## Screenshots

| Desktop | Mobile |
|---|---|
| ![Desktop view](docs/tampilan-desktop.png) | ![Mobile view](docs/tampilan-ponsel.png) |

---

## Getting started

### 1. GitHub Pages (easiest)

Open **[mifada2543.github.io/SolarSystem](https://mifada2543.github.io/SolarSystem/)** —
nothing to download.

### 2. XAMPP

Drop the project folder into `htdocs`, then open:

```
http://localhost/SolarSystem/
```

### 3. Any static server

```bash
python3 -m http.server 8000
# → http://localhost:8000/
```

### Important note

ES modules cannot be loaded over `file://` (blocked by CORS policy), so the page must be
served over HTTP. Opening `index.html` directly from disk still works — the page itself
explains what to do.

**Requirements:** a modern browser with ES module support — latest Chrome / Edge /
Firefox / Safari. Every file is served locally: three.js in `assets/lib/`, textures in
`assets/textures/`, modules in `assets/js/` — zero outbound requests, so the app is
**100% offline** as long as this folder is available. (Credit links in the panel only
open when clicked.)

---

## Controls

### Mouse & keyboard

| Action | How |
|---|---|
| Orbit the camera | drag with the cursor |
| Zoom | scroll wheel — while **auto-focusing** the planet under the cursor |
| Focus an object + info panel | click a planet / moon, or pick from search results |
| Explore up close | in the info panel, click `Jelajahi {nama}` |
| Reframe the selected object | the `Fokus ke Objek` button |
| Fly via the map | click a planet on the map, or click empty space |
| Search | `/` or the search box at the top |

### Keyboard shortcuts

| Key | Function |
|---|---|
| `Space` | pause / resume |
| `1`–`8` | the 8 planets |
| `9` | the Moon |
| `0` | the Sun |
| `Esc` | close the info panel; if already closed, return to the overview |
| `/` | focus the search box |

---

## Visualization scales

Planet sizes and orbital distances are **not** drawn to reality — if they were, Earth
would be a speck and Neptune would never be visible. Three modes are available:

| Mode | Planet size | Orbital distance |
|---|---|---|
| 0 · Explorer | `(d/12756)^0.42` | `14·√(d/149.6)` |
| 1 · Relative | `0.4·√(d/12756)` | `d/149.6·10` |
| 2 · Scientific (≈1:1) | `d/2·10⁶` (1 unit = 10⁶ km) | `d` (linear) |

A matching note appears on the HUD card: *SKALA VISUALISASI · … · simulasi kira-kira*
("visualization scale · … · approximate simulation").

---

## Architecture

No bundler — `index.html` loads `assets/js/main.js` as an ES module, with an `importmap`
pointing at the local three.js build.

```
SolarSystem/
├── index.html             markup + importmap + protocol check (file:// → explanation)
├── README.md              this page (Bahasa Indonesia)
├── README.en.md           this page (English)
├── LICENSE                GPL-3.0
├── assets/
│   ├── css/style.css      all CSS, including the map and ≤860px media queries
│   ├── js/                11 ES modules (see table below)
│   ├── lib/               three.js 0.186.1 local — core, webgpu, tsl, OrbitControls
│   ├── textures/          19 2K files (jpg/png) + ATTRIBUTION.txt (CC BY 4.0)
│   └── logo.svg           logo & favicon
└── docs/                  screenshots for the README
```

### JavaScript modules

| File | Role |
|---|---|
| `state.js` | base state + utils — **no local imports** |
| `data.js` | planet data (NASA/JPL) + coordinates for 22 constellations (HYG · Sky & Telescope) — **no local imports** |
| `core.js` | procedural textures (`rnd` / `lcg` / `mk` / `blob` / `texFor` / `glowTex`) |
| `shaders.js` | TSL: atmosphere, city lights, Saturn ring shadows |
| `textures.js` | 2K texture loader (fail-safe → procedural) |
| `bodies.js` | renderer, scene, camera, object construction |
| `orbits.js` | Kepler, scale modes, asteroid & Kuiper belts, constellations, simulation |
| `navigate.js` | camera, picking, hover, scroll-zoom, HUD card |
| `ui.js` | info panel, controls, search, HUD, audio |
| `minimap.js` | 3D navigation map (scissor viewport) |
| `main.js` | `init()` + `loop()` + constellation label filter (overlap handling) |

Imports always point downward toward `state.js` / `data.js`; neither imports any local
module, so circular imports are impossible.

---

## Technology

| Component | Choice |
|---|---|
| Renderer | `WebGPURenderer`, automatic WebGL2 fallback |
| Shaders | TSL (`colorNode` / `opacityNode` / `emissiveNode`) |
| Modules | ES modules + `importmap`, no bundler |
| Library | three.js **0.186.1** (local, no CDN) |
| Backend | none — purely static |
| Data | NASA Planetary Fact Sheet + JPL (J2000 epoch) |

**Updating three.js:** download `build/three.core.js`, `build/three.webgpu.min.js`,
`build/three.tsl.min.js`, and `examples/jsm/controls/OrbitControls.js` from
`https://cdn.jsdelivr.net/npm/three@<version>/`, copy them into `assets/lib/`, then
update the importmap in `index.html`. The file list is also written as a comment there.

---

## Data & attribution

- **Planet physics** — [NASA Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
- **Orbital elements** — JPL [*Approximate Positions of the Planets*](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
  (Standish), J2000 epoch — **including eccentricity** for the eight planets (full JPL
  precision rather than the NASA Fact Sheet rounding; the largest previous gaps were
  Neptune 16.4% and Saturn 3.5%)
- **Trajectory status per body class** (accuracy of the drawn shapes):

  | Body | Trajectory drawn |
  |---|---|
  | 8 planets + 9 dwarf planets | full Kepler ellipse: focus at the Sun, JPL e/i/Ω/ϖ, true phase from J2000 `L0` |
  | Moon + 6 satellites | ellipse from the data `e` (simplified phase M₀ = 0 at J2000; inclination not modelled) |
  | Asteroid belt | random circles + rigid disk at 4.40 yr — Kepler in 2.1–3.3 AU is actually 3.04–5.99 yr |
  | Kuiper belt | random circles + rigid disk at 272 yr — Kepler in 30–50 AU is actually 164–354 yr |
- **Dwarf planets** — [JPL Small-Body Database](https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html)
  for Ceres, Quaoar, Orcus, Salacia, and Ixion (epoch 2461200.5); Wikipedia for
  Eris, Haumea, and Makemake. All converted to the J2000 epoch; physical data and
  moons of the four KBOs (Quaoar 1, Orcus 1, Salacia 1, Ixion 0) also come from Wikipedia.
- **Moon counts** — JPL [*Planetary Satellite Discovery Circumstances*](https://ssd.jpl.nasa.gov/sats/discovery.html)
  (Jupiter 115, Saturn 293, Uranus 29, Neptune 16, Pluto 5; the NASA Fact Sheet of Mar 2025
  is already out of date and these counts keep growing)
- **Planet textures** — [Solar System Scope — Textures](https://www.solarsystemscope.com/textures/),
  **CC BY 4.0** (mostly based on NASA imagery). The file list, including the
  `.tif` → `.png` conversions, is recorded in
  [`assets/textures/ATTRIBUTION.txt`](assets/textures/ATTRIBUTION.txt); credit is also
  shown inside the app. **Do not delete these files** — attribution is a condition of the
  license.
- **Constellations** — star coordinates and magnitudes from the
  [HYG Database](https://github.com/astronexus/HYG-Database) (v41, J2000 positions, RA in
  hours); the lines follow the official **Sky & Telescope 2014** figures — the
  [`SnT_constellations.txt`](https://github.com/Stellarium/stellarium/blob/master/skycultures/modern_st/SnT_constellations.txt)
  file also bundled with Stellarium — primary figures only (weight 1–2).

---

## Development notes

These are easy to overlook and break things badly if changed casually:

- **Do not change the call order of `rnd()`** in `init()`. The seed is shared between
  planet textures, the asteroid belt, and star colors, so reordering changes the entire
  look. `assets/js/textures.js` honours this rule: `texFor()` is still called first as
  before, and the real image is swapped in asynchronously afterwards.
  **New objects must use their own PRNG**, never `rnd()`: textures go through `lcg()`
  from `core.js` (per-object seed via `texSeed` in `data.js`), while Kuiper belt
  particles use a fixed-seed `20250930` LCG in `orbits.js`. So adding the 4 KBOs and
  the belt consumes none of the shared seed, leaving the seed position at `buildBelt()`
  exactly as before — the star field was verified pixel-identical by screenshot diff.
- All lines must be `THREE.Line` — `WebGPURenderer` does not support `LineLoop`.
- Custom shaders must be TSL — `ShaderMaterial` is not registered in
  `StandardNodeLibrary`.
- The CSS rule `canvas{inset:0}` applies to every canvas including `#map`, so
  `left`/`bottom` must be reset.
- `state.js` and `data.js` must not import any local module — this is what prevents
  import cycles.
- **Constellation star points use `InstancedMesh`, not `THREE.Points`** — the WebGPU
  backend forces `gl_PointSize = 1.0`, so `Points` would always be 1 px with no magnitude
  variation. Each point's size is derived from its magnitude, converted to world units at
  radius 1100 (≈1.7–6.8 px), and recomputed whenever the window height changes. The
  constellation code **never calls `rnd()`** — proven by identical hashes for star field
  positions & colors, belt translations, and procedural textures before and after the
  change.

---

## License

| Part | License |
|---|---|
| Source code | [GPL-3.0](LICENSE) |
| Planet textures | [CC BY 4.0](assets/textures/ATTRIBUTION.txt) — Solar System Scope |
| Scientific data | NASA / JPL — public domain |

Planet textures are licensed under **CC BY 4.0**; that attribution must remain, both in
`assets/textures/ATTRIBUTION.txt` and in the in-app credit. Data comes from NASA/JPL
(public domain).
