/**
 * Extra making advice for parts whose notes explain the geometry but not yet
 * how to print or use the thing.
 */
export const MAKING_NOTES: Record<string, string> = {
  rack: "Print the rack flat on its back with the tooth line in the bed plane. Teeth printed on their side need support and lose the straight flanks that make the rack mesh.",
  "disc-cam": "Print the cam flat, so the follower runs across the layer lines instead of stepping over them, and keep the working face free of a brim.",
  "eccentric-wheel": "Print it flat and ream the bore afterwards. The throw is small, so a bore that prints undersize shows up as a stroke that is short by the same amount.",
  "star-knob": "Print the knob with its bore vertical: the lobes then rise as vertical walls and the grip depth you set is the grip you get.",
  "saw-blade": "Print the plate flat at 100 % infill and sand the teeth. A blade printed with sparse infill will flutter, and the gullets are where it cracks first.",
  flange: "Print it with the sealing face down on a smooth sheet, so the side that meets the gasket is the flat one and the bolt holes stay square to it.",
  "oval-flange": "Print the flange face down and ream the two bolt holes afterwards; small holes print undersize, and a flange that will not sit flat leaks.",
  "square-nut": "Print the nut with a flat face down and chase the bore with a tap. The designer makes the body and the clearance hole, not the thread.",
  spool: "Print the spool with one flange on the bed and a brim under it. On a small bed, print two flanges and a core and join them rather than scaling the whole spool down.",
  "hose-adapter": "Print the spigot upright in PETG, so the barbs print as clean rings. A barb printed on its side is an overhang, and overhangs do not grip a hose.",
  "de-laval-nozzle": "Print it upright with the exit at the top and sand the bore. Layer lines across the throat are the main thing standing between the printed nozzle and its calculated area.",
  "nose-cone": "Print the cone tip up with a brim, and keep the socket wall at three perimeters so it can be pushed over a body tube without splitting.",
  "stepped-pulley": "Print the pulley standing on its largest step with the bore vertical, so every step comes out as a clean ring and the shoulders stay flat.",
  candlestick: "Print it base down with a brim for the wide foot, and never leave a printed candlestick burning unattended — the plastic softens long before the candle is out.",
  "planter-pot": "Print it mouth down without support: the taper carries the walls, and the drainage holes bridge cleanly because they are small.",
};
