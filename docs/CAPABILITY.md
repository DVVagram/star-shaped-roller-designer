# Capability and evidence

This library generates editable parametric **shapes**. It does not certify that a
printed part will fit, carry load, seal, cut, brake, move air, survive heat or
comply with a standard. The labels below are shown on every catalogue card, in
the designer page, beside the export button and in the downloadable
specification.

## Labels

| Label | Meaning | What it allows |
| --- | --- | --- |
| **Shape / display model** | Geometry only. No fit, load, flow, optical or safety duty is verified. | Printing for appearance, teaching or a rough mock-up. |
| **Fit prototype** | Dimensional trial part. The mesh is checked; the fit is not. | Measure the mate, calibrate the printer, print a coupon and test. |
| **Functional candidate** | Reserved for a design with recorded fit and load checks for a defined process. | Nothing yet: no designer currently carries this label. |
| **Not suitable for the named high-risk use** | The shape can be printed, but the named duty is excluded: pressure, flame, cutting, braking, torque, clinical, centrifugation, stored energy. | Display or fit trials only, never the excluded duty. |

## Checks actually performed

For every export the app verifies:

- every edge is shared by exactly two consistently wound triangles;
- the mesh is one connected component;
- there are no repeated faces or faces with repeated vertex indices;
- the Euler characteristic matches a closed orientable surface;
- the signed volume is finite and positive;
- the overall envelope fits the 180 mm build cube;
- zero-area cap slivers from earcut hole bridging are counted and reported.

It does **not** check triangle self-intersection, overlapping shells, minimum wall
thickness over the surface, overhangs or print orientation, material strength,
fatigue, creep, wear, real fit or tolerance, chemical/heat/flame/food safety, or
compliance with any published standard.

## Evidence matrix

| User-facing claim | Evidence in this repository | Status |
| --- | --- | --- |
| The preview, readout and STL come from one mesh | `src/lib/designs/designs.test.ts` builds the exported mesh and compares STL volume; `GenericDesigner` builds the export from the same parameters | Tested |
| The mesh is a closed, consistently wound, single shell | `inspectMesh()` and the defaults/extremes tests in `designs.test.ts` | Tested for the checked configurations |
| The part fits the 180 mm cube | `envelopeFits()` in `spec.ts`, enforced in `GenericDesigner` | Tested per default and checked at export |
| A designer's defaults are valid and deterministic | `designs.test.ts` defaults, repeat-run and unit tests | Tested |
| Invalid input is rejected with a field-specific message | `designs.test.ts` sweeps and rejection tests; `completeness.test.ts` probes empty, huge and zero values | Tested |
| Units convert without changing the part | millimetre/inch equivalence tests | Tested |
| A gear will mesh with a mating gear | none: tooth outline only; no contact, backlash, undercut or strength calculation | Not verified — fit prototype |
| A sprocket will engage a chain | none: ANSI flank radii, chain width and wear are not modelled | Not verified — fit prototype |
| A belt pulley matches a named belt | none: generic groove, no belt standard | Not verified — fit prototype |
| A nut or knob is threaded | none: plain clearance bore | Not verified — unthreaded body |
| A vessel holds liquid, is food-safe or pressure-safe | none: no leak, wall, material or hygiene test | Not verified — fit prototype or high-risk use excluded |
| A lab vessel can be centrifuged or sterilised | none: explicitly excluded | Excluded |
| A wrench can apply torque, a saw can cut, a brake can stop | none: explicitly excluded | Excluded |
| A spring has the stated rate | illustrative helical-spring formula with an assumed shear modulus; no material characterisation | Estimate only |
| A pipe or hose part seals or carries pressure | none: no seal, burst or chemical test | Excluded for pressure duty |
| A fit is correct for a given printer | none: no printer/material calibration is applied | Not verified — test print required |
| A dimensioned drawing gives tolerance limits | none: the SVG shows projected wireframes and overall extents, not tolerances | Reference only |

## Downloads

- **STL** — binary, coordinates in millimetres by convention, no units or metadata.
- **Specification (.txt)** — design id, entered and derived values, capability,
  standard, mating dimensions, fit allowance, warnings, topology report,
  build-volume result, explicit not-checked list. Available from all 150
  designer pages, including the four original builders.
- **Dimension sheet (.svg)** — top and front projections of the exported mesh,
  overall extents, origin, capability, limitations. Not a tolerance drawing.
  Available from all 150 designer pages.

## Changing a label

A designer may move to **Functional candidate** only when a test or cited primary
specification covers the claimed duty for a defined material and process, and the
evidence is added to the matrix above. A capability label must never be upgraded
because a mesh is watertight.
