import type { CSSProperties } from "react";

export const gridColumns = (columns: number): CSSProperties => ({
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
});
