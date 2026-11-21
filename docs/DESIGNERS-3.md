# The third designer batch

Fifty more parametric designers were taken from the backlog and built, bringing
the catalogue from 146 to **196**. Every one follows the same four rules as the
earlier batches:

1. the geometry follows from a handful of numbers, with a closed-form check the
   app can verify beside the preview;
2. the result is one closed shell that can be made without a fixture in at least
   one orientation;
3. the part is recognisable and useful on its own, not a fragment of an assembly;
4. it fits an existing kernel here (solid of revolution, multi-hole prism), so
   accuracy can be tested rather than asserted.

## What shipped

| Family | Designers |
| --- | --- |
| Spacers, pins and caps | Round standoff, locating pin, countersink plug, screw cap, acorn cap, dowel, dowel spacer, hole plug, drawer knob, hinge pin |
| Sleeves and rollers | Plain bushing, flanged sleeve, spacer stack, crowned roller, idler wheel, guide roller, wrist pin, plunger |
| Springs and drives | Spring seat, spring cap, capstan drum, bobbin flange, encoder disc |
| Pressing and workshop | Bushing driver, seal driver, press disc, bench dog, soft jaw blank, rail end plate |
| Cups and tableware | Tumbler, shot glass, measuring cup, votive holder, bud vase, decanter stopper, coaster, napkin ring, tap handle, towel bar end |
| Caps and labels | Vial cap, septum cap, sample cup, flask weight, pet tag, cable marker, zip anchor |
| Plates | Dial plate, blind flange, orifice plate, pot grid |

## What the batch shares

- **One schema.** Each designer declares its fields once; the form, unit
  conversion, readout, preview, validation and STL name all read that declaration.
- **Capability contracts.** New food-contact shapes, heat-adjacent holders and
  labware-shaped caps carry the same exclusions as the existing ones; no entry is
  certified for pressure, heat, food contact or standards compliance.
- **Starting presets.** Standard, Compact and Oversize points are generated and
  rejected if the designer does not validate them, so every offered preset builds.
- **Tests.** Defaults, every field extreme, inch equivalence, repeatability, STL
  volume and catalogue completeness are all checked for each new designer.
