import type { SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number | undefined;
};

type IconBaseProps = IconProps & {
  children: SVGProps<SVGSVGElement>["children"];
};

export const Icon = ({ size = 24, strokeWidth = 2, children, ...props }: IconBaseProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);
