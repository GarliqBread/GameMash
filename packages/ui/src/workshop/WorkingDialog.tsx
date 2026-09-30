import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { dialogBackdropClassName, dialogPopupClassName, dialogTitleClassName } from "./dialog.js";

export type WorkingDialogProps = {
  open: boolean;
  title: ReactNode;
};

export const WorkingDialog = ({ open, title }: WorkingDialogProps) => (
  <AlertDialog.Root open={open}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className={dialogBackdropClassName} />
      <AlertDialog.Popup data-theme="workshop" className={cn(dialogPopupClassName, "items-center gap-4")}>
        <span
          aria-hidden="true"
          className="size-7 shrink-0 rounded-full border-4 border-ink-950 border-t-sun motion-safe:animate-spin"
        />
        <AlertDialog.Title className={dialogTitleClassName}>{title}</AlertDialog.Title>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
);
