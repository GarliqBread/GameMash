import { type ComponentProps, type SyntheticEvent, useState } from "react";
import { cn } from "../lib/cn.js";

export type QuestionImage = {
  id: string;
  url: string;
  alt: string;
};

const MAX_PER_ROW = 4;
const DEFAULT_RATIO = 1;

const rowsOf = (images: QuestionImage[]) => {
  const rowCount = Math.ceil(images.length / MAX_PER_ROW);
  const perRow = Math.ceil(images.length / rowCount);
  return Array.from({ length: rowCount }, (_, index) => images.slice(index * perRow, (index + 1) * perRow));
};

export type QuestionImageGridProps = Omit<ComponentProps<"div">, "children"> & {
  images: QuestionImage[];
};

export const QuestionImageGrid = ({ images, className, ...props }: QuestionImageGridProps) => {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const onLoad = (id: string) => (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0)
      setRatios((current) => ({ ...current, [id]: naturalWidth / naturalHeight }));
  };
  return (
    <div className={cn("flex h-full w-full flex-col gap-6", className)} {...props}>
      {rowsOf(images).map((row) => (
        <ul
          key={row[0]?.id}
          className="flex min-h-0 w-full flex-1 items-center justify-center gap-6 [container-type:size]"
        >
          {row.map((image) => (
            <li
              key={image.id}
              className="min-w-0 shrink grow-0"
              style={{ flexBasis: `calc(${ratios[image.id] ?? DEFAULT_RATIO} * 100cqh)` }}
            >
              <img
                src={image.url}
                alt={image.alt}
                decoding="async"
                onLoad={onLoad(image.id)}
                className="block h-auto w-full rounded-card shadow-card-stage"
              />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
};
