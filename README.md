# Parametric Works

One hundred and ninety-three parametric designers for **editable mechanical,
workshop, household and lettered parts**, in one static site: the original four
wheels and rotors, plus 189 schema-driven designers across gears and drives,
plates and fixings, vessels and fluid, motion, and text and lettering.

| Family             | Designers | What it covers                                                    |
| ------------------ | --------- | ----------------------------------------------------------------- |
| **Wheels & rotors** | 4         | Star roller, axial impeller, propeller and a fan mount plate      |
| **Gears & drives**  | 25        | Spur, internal, helical and rack teeth, pulleys, sprocket, cams    |
| **Plates & fixings** | 87       | Plates, brackets, clamps, mounts, fasteners, knobs and spacers     |
| **Vessels & fluid** | 60        | Cups, bowls, funnels, ducts, shells, labware and pipe fittings      |
| **Motion**          | 16        | Springs, pistons, rolling elements and small mechanisms             |
| **Text & lettering** | 1        | One lettered plate: signs, tags, name plates, stamps and tiles       |

Every designer renders a live three.js preview of the same indexed mesh it
measures, reports the closed-shell volume, and exports a binary STL,
specification and dimension sheet (separately or together as one ZIP).
Coordinates are millimetres by convention; STL itself carries no units,
material or tolerance data. Invalid or non-manifold configurations block the
download instead of producing a broken file. There is no assumed build area:
the model is not rejected because an overall dimension is large.

Each designer keeps its current setup in the address bar (`?config=…`), restores
the last local edit on that browser, and offers Standard, Compact and Oversize
starting points where the design validates them. **Copy link** carries the same
setup to another tab. The header switcher searches the whole catalogue, and
every designer links to its paired and related pages.

Everything runs in the browser: no CAD kernel, no server, no account, no uploads.

## Capability, not a certificate

A watertight mesh proves topology, not that a part will fit, carry load, seal,
move air or survive heat. Every catalogue card and designer page therefore
carries a capability label:

- **Shape / display model** — editable geometry with no verified duty.
- **Fit prototype** — measure the mating part, verify the intended process and
  make a physical test piece before relying on a dimension.
- **Functional candidate** — only after the named fit and load checks are made
  and recorded. No designer currently qualifies; none is labelled functional.
- **Not suitable for the named high-risk use** — pressure, flame, cutting,
  braking, torque, clinical, centrifugation or similar duty is excluded.

Each designer also states the standard it actually implements (usually none), the
mating dimensions it needs, its fit allowance and the properties nobody checked.
The same statement is repeated beside the export button and written into the
downloadable specification. `docs/CAPABILITY.md` records the evidence behind the
labels, and `docs/DESIGN-AUDIT.md` is generated from the registry with every
designer's capability, standard, mate and first limitation. The four original
builders also download a specification and a dimension sheet. Exporting a fit
prototype is allowed only after the mesh passes the topology checks; that is
still not permission to treat it as a certified part.

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

## The schema-driven catalogue

The other 189 designers are `defineDesign()` modules. One field list drives the
form, the unit conversion, the millimetre parameters, the validation copy, the
readout, the preview and the STL file name, so the drawn part, the measured
numbers and the exported file cannot disagree about what was asked for.

`docs/DESIGNERS.md`, `docs/DESIGNERS-2.md`, `docs/DESIGNERS-3.md` and
`docs/DESIGNERS-1000.md` hold the candidate lists and the batch notes they came
from. `docs/DESIGN-AUDIT.md` is generated from the live registry and always
matches the catalogue.

The single text designer is **Lettered plate**: one plate with a rectangle,
rounded-end, round or square outline, a hang hole, two corner screw holes or no
holes, and four bundled typefaces — Sans, Sans bold, Serif and Mono. Only
uppercase A–Z, digits, space and `. , ' & ! ? + -` are accepted, matching the
subset glyphs that ship. Width is computed from advance widths with no kerning.
Lettering is normal by default; choosing **Mirrored for stamping** flips the
glyphs so a stamp or embosser prints them the right way round.

## Shared geometry

All internal lengths are millimetres. Four builders cover the library: a
multi-hole prism extruder (stacked outlines with optional twisted rings), a solid
of revolution from a closed `(r, z)` profile, a swept tube that carries a
circular or annular section along a helix or a bend, and a letter extruder that
turns font outlines into solid glyph bodies. The original four still use the
plain stack-of-outlines extruder.

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
- The letter builder extrudes each glyph outline into its own closed body; the
  plate and the glyph bodies are combined into one mesh without booleans.

`inspectMesh()` then verifies the result: every directed edge must cancel against
its reverse, no face may repeat, and no face may repeat a vertex index. It accepts
one or more closed shells: a plain solid has `χ = 2`, a tube `0`, a plate with two
holes `−2`, and a plate plus one closed body per glyph is accepted up to
`χ = 2 × bodies`. That is why a lettered plate is reported as a multi-body part,
with every body watertight on its own. Only then is a volume reported or an STL
offered. The volume is the divergence-theorem volume of the closed mesh.

Earcut's hole bridges can leave zero-area cap slivers; those are counted and
reported rather than hidden, and most importers ignore them.

### How the shapes are generated

- **Star**: one spike owns `2π / N`, split between tip land, valley land and a
  flank; auto-fit takes the largest count where all three still fit.
- **Sprocket**: the seat half-angle is `asin((roller/2 + clearance) / Rp)`, so a
  larger roller or finer pitch consumes the flank until the teeth collide.
- **Rotor**: the passage between blades is `pitch · r − chord(r)`; lean is limited
  to `0.55 · pitch · R` so a blade top cannot reach its neighbour.
- **Text**: advance widths are summed to get the line width; the glyph outlines
  are extruded to the letter relief, optionally mirrored, and placed on the plate
  within the entered margin.

## Stack

| Area     | Choice                                                   |
| -------- | -------------------------------------------------------- |
| App      | Vite, React 19, TypeScript, Tailwind CSS 4               |
| 3D       | three.js + OrbitControls                                 |
| Geometry | In-repo profiles, extruders, revolution, sweep and lettering |
| Export   | Binary STL, specification and dimension sheet, ZIP writer |
| Tests    | Vitest — geometry, designer, contract, spec and copy tests |

No database, no API keys and no environment variables.

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
catalogue, `#/<designer-id>` opens any of the 193 pages (for example `#/spur-gear`
or `#/sprocket`), so any static host works with no rewrite rules.

## Project structure

```
src/
  App.tsx                    suite shell: header, hash router, catalog, footer
  components/
    Catalog.tsx              the 193 cards, grouped by family
    DesignerPage.tsx         compact title + builder first, explainer below, related cards
    DesignerSearch.tsx       searchable designer combobox in the header
    DesignerTools.tsx        presets, copy-link, issue summary and sticky export bar
    DesignScaffold.tsx       two-column builder: inputs, measurements, preview, export
    GenericDesigner.tsx      schema-driven form used by all 189 new designs
    DesignMark.tsx           one family glyph per catalog card
    MeshPreview.tsx          three.js canvas (WebGL fallback, reset view)
    SprocketBuilder.tsx      sprocket form, validation, readout, STL
    FanBuilder.tsx           impeller form…
    PropellerBuilder.tsx     propeller form…
    fields.tsx               number field, segmented control, option cards, presets, toggle
    useUnitValues.ts         form state with mm/in conversion
  assets/fonts/              four subset typefaces for the text designers
  lib/
    kit/units.ts             units, formatting, outlines, validation helpers
    kit/solid.ts             extruder, mesh inspector, binary STL writer
    kit/prism.ts             multi-hole prism kernel (twisted rings supported)
    kit/revolve.ts           solid-of-revolution kernel and profile builder
    kit/sweep.ts             helical-tube and swept-annulus kernels
    kit/design-link.ts       versioned URL/config, local restore and clipboard
    kit/zip.ts               store-only ZIP writer for the three export files
    designs/types.ts         field schema, defineDesign(), validation helpers
    designs/presets.ts       validated Compact/Standard/Oversize starting points
    designs/geometry.ts      involute gears, ratchet, Geneva, cams, wrench profiles
    designs/prism-*.ts       the prism designs (gears, parts, hardware, plates, discs)
    designs/revolve-*.ts     the revolved designs (vessels, fittings, household, workshop)
    designs/motion-designs.ts  springs and motion parts
    designs/text-kit.ts      font parsing, letter extrusion and mirroring
    designs/text-products.ts the single lettered-plate designer
    designs/index.ts         the registry and id lookup
    designs/contracts.ts     capability, standard, mate and limitation declarations
    designs/legacy.ts        contracts and input labels for the original four
    designs/spec.ts          downloadable specification from one record shape
    designs/drawing.ts       dimension sheet from the exported mesh
    sprocket.ts              spec, roller-seat profile, mesh, validation, form helpers
    rotor.ts                 shared blade-rotor core (impeller and propeller)
    fan.ts / propeller.ts    form field sets and spec builders
    star/                    the original star roller engine
```

```
scripts/
  design-audit.ts          regenerates docs/DESIGN-AUDIT.md from the registry
```

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
  entered diameter, so an M8 nut needs the bore sized for the material and the
  process, not a real thread form.
- **Ratchet wheels** have asymmetric teeth with a root fillet but no separate
  pawl. **Geneva wheels** have the slots and the concave locking arc, but not the
  driver pin. **Cams** are radial-lift discs with no roller follower.
- **Flywheels** are rim, web and hub only: no lightening holes, keyway or
  balancing marks. The mass estimate assumes a density of 1.24 g/cm³; set the
  real density for your material.
- **Springs** are a circular wire swept on a true helix with square-cut ends; the
  rate uses an illustrative G = 3.5 GPa and assumes the coils do not touch;
  substitute the shear modulus of the material you will use.
- **Vessels** are solids of revolution, so handles, spouts that leave the axis
  and non-circular rims are out of scope. A funnel's spout is concentric.
- **Lettering** is limited to the bundled glyph set, has no kerning, and is
  uppercase only. A lettered plate is one STL containing several closed bodies,
  so some slicers will treat the letters and plate as one object; the mirrored
  variants are geometry, not a font feature.
- Fabrication checks describe geometry only. Process choice, material and wall
  thickness still decide whether a part survives.
- **No designer is functionally certified.** Gears are not validated against a
  mating gear, sprockets against a chain, threads are absent, springs use an
  illustrative modulus, and vessels are not pressure-, heat- or food-rated. The
  capability labels and `docs/CAPABILITY.md` are part of the product, not a
  footnote.
- **Fit is never guaranteed.** Measure the real mating part and make a test
  piece; the app applies no process, material or tolerance calibration.
