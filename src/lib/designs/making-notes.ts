/**
 * Extra making advice for parts whose notes explain the geometry but not yet
 * how to make or use the thing.
 */
export const MAKING_NOTES: Record<string, string> = {
  rack: "Make the rack as a straight bar and check the tooth line against a straightedge; a rack that bows will bind over part of its travel.",
  "disc-cam": "Finish the working face smooth and keep the follower contact band clean; a ridge or burr on the cam shows up as a step in the follower motion.",
  "eccentric-wheel": "Bore the centre hole after the outside is formed, then check the throw with a dial indicator. A bore that is undersize or off-centre shortens the stroke by the same amount.",
  "star-knob": "Keep the bore square to the grip face so the lobes sit true on the shaft; a cocked bore makes the knob wobble under hand load.",
  "saw-blade": "Make the plate from a tough, dimensionally stable material and finish the teeth by hand. A thin plate that flexes will flutter, and the gullets are where cracks start.",
  flange:
    "Machine or finish the sealing face flat and keep it square to the bolt holes; a face that rocks on the gasket will leak.",
  "oval-flange": "Finish the flange face flat and ream the bolt holes from the same setup. A flange that will not sit flat leaks no matter how tight the bolts are.",
  "square-nut": "Make the nut with a flat face as the reference and cut the bore after that face is true. The designer provides the body and clearance hole, not the thread.",
  spool: "Keep the flanges parallel and the core concentric; a spool that runs out will make the wire or cable pay off unevenly. Make the core separately if the flanges are easier to produce that way.",
  "hose-adapter": "Form the barbs as clean, continuous rings and smooth the lead-in. A barb with a seam or undercut will not grip a soft hose evenly.",
  "de-laval-nozzle": "Finish the throat and bore smooth and keep them concentric. Surface roughness across the throat is the main thing standing between the nozzle and its calculated area.",
  "nose-cone": "Keep the socket wall thick enough to take a push fit and finish the cone true to its axis. A cone that is out of round will not sit straight on the body tube.",
  "stepped-pulley": "Turn the steps from one setup with the bore as the reference, so every shoulder runs true and the belt sits flat.",
  candlestick: "Use a heat-resistant material and put a metal or ceramic dish underneath; a polymer holder is fine for the stick but not for hot ash. A wider base is worth more than a taller socket.",
  "planter-pot": "Keep the wall taper continuous and the drainage holes small and cleanly formed. A pot that rocks on its base will crack at the foot.",
  "helical-gear": "Form the helix in one continuous pass and check the hand against its mate; a pair with the same hand will not mesh.",
  "geneva-wheel": "Keep the slot walls and locking arc concentric with the bore, then check the driver pin position on a test assembly.",
  "knurled-knob": "Form the ridges to a consistent depth and break the edges; a burr on one ridge makes the knob feel out of round.",
  "slot-bracket": "Cut the slot before the pivot bore, then fit the bolt and check the full travel with the pivot tightened.",
  "vent-grille": "Finish the slot edges parallel and deburr both faces; a grille that is twisted will not sit flat over its opening.",
  "fan-grille": "Form the rings and spokes from one centre and check the outer ring against the housing before assembly.",
  "dovetail-rail": "Machine the dovetail flanks to one angle, check it with a gauge, and leave the running clearance on the carriage side, not on both flanks.",
  "tapered-plug": "Turn the taper in one setup and blue it against the socket; a plug that only touches at the ends will rock.",
  "oring-plug": "Finish the groove sides square and smooth the sealing face; a burr across the groove will cut the O-ring.",
  "furniture-foot": "Finish the foot flat and the mounting face square to its axis; a foot that rocks will mark the floor and loosen its fixing.",
};
