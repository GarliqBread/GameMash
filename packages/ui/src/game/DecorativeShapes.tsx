import type { ComponentProps } from "react";
import { AnswerShape } from "../icons/AnswerShape.js";
import { cn } from "../lib/cn.js";

export const DecorativeShapes = ({ className, ...props }: Omit<ComponentProps<"div">, "children">) => (
  <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} {...props}>
    <AnswerShape
      shape="squircle"
      size={120}
      className="absolute top-[170px] left-[260px] -rotate-[14deg] text-brand-coral opacity-90"
    />
    <AnswerShape
      shape="triangle"
      size={84}
      className="absolute top-[420px] left-[420px] text-brand-violet-light opacity-80"
    />
    <AnswerShape shape="plus" size={100} className="absolute top-[180px] right-[300px] text-brand-lime opacity-90" />
    <AnswerShape
      shape="dome"
      size={80}
      className="absolute top-[430px] right-[440px] rotate-[18deg] text-brand-sky opacity-80"
    />
  </div>
);
