/** Minimal typings for the three.js example font loader used by text designs. */

declare module "three/examples/jsm/loaders/FontLoader.js" {
  import type { Shape } from "three";

  export interface TypefaceGlyph {
    /** Advance width in font units. */
    ha: number;
    /** SVG path commands for the glyph outline. */
    o: string;
  }

  export interface TypefaceData {
    glyphs: Record<string, TypefaceGlyph>;
    familyName?: string;
    resolution: number;
  }

  export class Font {
    data: TypefaceData;
    constructor(data: TypefaceData);
    generateShapes(text: string, size: number): Shape[];
  }

  export class FontLoader {
    parse(json: unknown): Font;
  }
}
