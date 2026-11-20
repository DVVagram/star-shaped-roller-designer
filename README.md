# Star Shaped Roller Designer

A parametric configurator for **3D-printable star-spiked rollers**. Set the wheel
diameter, thickness, spike shape and depth, centre hole and hub; the point count
fits itself to the room you give it, the solid updates instantly in 3D, and the
STL you download is the exact mesh you have been looking at.

Every model is generated in the browser from one geometry engine — no CAD kernel,
no server, no account, no uploads.

---

## What it does

- **Wheel** — outer (tip-to-tip) diameter, thickness, and a tip taper that narrows
  the points towards the top face while the core stays round.
- **Spikes** — count with an automatic fit, four shapes (rounded, truncated,
  sharp, swept claw), spike depth, tip width and valley width.
- **Auto-fit points** — the largest count whose tip lands, valley lands and flanks
  still fit at the current diameter and depth. Changing the wheel refits it
  immediately; the interface says what stopped one more point from fitting.
- **Centre hole** — round, hex or double-flat (D-shaft), plus an optional hub boss
  on the top face.
- **Live 3D preview** — three.js with orbit, zoom, pan and reset, rendering the
  same indexed mesh the volume readout measures.
- **Measured readout** — tip and valley diameters, spike height, pitch angle, tip
  land, spike base arc, top tip diameter, overall height and the closed-mesh
  volume.
- **STL export** — binary STL in millimetres, centred on the origin.
- **Validation** — hard errors block export; advisory warnings inform.

---

## Stack

| Area     | Choice                                                     |
| -------- | ---------------------------------------------------------- |
| App      | Vite, React 19, TypeScript, Tailwind CSS 4                 |
| 3D       | three.js + OrbitControls                                   |
| Geometry | In-repo star profile + deterministic indexed mesh           |
| Export   | Binary STL writer (no dependency)                           |
| Tests    | Vitest — 19 geometry, solid and STL tests                   |

No database, no API keys and no environment variables.

---

## The geometry

All lengths are millimetres around the wheel's axis:

| Property       | Definition                     |
| -------------- | ------------------------------ |
| Tip diameter   | `D` — across the points        |
| Valley diameter| `d = D − 2 · spike depth`      |
| Tip radius     | `R = D / 2`                    |
| Valley radius  | `r = R − depth`                |

One spike owns a pitch of `2π / N`. Inside that pitch the profile spends an
angular slice on the **tip land** (`tip width / 2R`), another on the **valley
land** (`valley width / 2r`), and the rest climbing a **flank** from `r` to `R`
with a shape-dependent easing:

| Shape     | Flank                              | Tip        |
| --------- | ---------------------------------- | ---------- |
| Rounded   | smoothstep (zero slope at both ends)| flat land  |
| Truncated | straight                           | flat land  |
| Sharp     | straight                           | point      |
| Swept claw| `u^0.55` — fast rise, concave sides| 0.55 × land|

Because the lands are entered in millimetres, fitting is arithmetic. Auto-fit
returns the largest `N` where:

1. the flank still has angular room (`pitch/2 > tipHalf + valleyHalf`),
2. the flank is at least 0.75 mm long along its own slope,
3. the gap between neighbouring tips at the tip radius is at least 0.8 mm,
4. each spike keeps at least `max(0.45 × depth, 1.6 mm)` of base arc.

This is why deeper spikes take fewer points and a wider wheel takes more.

### Why the mesh is watertight by construction

The solid is built as one indexed triangle mesh rather than a CSG result:

- both flat faces are triangulated with earcut (`ShapeUtils.triangulateShape`),
  so cap boundaries are exactly the profile vertices;
- every wall — outer profile, centre hole, hub — is an explicit strip of quads
  joining *matching* vertices, because the flat and tapered faces are evaluated
  from the same angular schedule;
- `emitCap` fixes each cap triangle's winding from its 2D orientation, so caps
  and walls always agree.

`inspectStarSolid()` then verifies the result: every directed edge must cancel
against its reverse, there must be a single connected shell, no repeated or
zero-area faces, and the Euler characteristic must be 0 (one solid, one
through-hole). Only then is a volume reported or an STL offered. The volume is
the divergence-theorem volume of that closed mesh.

---

## Local development

```bash
npm install
npm run dev
```

Open the printed localhost URL. There is nothing to configure.

```bash
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # Vitest
```

### Deployment

`npm run build` emits a static site in `dist/` — host it anywhere (Netlify,
Vercel, Cloudflare Pages, GitHub Pages, an S3 bucket). No server code and no
environment variables are involved.

---

## Project structure

```
src/
  App.tsx                     page shell: header, hero, builder, explainer
  components/
    StarBuilder.tsx           state, validation, readout, preview panel, STL export
    SpecForm.tsx              wheel / spike / centre-hole cards
    StarPreview.tsx           three.js canvas (lazy-loaded, WebGL fallback)
    fields.tsx                number field, segmented control, option cards, toggle
  lib/star/
    geometry.ts               spec, limits, spike fit, derived sizes, validation
    profile.ts                angular schedule + closed star outline (flat & tapered)
    mesh.ts                   indexed solid, volume, watertightness inspection
    stl.ts                    binary STL writer and file naming
    builder.ts                form state, unit conversion, auto-fit wiring
```

---

## Limits

- The roller is a prismatic star: spikes are constant along the thickness apart
  from the optional tip taper. No helix, twist, knurling or fillets between
  spikes beyond the valley land.
- The hub is a plain cylindrical boss on the top face; there are no spoke
  cut-outs or bolt circles.
- Printability checks describe geometry only. Layer adhesion, wall count and
  material still decide whether a print survives.
