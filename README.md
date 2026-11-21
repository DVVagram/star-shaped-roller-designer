# Parametric Wheel Works

Ninety-six parametric designers for **3D-printable parts**, in one static site:
the original four wheels and rotors, forty-six gears, pulleys, fixings, vessels,
ducts and mechanisms, and fifty more plates, grilles, labware and household
parts.

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

## The original four

### Star roller

Wheel diameter, thickness, spike count, five spike shapes, spike depth, tip and
valley widths, a tip taper, the centre hole (round, hex or double-flat) and an
optional hub boss. Auto-fit returns the largest count whose tip lands, valley
lands and flanks still fit at the current diameter and depth, and says what
stopped one more point.

The **Rectangle** shape swaps the points for rectangular flaps: the core stays a
circle and each spike is a true rectangle in plan, with sides parallel to its
radius and a flat chord at the tip circle. Tip width is then the flap width, and
flap height is the spike depth. The valley width still sets the gap the flaps
have to leave, and the tip taper shortens the flaps instead of narrowing them.

### Sprocket

Chain presets (#25, #35, #40, #50) set the pitch and roller diameter, or enter
them by hand. Tooth count, tooth height above the pitch circle, tip land, seat
clearance, three tooth profiles, thickness, bore and an optional hub. The pitch
circle is `p / sin(π / N)`; each seat is the part of the roller circle that faces
the axis, so the seat floor is the root radius and the flanks leave it
tangentially.

### Impeller

An axial rotor: tip and hub diameter, blade count, chord at the root and at the
tip, a tip rounding radius (in plan) plus an edge rounding radius (on the top and
bottom of the tip), axial height, blade angle and sweep. The passages between
blades are measured at 25 radii and reported, and a blade that would lean into
its neighbour is rejected before export.

### Propeller

The same rotor core with pitch as the input: the blade angle at 70 % radius is
`atan(pitch / 2πr)`, so the advance per revolution stays put when the diameter
changes. Blade count, root and tip chord, tip rounding and edge rounding, blade
drop, sweep and the shaft bore.

---

## The forty-six

| Family | Designers |
| --- | --- |
| **Gears and drives** | Spur gear, internal ring gear, helical gear, rack, timing pulley, V-belt pulley, round-belt pulley, stepped pulley, flywheel |
| **Wheels and rotors** | Ratchet wheel, Geneva wheel, disc cam, eccentric wheel, saw blade, handwheel, torus, chain link |
| **Plates and fixings** | Wing nut, hex nut, washer, star knob, knurled knob, flange, mounting plate, splined hub, flanged bushing |
| **Vessels and fluid** | Funnel, vase, cup, bowl, bottle, bell, lamp shade, spool, gasket, hemisphere shell, parabolic dish, de Laval nozzle, nose cone, pipe reducer, pipe cap, hose adapter, pipe elbow |
| **Motion** | Compression spring |

`docs/DESIGNERS.md` lists the 344 candidates these were chosen from, with the
forty-six marked.

## The fifty

| Family | Designers |
| --- | --- |
| **Plates and brackets** | Square flange, oval flange, bearing plate, NEMA 17 plate, pivot bracket, slot bracket, link plate, gusset plate, switch plate, tensioner plate, keyhole plate, drill guide |
| **Fasteners and knobs** | T-slot nut, square nut, coupling nut, cross knob, pointer knob |
| **Discs and grilles** | Brake rotor, index plate, vent grille, perforated plate, precision spacer, fan grille, baffle plate, sink strainer, mounting ring |
| **Vessels and household** | Candlestick, egg cup, honey dipper, spinning top, bottle stopper, tapered plug, pet bowl, planter pot, wine glass, goblet |
| **Labware and fluid** | Test tube, centrifuge tube, Erlenmeyer flask, O-ring plug, caulking nozzle |
| **Motion and small parts** | Piston, golf tee, dowel pin, furniture foot, caster wheel |
| **Workshop** | Dovetail rail |
| **Garden and cable** | Key tag, plant label, cable tie mount |

`docs/DESIGNERS-2.md` lists the 320 candidates these fifty were chosen from.

Every new designer is a `defineDesign()` module. One field list drives the form,
the unit conversion, the millimetre parameters, the validation copy, the readout,
the preview and the STL file name, so the drawn part, the printed numbers and the
exported file cannot disagree about what was asked for.

---

## Shared geometry

All internal lengths are millimetres. Three kernels cover the new library: a
multi-hole prism extruder (stacked outlines with optional twisted rings), a solid
of revolution from a closed `(r, z)` profile, and a swept tube that carries a
circular or annular section along a helix or a bend. The original four still use
the plain stack-of-outlines extruder.

For the prism extruder:

- Both faces are triangulated with the same earcut implementation three.js uses
  (`ShapeUtils.triangulateShape`), so cap boundaries are exactly the profile
  vertices.
- Every wall is an explicit strip of quads joining **matching** vertices, because
  the two outlines always share their vertex order. When the top outline is
  rotated or sheared relative to the bottom one, that wall is a twisted ruled
  surface and the shell stays closed.
- Slice heights are chosen per feature: spread evenly for the lean, bunched next
  to each face for the tip edge round. That keeps a quarter round a round instead
  of a chamfer without slicing the whole part finely.
- `emitCap` fixes each cap triangle's winding from its 2D orientation, so caps and
  walls always agree.

- The revolution builder welds every profile point on the axis into a single pole,
  so a dome or a cone closes without a ring of degenerate triangles, and it flips
  the profile winding if the points were listed clockwise.
- The sweep builder caps both ends of the tube with the section it swept, so a
  spring or an elbow is closed by construction rather than by stitching.

`inspectMesh()` then verifies the result: every directed edge must cancel against
its reverse, there must be a single connected shell, and no repeated or zero-area
faces. It accepts any closed orientable surface — `χ = 2` for a plain solid, `0`
for a tube, `−2` for a plate with two holes — and reports the genus instead of
assuming every part has a bore. Only then is a volume reported or an STL offered.
The volume is the divergence-theorem volume of that closed mesh.

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
| Tests    | Vitest — 496 geometry, designer and STL tests            |

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

`npm run build` emits a static site in `dist/`. Routes are hash-based: `#/` is the
catalogue, `#/<designer-id>` opens any of the ninety-six (for example `#/spur-gear` or
`#/sprocket`), so any static host works with no rewrite rules.

---

## Project structure

```
src/
  App.tsx                    suite shell: header, hash router, catalog, footer
  components/
    Catalog.tsx              the ninety-six cards, grouped by family
    DesignerPage.tsx         hero + builder slot + explainer shared by every page
    DesignScaffold.tsx       two-column builder: inputs, measurements, preview, export
    GenericDesigner.tsx      schema-driven form used by all ninety-six new designs
    DesignMark.tsx           one family glyph per catalog card
    MeshPreview.tsx          three.js canvas (WebGL fallback, reset view)
    SprocketBuilder.tsx      sprocket form, validation, readout, STL
    FanBuilder.tsx           impeller form…
    PropellerBuilder.tsx     propeller form…
    fields.tsx               number field, segmented control, option cards, presets, toggle
    useUnitValues.ts         form state with mm/in conversion
  lib/
    kit/units.ts             units, formatting, outlines, validation helpers
    kit/solid.ts             extruder, mesh inspector, binary STL writer
    kit/prism.ts             multi-hole prism kernel (twisted rings supported)
    kit/revolve.ts           solid-of-revolution kernel and profile builder
    kit/sweep.ts             helical-tube and swept-annulus kernels
    designs/types.ts         field schema, defineDesign(), validation helpers
    designs/geometry.ts      involute gears, ratchet, Geneva, cams, wrench profiles
    designs/prism-*.ts       the prism designs (gears, parts, hardware, plates, discs)
    designs/revolve-*.ts     the revolved designs (vessels, mechanical, household, parts)
    designs/motion-designs.ts  spring and pipe elbow
    designs/index.ts         the registry and id lookup
    sprocket.ts              spec, roller-seat profile, mesh, validation, form helpers
    rotor.ts                 shared blade-rotor core (impeller and propeller)
    fan.ts / propeller.ts    form field sets and spec builders
    star/                    the original star roller engine
```

---

## Limits

- **Star roller** is prismatic apart from the tip taper: no helix or knurling.
  Rectangle flaps keep their width up the taper, so their sides stay in one plane.
- **Sprocket** seats are true circular roller cuts with straight or eased flanks;
  the ANSI tooth-flank radii are not modelled, so treat tooth strength as
  indicative.
- **Impeller and propeller** blades are constant-chord bands leaned by a linear
  shear: no airfoil camber, no radial pitch distribution beyond that shear, and no
  twist beyond the root-to-tip lean. The tip rounding is a true round in plan,
  capped by the tip chord; the edge rounding is a quarter round in the radial–axial
  plane on the top and bottom of the tip, capped at half the blade height. The two
  are separate features, and neither is a ball-end on the corner.
- Hubs are plain bosses; there are no spoke cut-outs, bolt circles or keyways.
- **Gears** use true involute flanks at the entered pressure angle, with a
  straight radial root and no fillet. **Splines** are straight-sided rather than
  involute. **Knurls** are modelled as a lobed outline, not a cut diamond.
- **Threads are not modelled.** Nuts, knobs and adapters are bored to the
  entered diameter, so a printed M8 nut needs the bore sized for the material and
  the printer, not a real thread form.
- **Ratchet wheels** have asymmetric teeth with a root fillet but no separate
  pawl. **Geneva wheels** have the slots and the concave locking arc, but not the
  driver pin. **Cams** are radial-lift discs with no roller follower.
- **Flywheels** are rim, web and hub only: no lightening holes, keyway or
  balancing marks. The mass estimate assumes PLA at 1.24 g/cm³.
- **Springs** are a circular wire swept on a true helix with square-cut ends; the
  rate uses G = 3.5 GPa for PLA and assumes the coils do not touch.
- **Vessels** are solids of revolution, so handles, spouts that leave the axis
  and non-circular rims are out of scope. A funnel's spout is concentric.
- Printability checks describe geometry only. Layer adhesion, wall count and
  material still decide whether a print survives.
