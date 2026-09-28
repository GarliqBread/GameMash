import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { cn } from "../lib/cn.js";

export const DecorativeShapes = ({ className, ...props }: Omit<ComponentProps<"div">, "children">) => (
  <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} {...props}>
    <AnswerShape
      shape="triangle"
      size={120}
      className="absolute top-[170px] left-[260px] -rotate-[14deg] text-brand-orange opacity-90"
    />
    <AnswerShape shape="diamond" size={84} className="absolute top-[420px] left-[420px] text-brand-blue opacity-80" />
    <AnswerShape
      shape="circle"
      size={100}
      className="absolute top-[180px] right-[300px] text-brand-yellow opacity-90"
    />
    <AnswerShape
      shape="square"
      size={80}
      className="absolute top-[430px] right-[440px] rotate-[18deg] text-brand-teal opacity-80"
    />
  </div>
);
