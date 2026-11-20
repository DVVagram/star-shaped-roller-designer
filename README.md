# Parametric Wheel Works

Four parametric designers for **3D-printable wheels and rotors**, in one static
site:

| Designer     | What it makes                                                        |
| ------------ | -------------------------------------------------------------------- |
| **Star roller** | Star-spiked drive wheels; the spike count auto-fits the dimensions |
| **Sprocket**    | Roller-chain sprockets with seats cut to the chain's pitch circle  |
| **Impeller**    | Axial fan rotors: swept, leaned blades on a bored hub              |
| **Propeller**   | Pitched props whose blade angle is derived from the advance per rev |

Every designer renders a live three.js preview of the same indexed mesh it
measures, reports the closed-shell volume, and exports a binary STL in
millimetres. Invalid or non-manifold configurations block the download instead
of producing a broken file.

Everything runs in the browser: no CAD kernel, no server, no account, no uploads.

---

## The designers

### Star roller

Wheel diameter, thickness, spike count, four spike shapes, spike depth, tip and
valley widths, a tip taper, the centre hole (round, hex or double-flat) and an
optional hub boss. Auto-fit returns the largest count whose tip lands, valley
lands and flanks still fit at the current diameter and depth, and says what
stopped one more point.

### Sprocket

Chain presets (#25, #35, #40, #50) set the pitch and roller diameter, or enter
them by hand. Tooth count, tooth height above the pitch circle, tip land, seat
clearance, three tooth profiles, thickness, bore and an optional hub. The pitch
circle is `p / sin(π / N)`; each seat is the part of the roller circle that faces
the axis, so the seat floor is the root radius and the flanks leave it
tangentially.

### Impeller

An axial rotor: tip and hub diameter, blade count, chord at the root and at the
tip, a tip rounding radius, axial height, blade angle and sweep. The passages
between blades are measured at 25 radii and reported, and a blade that would lean
into its neighbour is rejected before export.

### Propeller

The same rotor core with pitch as the input: the blade angle at 70 % radius is
`atan(pitch / 2πr)`, so the advance per revolution stays put when the diameter
changes. Blade count, root and tip chord, tip rounding, blade drop, sweep and the
shaft bore.

---

## Shared geometry

All internal lengths are millimetres. Every solid is built by one extruder:
a stack of corresponding outlines from the bottom face to the top, a through-hole,
and an optional hub boss.

- Both faces are triangulated with the same earcut implementation three.js uses
  (`ShapeUtils.triangulateShape`), so cap boundaries are exactly the profile
  vertices.
- Every wall is an explicit strip of quads joining **matching** vertices, because
  the two outlines always share their vertex order. When the top outline is
  rotated or sheared relative to the bottom one, that wall is a twisted ruled
  surface and the shell stays closed.
- `emitCap` fixes each cap triangle's winding from its 2D orientation, so caps and
  walls always agree.

`inspectMesh()` then verifies the result: every directed edge must cancel against
its reverse, there must be a single connected shell, no repeated or zero-area
faces, and the Euler characteristic must be 0 (one solid, one through-hole). Only
then is a volume reported or an STL offered. The volume is the
divergence-theorem volume of that closed mesh.

### Why the shapes fit

- **Star**: one spike owns `2π / N`, split between tip land, valley land and a
  flank; auto-fit takes the largest count where all three still fit.
- **Sprocket**: the seat half-angle is `asin((roller/2 + clearance) / Rp)`, so a
  larger roller or finer pitch consumes the flank until the teeth collide.
- **Rotor**: the passage between blades is `pitch · r − chord(r)`; lean is limited
  to `0.55 · pitch · R` so a blade top cannot reach its neighbour.

---

## Stack

| Area     | Choice                                                   |
| -------- | -------------------------------------------------------- |
| App      | Vite, React 19, TypeScript, Tailwind CSS 4               |
| 3D       | three.js + OrbitControls                                 |
| Geometry | In-repo profiles + one deterministic indexed-mesh extruder |
| Export   | Binary STL writer (no dependency)                        |
| Tests    | Vitest — 38 geometry, solid and STL tests                |

No database, no API keys and no environment variables.

---

## Local development

```bash
npm install
npm run dev
```

```bash
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # Vitest
```

`npm run build` emits a static site in `dist/`. Routes are hash-based
(`#/`, `#/sprocket`, `#/impeller`, `#/propeller`), so any static host works with no
rewrite rules.

---

## Project structure

```
src/
  App.tsx                    suite shell: header, hash router, page copy, footer
  components/
    DesignerPage.tsx         hero + builder slot + explainer shared by every page
    DesignScaffold.tsx       two-column builder: inputs, measurements, preview, export
    MeshPreview.tsx          three.js canvas (WebGL fallback, reset view)
    SprocketBuilder.tsx      sprocket form, validation, readout, STL
    FanBuilder.tsx           impeller form…
    PropellerBuilder.tsx     propeller form…
    fields.tsx               number field, segmented control, option cards, presets, toggle
    useUnitValues.ts         form state with mm/in conversion
  lib/
    kit/units.ts             units, formatting, outlines, validation helpers
    kit/solid.ts             extruder, mesh inspector, binary STL writer
    sprocket.ts              spec, roller-seat profile, mesh, validation, form helpers
    rotor.ts                 shared blade-rotor core (impeller and propeller)
    fan.ts / propeller.ts    form field sets and spec builders
    star/                    the original star roller engine
```

---

## Limits

- **Star roller** is prismatic apart from the tip taper: no helix or knurling.
- **Sprocket** seats are true circular roller cuts with straight or eased flanks;
  the ANSI tooth-flank radii are not modelled, so treat tooth strength as
  indicative.
- **Impeller and propeller** blades are constant-chord bands leaned by a linear
  shear: no airfoil camber, no radial pitch distribution beyond that shear, and no
  twist beyond the root-to-tip lean. The tip rounding is a true round in plan,
  capped by the tip chord; it is not a ball-end in three dimensions.
- Hubs are plain bosses; there are no spoke cut-outs, bolt circles or keyways.
- Printability checks describe geometry only. Layer adhesion, wall count and
  material still decide whether a print survives.
