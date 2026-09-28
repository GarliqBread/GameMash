import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode, RefObject } from "react";
import { cn } from "../lib/cn.js";
import { keyButtonClassName } from "./KeyButton.js";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  onConfirm: () => void;
  finalFocus?: RefObject<HTMLElement | null> | undefined;
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  finalFocus,
}: ConfirmDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 bg-ink-950/40" />
      <AlertDialog.Popup
        data-theme="workshop"
        finalFocus={finalFocus}
        className="fixed top-1/2 left-1/2 flex w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-card border-3 border-ink-950 bg-paper-white p-6 text-ink-950 shadow-brutal-xl"
      >
        <AlertDialog.Title className="font-display text-2xl font-extrabold">{title}</AlertDialog.Title>
        {description && (
          <AlertDialog.Description className="text-body text-fg-muted">{description}</AlertDialog.Description>
        )}
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <AlertDialog.Close className={cn(keyButtonClassName, "h-12 px-5 text-base")}>{cancelLabel}</AlertDialog.Close>
          <AlertDialog.Close
            onClick={onConfirm}
            className={cn(keyButtonClassName, "h-12 px-5 text-base workshop:bg-brand-coral")}
          >
            {confirmLabel}
          </AlertDialog.Close>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
