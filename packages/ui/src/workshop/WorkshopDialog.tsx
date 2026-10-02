import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode, RefObject } from "react";
import { CloseIcon } from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { dialogBackdropClassName, dialogPopupClassName, dialogTitleClassName, keyButtonClassName } from "./styles.js";

export type WorkshopDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  finalFocus?: RefObject<HTMLElement | null> | undefined;
};

export const WorkshopDialog = ({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
  finalFocus,
}: WorkshopDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className={dialogBackdropClassName} />
      <Dialog.Popup
        data-theme="workshop"
        finalFocus={finalFocus}
        className={cn(dialogPopupClassName, "max-h-[92dvh] w-[min(92vw,680px)] flex-col gap-5")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Dialog.Title className={dialogTitleClassName}>{title}</Dialog.Title>
            {description && <Dialog.Description className="text-body text-fg-muted">{description}</Dialog.Description>}
          </div>
          <Dialog.Close aria-label={closeLabel} className={cn(keyButtonClassName({ size: "square" }), "shrink-0")}>
            <CloseIcon size={20} strokeWidth={2.4} />
          </Dialog.Close>
        </div>
        <div className="-mx-2 -mt-1 flex min-h-0 flex-col gap-5 overflow-y-auto px-2 pt-1 pb-2">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3">{footer}</div>}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
);
