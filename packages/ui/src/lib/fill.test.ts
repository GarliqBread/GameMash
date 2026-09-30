import { describe, expect, it } from "vitest";
import { floodMask, maskToRings, nearestColors, type Rgb } from "./fill.js";

const SIZE = 16;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [26, 23, 38];
const RED: Rgb = [224, 65, 58];
const ORANGE: Rgb = [242, 107, 58];
const PALETTE = [WHITE, BLACK, RED, ORANGE];

const image = (colorAt: (x: number, y: number) => Rgb) =>
  new Uint8ClampedArray(
    Array.from({ length: SIZE * SIZE }, (_, cell) => [...colorAt(cell % SIZE, Math.floor(cell / SIZE)), 255]).flat(),
  );

const isBoxEdge = (x: number, y: number) =>
  (x >= 4 && x <= 11 && (y === 4 || y === 11)) || (y >= 4 && y <= 11 && (x === 4 || x === 11));

const box = (line: Rgb, background: Rgb) =>
  nearestColors(
    image((x, y) => (isBoxEdge(x, y) ? line : background)),
    PALETTE,
  );

const cellsIn = (mask: Uint8Array) => mask.reduce((sum, value) => sum + value, 0);

describe("bucket fill", () => {
  it("floods only the area of the tapped colour, stopping at lines", () => {
    const labels = box(BLACK, WHITE);

    expect(cellsIn(floodMask(labels, SIZE, 8 * SIZE + 8))).toBe(36);
    expect(cellsIn(floodMask(labels, SIZE, 0))).toBe(SIZE * SIZE - 64);
  });

  it("keeps close palette colours apart", () => {
    const labels = box(RED, ORANGE);

    expect(cellsIn(floodMask(labels, SIZE, 0))).toBe(SIZE * SIZE - 64);
  });

  it("splits anti-aliased edges between the two colours they blend", () => {
    const labels = nearestColors(
      image((x) => {
        if (x < 7) return WHITE;
        if (x === 7) return [200, 199, 203];
        if (x === 8) return [80, 77, 90];
        return BLACK;
      }),
      PALETTE,
    );

    expect(cellsIn(floodMask(labels, SIZE, 0))).toBe(8 * SIZE);
  });

  it("traces the outline in canvas units, with holes as their own rings", () => {
    const rings = maskToRings(floodMask(box(BLACK, WHITE), SIZE, 0), SIZE);

    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      expect(ring.length).toBeGreaterThanOrEqual(3);
      expect(ring.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    }
  });
});
