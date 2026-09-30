import { type SVGProps, useMemo } from "react";
import { encode } from "uqr";
import { cn } from "../lib/cn.js";

const qrPath = (modules: boolean[][]) =>
  modules
    .flatMap((row, y) => row.map((isDark, x) => (isDark ? `M${x} ${y}h1v1h-1z` : "")))
    .filter(Boolean)
    .join("");

export type QrCodeProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  value: string;
  label: string;
  size?: number | undefined;
};

export const QrCode = ({ value, label, size = 168, className, ...props }: QrCodeProps) => {
  const { path, dimension } = useMemo(() => {
    const result = encode(value, { border: 4, ecc: "M" });
    return { path: qrPath(result.data), dimension: result.size };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${dimension} ${dimension}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={cn("shrink-0 rounded-card bg-cream text-ink-950", className)}
      {...props}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
};
