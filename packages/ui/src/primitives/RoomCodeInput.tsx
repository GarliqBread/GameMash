import { cva } from "class-variance-authority";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "../lib/cn.js";

const DEFAULT_LENGTH = 4;

const lettersOnly = (raw: string) => raw.toUpperCase().replace(/[^A-Z]/g, "");

const hasError = (error: ReactNode) => error !== undefined && error !== null && error !== false && error !== "";

const boxVariants = cva(
  [
    "focus-ring w-full min-w-0 border-3 border-ink-950 text-center font-display font-extrabold text-ink-950 caret-transparent selection:bg-transparent",
    "transition-[background-color,box-shadow] duration-100 ease-out disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        phone: "h-[70px] rounded-control text-stage-lg",
        desktop: "h-[84px] rounded-field text-stage-xl",
      },
      state: {
        filled: "bg-paper-white",
        current: "bg-sun",
        empty: "border-dashed border-ink-400 bg-cream",
      },
      invalid: {
        true: "border-danger",
        false: "",
      },
    },
    compoundVariants: [
      { size: "phone", state: "filled", className: "shadow-brutal-sm" },
      { size: "desktop", state: "filled", className: "shadow-brutal" },
    ],
  },
);

type BoxState = "filled" | "current" | "empty";

const boxState = (position: number, code: string, focused: number | null): BoxState => {
  if (position === focused) return "current";
  return position < code.length ? "filled" : "empty";
};

const typedLetters = (raw: string, previous: string) => {
  const letters = lettersOnly(raw);
  if (!previous || letters.length !== 2) return letters;
  return letters.startsWith(previous) ? letters.slice(1) : letters.slice(0, 1);
};

export type RoomCodeInputProps = {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  disabled?: boolean | undefined;
  className?: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  letterLabel: (position: number, length: number) => string;
  length?: number | undefined;
  size?: "phone" | "desktop" | undefined;
};

export const RoomCodeInput = ({
  label,
  description,
  error,
  disabled = false,
  className,
  value,
  onValueChange,
  letterLabel,
  length = DEFAULT_LENGTH,
  size = "phone",
}: RoomCodeInputProps) => {
  const id = useId();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const code = lettersOnly(value).slice(0, length);
  const positions = Array.from({ length }, (_, position) => position);
  const nextPosition = Math.min(code.length, length - 1);
  const isInvalid = hasError(error);
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : null, isInvalid ? errorId : null].filter(Boolean).join(" ");

  const focusBox = (position: number) => {
    const target = inputs.current[Math.max(0, Math.min(position, length - 1))];
    target?.focus();
    target?.select();
  };

  const fillFrom = (position: number, letters: string) => {
    if (!letters) return;
    if (letters.length >= length) {
      onValueChange(letters.slice(0, length));
      focusBox(length - 1);
      return;
    }
    const start = Math.min(position, code.length);
    onValueChange((code.slice(0, start) + letters + code.slice(start + letters.length)).slice(0, length));
    focusBox(start + letters.length);
  };

  const handleChange = (position: number) => (event: ChangeEvent<HTMLInputElement>) => {
    fillFrom(position, typedLetters(event.currentTarget.value, code[position] ?? ""));
  };

  const handlePaste = (position: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fillFrom(position, lettersOnly(event.clipboardData.getData("text")));
  };

  const handleKeyDown = (position: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Delete") {
      event.preventDefault();
      onValueChange(code.slice(0, position) + code.slice(position + 1));
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      if (position < code.length) {
        onValueChange(code.slice(0, position) + code.slice(position + 1));
        return;
      }
      if (position > 0) {
        onValueChange(code.slice(0, position - 1));
        focusBox(position - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusBox(position - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusBox(Math.min(position + 1, code.length));
    }
  };

  const handleFocus = (position: number) => {
    setFocused(position);
    inputs.current[position]?.select();
  };

  const handlePointerDown = (position: number) => (event: PointerEvent<HTMLInputElement>) => {
    if (position <= code.length) return;
    event.preventDefault();
    focusBox(code.length);
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label
        id={labelId}
        htmlFor={`${id}-box-${nextPosition}`}
        className="text-body font-bold text-fg workshop:font-pixel workshop:text-label workshop:tracking-pixel"
      >
        {label}
      </label>
      <fieldset
        aria-labelledby={labelId}
        aria-describedby={describedBy || undefined}
        className={cn("m-0 grid min-w-0 border-0 p-0", size === "phone" ? "gap-2.5" : "gap-3")}
        style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      >
        {positions.map((position) => (
          <input
            key={position}
            id={`${id}-box-${position}`}
            ref={(element) => {
              inputs.current[position] = element;
            }}
            value={code[position] ?? ""}
            onChange={handleChange(position)}
            onPaste={handlePaste(position)}
            onKeyDown={handleKeyDown(position)}
            onPointerDown={handlePointerDown(position)}
            onFocus={() => handleFocus(position)}
            onBlur={() => setFocused((current) => (current === position ? null : current))}
            tabIndex={position === nextPosition ? 0 : -1}
            aria-label={letterLabel(position + 1, length)}
            aria-invalid={isInvalid || undefined}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            enterKeyHint={position === length - 1 ? "go" : "next"}
            className={cn(boxVariants({ size, state: boxState(position, code, focused), invalid: isInvalid }))}
          />
        ))}
      </fieldset>
      {description && (
        <span id={descriptionId} className="text-caption text-fg-subtle">
          {description}
        </span>
      )}
      {isInvalid && (
        <span id={errorId} role="alert" className="text-caption font-bold text-danger">
          {error}
        </span>
      )}
    </div>
  );
};
