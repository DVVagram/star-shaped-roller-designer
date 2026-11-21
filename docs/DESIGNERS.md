# The designer long list

Three hundred and forty-four candidate parametric designers were written down
before any code was generated. Forty-six of them are built on this branch; the
rest are recorded so the choice is visible rather than implied.

A **✓** marks a designer that shipped. The four designers that already existed
(star roller, chain sprocket, axial impeller, propeller) are not counted in the
forty-six and carry no mark.

Selection favoured parts where:

1. the geometry can be generated exactly from a handful of numbers, with a
   closed-form check the app can print next to the preview;
2. the result is a single closed shell that prints without support in at least
   one orientation;
3. the part is recognisable and useful on its own, not a fragment of a larger
   assembly;
4. the family already has a geometry kernel here (multi-hole prism, solid of
   revolution, swept tube), so accuracy can be tested rather than asserted.

## What shipped

| Family | Designers |
| --- | --- |
| Gears and drives | Spur gear, internal ring gear, helical gear, rack, timing pulley, V-belt pulley, round-belt pulley, stepped pulley, flywheel |
| Wheels and rotors | Ratchet wheel, Geneva wheel, disc cam, eccentric wheel, saw blade, handwheel, torus, chain link |
| Plates and fixings | Wing nut, hex nut, washer, star knob, knurled knob, flange, mounting plate, splined hub, flanged bushing |
| Vessels and fluid | Funnel, vase, cup, bowl, bottle, bell, lamp shade, spool, gasket, hemisphere shell, parabolic dish, de Laval nozzle, nose cone, pipe reducer, pipe cap, hose adapter, pipe elbow |
| Motion | Compression spring |

---

## 1. Gears and transmissions (30)

1. **Spur gear** ✓ — involute flanks, module and tooth count.
2. **Internal ring gear** ✓ — inward-cut teeth for a planetary set.
3. **Helical gear** ✓ — twisted tooth stack at a real helix angle.
4. **Rack** ✓ — straight involute teeth on a bar; the linear half of a rack and pinion.
5. Herringbone gear — two opposite helices meeting at a centre land.
6. Straight bevel gear — cone pitch surface, teeth tapering to the apex.
7. Spiral bevel gear — curved bevel teeth; needs a five-axis approximation.
8. Hypoid gear — offset bevel pair for a car axle.
9. Worm — helical thread on a shaft, with a true axial pitch.
10. Worm wheel — throated wheel that wraps the worm.
11. Globoid worm wheel — enveloping hourglass form.
12. Planetary sun gear — small involute gear with a splined bore.
13. Planetary planet gear — identical tooth form, bearing bore.
14. Planetary carrier — three or four planet pins on a plate.
15. Crown gear — face teeth at 90° to the shaft.
16. Face gear — disc with axial teeth driven by a spur pinion.
17. Cycloidal gear — epicycloidal flanks for a clock train.
18. Lantern gear — cylindrical pins instead of cut teeth.
19. Elliptical gear — non-circular pitch curve for a varying ratio.
20. Non-circular gear pair — matched oval pair generated together.
21. Sector gear — a partial gear with a stop at each end.
22. Mutilated gear — a gear with teeth only over part of the rim.
23. Cluster gear — two or three gears on one shaft.
24. Change gear — the classic lathe quadrant gear.
25. Idler gear — plain bearing, no hub.
26. Anti-backlash split gear — two halves preloaded by a spring.
27. Detent gear — teeth with a locating notch between stations.
28. Intermittent gear — a dwell segment plus a drive segment.
29. Gear coupling hub — crowned teeth for a flexible coupling.
30. Friction wheel — a plain rim for a friction drive.

## 2. Pulleys, belts and chains (26)

31. **Timing pulley** ✓ — GT-style teeth on the true pitch circumference.
32. **V-belt pulley** ✓ — one to four wedge grooves at the belt angle.
33. **Round-belt pulley** ✓ — semicircular U grooves.
34. **Stepped pulley** ✓ — two to four sheaves on one bore.
35. **Chain link** ✓ — a roller-chain outer link with two pin holes.
36. Flat-belt pulley — crowned rim to keep the belt centred.
37. HTD pulley — a different tooth profile from the GT series.
38. Multi-groove micro-V pulley — six or eight shallow ribs.
39. Wire-rope sheave — a deep round groove with a wide throat.
40. Rope pulley with a check plate — a flange on each side.
41. Idler pulley — a plain bearing and a crowned face.
42. Tensioner arm — an offset pulley with a spring mount.
43. Chain sprocket with a hub — the existing sprocket plus a boss.
44. Sprocket with lightening holes — a web pocketed between the teeth and the hub.
45. Sprocket segment — a quarter sprocket for a large chain wheel.
46. Chain guide — a curved shoe that wraps the chain.
47. Chain tensioner block — a slotted slider with a wear face.
48. Belt clamp — a plate with a toothed grip for an open belt.
49. Belt splice — a finger joint for a printed belt.
50. Cable pulley block — two cheeks and a sheave.
51. Snatch block — a pulley that opens on one side.
52. Chainring — a bicycle chainring with a four-arm spider.
53. Cassette cog — a single splined cog.
54. Freewheel body — a ratchet inside a sprocket.
55. Timing-belt idler — a toothed idler that keeps the belt in phase.
56. Flat-belt splice comb — the interlocking half of a printed belt joint.

## 3. Shafts, hubs, couplings and bearings (28)

57. **Splined hub** ✓ — straight-sided splines on a bored hub.
58. **Flanged bushing** ✓ — a sleeve with a locating flange.
59. Plain shaft collar — a ring with a grub screw boss.
60. Set-screw collar — one radial tapped hole.
61. Clamping collar — a slit ring with a cross bolt.
62. Two-piece shaft collar — a bolted half shell.
63. Rigid coupling — two flanges and a bore.
64. Jaw coupling — three curved jaws each side.
65. Oldham coupling — two slotted discs and a centre tongue.
66. Schmidt coupling — three discs for parallel offset.
67. Bellows coupling — a thin-walled flexure between hubs.
68. Universal joint yoke — a fork for a cross pin.
69. Cross trunnion — the centre block of a universal joint.
70. D-shaft adapter — a round body with a double-flat bore.
71. Hex-drive adapter — a socket that takes a hex key.
72. Square-drive adapter — 1/4 in or 1/2 in square drive.
73. Threaded shaft sleeve — an externally threaded bushing.
74. Bearing housing — a press-fit pocket for a 608 bearing.
75. Pillow block — a bearing housing with two mounting feet.
76. Flanged bearing block — a square flange with a bearing pocket.
77. Thrust washer — a flat ring with oil grooves.
78. Shim set — a stack of thin rings in fixed increments.
79. Lock nut — a nut with three radial clamp screws.
80. Keyed hub — a hub with a parallel keyway.
81. Taper-lock bush — a tapered split bush.
82. Shaft end cap — a push-on cap with a retention lip.
83. Linear bearing block — a pocket for an LM8UU.
84. Lead-screw nut — an anti-backlash nut with a slit.

## 4. Threads and fasteners (28)

85. **Wing nut** ✓ — two wings on a hex body, bored for a bolt.
86. **Hex nut** ✓ — across-flats and thickness, with a real chamfer.
87. **Washer** ✓ — flat ring with an optional countersink.
88. Square nut — four flats, thicker than a hex nut.
89. Cap nut — a domed closed nut.
90. Flange nut — a nut with an integrated washer face.
91. Nyloc-style nut — a nut with a nylon insert pocket.
92. T-slot nut — a rectangular nut for an extrusion slot.
93. Hammer nut — a drop-in nut with a spring ball.
94. Weld nut — a nut with three projections.
95. Cage nut — a nut in a spring steel cage.
96. Eye nut — a nut with a lifting eye.
97. Ring nut — a nut with a radial hole for a pin spanner.
98. Slotted nut — a castle nut with six slots.
99. Thumb screw — a knurled head with a plain shank.
100. Shoulder screw — a precision shank and a thread relief.
101. Standoff — a hex spacer with a through bore.
102. Male-female standoff — threaded at one end, tapped at the other.
103. Threaded insert — a heat-set insert with a knurled outside.
104. threaded rod coupler — a long nut.
105. Turnbuckle body — a left- and right-hand threaded barrel.
106. Spring pin — a rolled split pin.
107. Clevis pin — a pin with a head and a cross hole.
108. R-clip — a retaining clip for a clevis pin.
109. Cotter pin — a folded split pin.
110. Retaining ring — an external circlip with two lugs.
111. E-clip — a push-on shaft clip.
112. Threaded cap — a plug with a hex socket.
113. Dowel pin — a chamfered cylinder in a set of lengths.
114. Rivet — a snap-head rivet in a set of lengths.

## 5. Knobs, handles and grips (26)

115. **Star knob** ✓ — a lobed grip on a bored hub.
116. **Knurled knob** ✓ — a diamond-knurled cylindrical grip.
117. **Handwheel** ✓ — a spoked rim with a finger knob.
118. Ball knob — a sphere on a stem.
119. Tapered knob — a cone with a flat top.
120. Bar knob — a T-handle for a clamp screw.
121. Cross knob — a four-arm star grip.
122. Lobed knob with a pointer — a grip with an index mark.
123. Wing screw — a thumb screw with moulded wings.
124. Cam lever — an eccentric clamp lever.
125. Ratchet lever — a lever with a pawl pocket.
126. Crank handle — an offset grip on a crank arm.
127. Crank arm — a two-hole arm with a keyed bore.
128. Machine handle — a revolving handle on a fixed stud.
129. Revolving grip — a sleeve that spins on a shoulder screw.
130. Door handle — a pull with two mounting holes.
131. Drawer pull — a bar pull with a standoff at each end.
132. Cabinet knob — a mushroom knob with a screw boss.
133. Tool handle — an oval grip with a ferrule socket.
134. File handle — a tapered socket for a tang.
135. Chisel handle — a socket with a steel-ring groove.
136. Screwdriver handle — a fluted grip with a bit socket.
137. Tap wrench body — a T-handle with a square collet.
138. Clamp knob — a knob with a threaded insert pocket.
139. Index knob — a spring-detent knob.
140. Knob with a scale — a grip with a printed degree ring.

## 6. Plates, brackets and enclosures (30)

141. **Flange** ✓ — a bored disc with a bolt circle.
142. **Mounting plate** ✓ — a rectangular plate with a hole pattern.
143. **Gasket** ✓ — a thin ring or a shaped seal with bolt holes.
144. L-bracket — two legs at 90° with mounting holes.
145. Corner gusset — a triangular brace.
146. U-bracket — two uprights on a base.
147. Z-bracket — an offset mounting strap.
148. Servo bracket — a pocket for a standard servo.
149. Motor mount — a face mount with a shaft clearance.
150. NEMA 17 mount — the standard four-hole stepper pattern.
151. PCB standoff plate — a grid of standoff bosses.
152. Enclosure base — a walled box with a lip.
153. Enclosure lid — a matching lid with a gasket groove.
154. Snap-fit lid — a lid with two cantilever snaps.
155. DIN rail clip — a spring clip for a 35 mm rail.
156. Cable gland plate — a plate with a row of strain-relief holes.
157. Cable comb — a plate with slots for a wire harness.
158. Strain relief — a printed two-part cable clamp.
159. Panel mount — a rectangular bezel with screw tabs.
160. VESA plate — a 75/100 mm mounting square.
161. Pipe clamp — a saddle clamp for a nominal pipe size.
162. Tube clip — a C-clip for a given tube diameter.
163. Rod holder — a two-part clamp for a round rod.
164. Magnet holder — a pocket for a disc magnet.
165. Sensor bracket — an adjustable slot mount.
166. Limit-switch mount — a slotted bracket with two holes.
167. Hinge leaf — a knuckle with a pin bore.
168. Hinge pin — a headed pin with a retention groove.
169. Door catch — a roller catch with a spring pocket.
170. Drawer slide spacer — a stackable shim block.

## 7. Vessels and containers (34)

171. **Funnel** ✓ — a cone with a spout, exact wall.
172. **Vase** ✓ — a lofted profile with a belly swell.
173. **Cup** ✓ — a tapered cup with a floor and wall.
174. **Bowl** ✓ — a hemispherical bowl with a flat foot.
175. **Bottle** ✓ — a body, shoulder and neck on one profile.
176. **Bell** ✓ — a flared shell with a crown.
177. **Lamp shade** ✓ — a truncated cone with a rim.
178. **Spool** ✓ — two flanges on a barrel.
179. **Hemisphere shell** ✓ — a dome of constant wall.
180. Planter — a tapered pot with a drainage hole.
181. Saucer — a shallow dish with a rim.
182. Tray — a rounded rectangular tray with a lip.
183. Box with a lid — a rectangular vessel and a push-fit lid.
184. Cylinder with a lid — a round canister.
185. Jar — a straight jar with a thread land.
186. Grinder body — a two-part herb grinder.
187. Salt shaker — a domed cap with a hole pattern.
188. Soap dish — a drained dish with a ridge.
189. Toothbrush cup — a cup with a divider.
190. Pen cup — a faceted cup.
191. Utensil holder — a tall cylinder with a weighted foot.
192. Paint pot — a tapered pot with a brush rest.
193. Glue bottle holder — a cradle for a bottle.
194. Funnel with a strainer — a cone with a perforated disc.
195. Measuring scoop — a scoop with a level lip.
196. Measuring cup set — nested cups with scale marks.
197. Ice cube tray — a grid of rounded pockets.
198. Seed tray — a tray of small cells.
199. Bird feeder — a hopper with a perch.
200. Bee hotel — a block of tubes.
201. Terrarium — a glass-less dome with a vent.
202. Vase insert — a water reservoir for cut flowers.
203. Bottle adapter — a threaded neck to a hose.
204. Silicone mould master — a positive for a cast mould.

## 8. Fluid, nozzles and ducts (28)

205. **de Laval nozzle** ✓ — convergent–divergent throat with an expansion ratio.
206. **Nose cone** ✓ — tangent ogive with a shoulder socket.
207. **Pipe reducer** ✓ — concentric cone between two bores.
208. **Pipe cap** ✓ — a blind cap over a pipe end.
209. **Hose adapter** ✓ — a barbed spigot with a flange.
210. **Pipe elbow** ✓ — an annulus swept along an arc.
211. **Parabolic dish** ✓ — a true parabola of revolution with a rim.
212. Venturi tube — a throat with pressure tappings.
213. Orifice plate — a bored plate with a chamfer.
214. Spray nozzle — a fan or cone orifice.
215. Misting nozzle — a swirl chamber and a small orifice.
216. Air knife — a slot nozzle with a plenum.
217. Duct transition — square to round in one loft.
218. Duct elbow — a rectangular bend with turning vanes.
219. Blast gate — a sliding gate in a duct body.
220. Fan housing — a scroll with a cutwater.
221. Centrifugal impeller — a backward-curved bladed wheel.
222. Diffuser — a vaned ring after an impeller.
223. Air filter frame — a frame with a mesh pocket.
224. Check valve body — a seat, a ball and a stop.
225. Ball valve body — a spherical pocket and two ports.
226. Pipe plug — a tapered plug with a hex head.
227. Pipe saddle — a clamp that fits a pipe outside diameter.
228. Manifold — a bar with one inlet and several outlets.
229. Drip emitter — a labyrinth passage in a small body.
230. Watering spike — a cone that threads into a bottle.
231. Hydroponic net pot — a slotted cup.
232. Aquarium strainer — a slotted intake guard.

## 9. Springs, cams and mechanisms (30)

233. **Compression spring** ✓ — a helical wire with a calculated rate.
234. **Ratchet wheel** ✓ — asymmetric teeth with a root fillet.
235. **Geneva wheel** ✓ — four slots and a locking arc.
236. **Disc cam** ✓ — a radial lift profile with a follower contact.
237. **Eccentric wheel** ✓ — an offset bore in a round disc.
238. Extension spring — hooks at both ends of a helix.
239. Torsion spring — a helix with two radial legs.
240. Conical spring — a helix on a shrinking radius.
241. Belleville washer — a dished disc spring.
242. Wave washer — an axially waved ring.
243. Leaf spring — a tapered cantilever pack.
244. Constant-force spring — a spiral strip.
245. Clock spring — an Archimedean spiral.
246. Cam follower — a roller on a stem.
247. Roller lever — a lever with a roller pocket.
248. Four-bar link — two pivots at a set centre distance.
249. Rocker arm — a pivoted lever with a ratio.
250. Bell crank — a two-arm lever at an angle.
251. Slider crank — a crank, a rod and a sliding block.
252. Scotch yoke — a crank pin in a sliding yoke.
253. Quick-return linkage — an offset crank and a slotted lever.
254. Ratchet pawl — a spring pawl that matches the wheel.
255. Detent plunger — a ball plunger with a spring pocket.
256. Over-centre clamp — a toggle clamp arm.
257. Toggle link — a two-hole strap.
258. Escapement wheel — a clock escape wheel.
259. Indexing plate — a plate with a ring of detent holes.
260. Geneva driver — the pin crank that turns the wheel.
261. Cam plate — a grooved face cam.
262. Rack and pinion pair — a matched rack and gear in one file.

## 10. Wheels, rollers and propellers (26)

263. **Torus** ✓ — a true circular section ring.
264. **Flywheel** ✓ — rim, web and hub on one profile.
265. **Saw blade** ✓ — a toothed disc with a bore.
266. Mecanum roller — a barrel-shaped roller for a mecanum wheel.
267. Star roller — the existing auto-fitting spiked wheel.
268. Chain sprocket — the existing roller-chain wheel.
269. Axial impeller — the existing leaned-blade rotor.
270. Propeller — the existing pitch-driven prop.
271. Solid tyre — a ring with a tread pattern.
272. Pneumatic-less wheel — a compliant spoked wheel.
273. Omni wheel — a hub with a ring of rollers.
274. Mecanum wheel — 45° rollers around a hub.
275. Caster wheel — a wheel with a fork and a swivel bore.
276. Caster fork — the yoke alone.
277. Roller — a plain cylinder with a bearing bore.
278. Conveyor roller — a roller with an end cap.
279. Drive roller — a roller with a keyed end.
280. Idler roller — a crowned roller.
281. Pulley wheel — a plain grooved wheel.
282. Wire wheel — a hub with a ring of bristle holes.
283. Buffing wheel arbor — a stack of discs on a mandrel.
284. Sanding drum — a cylinder with a chuck shank.
285. Polishing bob — a profiled felt bob.
286. Model boat prop — a three-blade prop with a small hub.
287. Ducted fan rotor — a rotor matched to a shroud.
288. Turbine runner — a Pelton-style bucket wheel.

## 11. Workshop, jigs and shop tools (26)

289. **Open-end wrench** ✓ — a jaw at 15° with a real opening.
290. **Box wrench** ✓ — a twelve-point ring on a handle.
291. Wing nut driver — a socket that seats a wing nut.
292. Spanner insert — a printed jaw that takes a hex bit.
293. Socket — a hex or double-hex socket with a square drive.
294. Bit holder — a 1/4 in hex bit holder.
295. Screwdriver bit — a flat or Phillips bit.
296. Torx bit — a six-lobe driver.
297. Allen key holder — a folding set of hex keys.
298. Drill guide — a block of bushings at set angles.
299. Dowelling jig — a plate with hardened drill bushings.
300. Pocket-hole jig — an angled guide block.
301. Mortise gauge — a marking gauge with two pins.
302. Marking gauge — a beam and a fence.
303. Centre finder — a V-block that marks a round centre.
304. Circle template — a plate with a range of holes.
305. Radius gauge — a fan of concave and convex leaves.
306. Thread pitch gauge — a fan of tooth profiles.
307. Feeler gauge holder — a folded strip holder.
308. Sanding block — a rounded block that takes paper.
309. Sandpaper punch — a plate that punches discs.
310. Clamp pad — a soft jaw for a bar clamp.
311. Bench dog — a dog with a spring collar.
312. Hold-down clamp — a pivoting clamp for a T-slot.
313. Tool holder — a wall bracket with a tool socket.
314. Bit organiser — a tray with numbered sockets.

## 12. Hobby, home and everything else (26)

315. Dice — a rounded cube with pip pockets.
316. Chess piece — a turned profile with a weighted base.
317. Miniature base — a textured round or oval base.
318. Paint bottle rack — a stepped rack with round pockets.
319. Brush rest — a ribbed rest for wet brushes.
320. Palette — a dish with paint wells.
321. Model rocket fin — an airfoiled fin with a root tab.
322. Model rocket centring ring — a ring that centres a motor tube.
323. Motor mount clip — a clip that retains a model rocket motor.
324. Servo horn — a splined arm with a set of holes.
325. Pushrod guide — a tube guide with a mounting tab.
326. Control horn — a horn with a hinge line.
327. Wheel spacer — a shim with a hub bore.
328. Tyre insert — a foam-replacement ring.
329. Battery holder — a tray for AA or 18650 cells.
330. Coin cell holder — a pocket for a CR2032.
331. Camera mount — a tripod plate with a 1/4 in thread land.
332. Phone stand — an angled cradle.
333. Tablet stand — a wider cradle with a lip.
334. Cable clip — a snap clip for a cable diameter.
335. Cable tie mount — a plate with two tie slots.
336. Wall hook — a hook with two screw holes.
337. Key hook rack — a bar with five hooks.
338. Plant tie — a soft ring with a gap.
339. Seed dibber — a pointed dibber with a depth mark.
340. Potting scoop — a scoop with a measured lip.

---

## Count

Three hundred and forty-four candidates, of which forty-six shipped on this
branch. The existing four designers bring the site to fifty.
