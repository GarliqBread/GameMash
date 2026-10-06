import { Button as BaseButton } from "@base-ui/react/button";
import {
  type ChangeEvent,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  ImageIcon,
  PlayIcon,
  TrashIcon,
  UploadIcon,
  VideoIcon,
} from "../icons/icons.js";
import { cn } from "../lib/cn.js";
import { Switch } from "../primitives/Switch.js";
import { KeyButton } from "../workshop/KeyButton.js";
import { Sticker } from "../workshop/Sticker.js";
import { keyButtonClassName } from "../workshop/styles.js";

export type ProofPhotoThumbnail = { id: string; src: string | undefined; alt: string };

export type ProofUploadState =
  | { status: "empty" }
  | {
      status: "compressing";
      isVideo: boolean;
      fileName: string;
      details: string;
      progress: number;
      progressLabel: string;
      progressText: string;
    }
  | { status: "photo"; photos: ProofPhotoThumbnail[]; canAddPhoto: boolean; note?: ReactNode }
  | {
      status: "video";
      posterSrc: string | undefined;
      duration: string;
      note?: ReactNode;
      sound: boolean;
    }
  | {
      status: "error";
      message: ReactNode;
      retryLabel: string;
      dismissLabel: string;
      retryAddsPhoto?: boolean | undefined;
    };

type ProofUploadLabels = {
  dropLabel: string;
  chooseLabel: string;
  formatsLabel: string;
  cancelLabel: string;
  replaceLabel: string;
  removeLabel: string;
  removePhotoLabel: (position: number) => string;
  addPhotoLabel: string;
  photoLabel: string;
  videoLabel: string;
  soundLabel: string;
};

export type ProofUploadProps = Omit<ComponentProps<"div">, "children" | "onDrop"> &
  ProofUploadLabels & {
    state: ProofUploadState;
    accept: string;
    photoAccept: string;
    onFileSelect: (file: File) => void;
    onAddPhoto: (file: File) => void;
    onCancel: () => void;
    onRemove: () => void;
    onRemovePhoto: (position: number) => void;
    onDismiss: () => void;
    onSoundChange: (sound: boolean) => void;
  };

const CARD = "flex min-h-39 flex-col rounded-card border-3 border-ink-950 text-ink-950";
const PIXEL = "font-pixel tracking-pixel text-label-sm font-bold";
const FOCUSABLE = "button:not([disabled]), [role=switch]";
const PREVIEW = "relative h-39 shrink-0 overflow-hidden rounded-control border-3 border-ink-950 bg-ink-900";
const OVERLAY_BUTTON = cn(
  "focus-ring flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-control border-2 border-ink-950 bg-paper-white px-3",
  "text-note font-bold text-ink-950 shadow-brutal-xs not-data-[disabled]:hover:bg-sun",
);

const firstFile = (files: FileList | null | undefined) => files?.[0];

const useFilePicker = (onFileSelect: (file: File) => void) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = () => inputRef.current?.click();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = firstFile(event.target.files);
    if (file) onFileSelect(file);
    event.target.value = "";
  };
  return { inputRef, open, onChange };
};

const useFocusAfterChange = (stateKey: string) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasFocus = useRef(false);
  const lastStateKey = useRef(stateKey);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onFocusIn = () => {
      hasFocus.current = true;
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !root.contains(event.relatedTarget)) hasFocus.current = false;
    };
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (lastStateKey.current === stateKey) return;
    lastStateKey.current = stateKey;
    if (!root || !hasFocus.current || root.contains(document.activeElement)) return;
    root.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }, [stateKey]);

  return rootRef;
};

type DropzoneProps = Pick<ProofUploadLabels, "dropLabel" | "chooseLabel" | "formatsLabel"> & {
  onPick: () => void;
  onFileSelect: (file: File) => void;
};

const Dropzone = ({ onPick, onFileSelect, dropLabel, chooseLabel, formatsLabel }: DropzoneProps) => {
  const [isOver, setIsOver] = useState(false);
  const handleDrag = (event: DragEvent<HTMLButtonElement>, over: boolean) => {
    event.preventDefault();
    setIsOver(over);
  };
  const handleLeave = (event: DragEvent<HTMLButtonElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setIsOver(false);
  };
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    handleDrag(event, false);
    const file = firstFile(event.dataTransfer.files);
    if (file) onFileSelect(file);
  };
  return (
    <BaseButton
      onClick={onPick}
      onDragOver={(event) => handleDrag(event, true)}
      onDragLeave={handleLeave}
      onDrop={handleDrop}
      data-over={isOver ? "" : undefined}
      className={cn(
        CARD,
        "focus-ring cursor-pointer items-center justify-center gap-3 border-dashed bg-cream p-5 text-center",
        "transition-colors duration-100 hover:bg-sand-100 data-[over]:bg-sun/30",
      )}
    >
      <UploadIcon size={44} strokeWidth={2.2} />
      <span className="font-display text-title-sm font-extrabold">{dropLabel}</span>
      <span className={cn(keyButtonClassName({ size: "sm" }), "pointer-events-none workshop:bg-sun")}>
        {chooseLabel}
      </span>
      <span className={cn(PIXEL, "font-normal text-ink-500")}>{formatsLabel}</span>
    </BaseButton>
  );
};

const Compressing = ({
  state,
  cancelLabel,
  onCancel,
}: {
  state: Extract<ProofUploadState, { status: "compressing" }>;
  cancelLabel: string;
  onCancel: () => void;
}) => {
  const percent = Math.round(Math.min(1, Math.max(0, state.progress)) * 100);
  const KindIcon = state.isVideo ? VideoIcon : ImageIcon;
  return (
    <div className={cn(CARD, "justify-center gap-3.5 bg-paper-white p-5")}>
      <span className="flex min-w-0 items-center gap-2.5 text-body font-bold">
        <KindIcon size={24} className="shrink-0" />
        <span className="truncate">{state.fileName}</span>
      </span>
      <span className={cn(PIXEL, "font-normal text-ink-500")}>{state.details}</span>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={state.progressText}
        aria-label={state.progressLabel}
        className="h-5.5 overflow-hidden rounded-key border-3 border-ink-950 bg-cream"
      >
        <div
          className="h-full origin-left bg-brand-sky motion-safe:transition-transform"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={PIXEL} aria-hidden="true">
          {state.progressText}
        </span>
        <KeyButton size="sm" onClick={onCancel}>
          {cancelLabel}
        </KeyButton>
      </div>
    </div>
  );
};

const Badge = ({ children }: { children: string }) => (
  <Sticker aria-hidden="true" className="absolute top-2 left-2 px-1.5 py-0.5 shadow-none">
    {children}
  </Sticker>
);

const Preview = ({
  src,
  alt,
  badge,
  children,
}: {
  src: string | undefined;
  alt: string;
  badge: string;
  children?: ReactNode;
}) => (
  <div className={PREVIEW}>
    {src && <img src={src} alt={alt} className="size-full object-cover" />}
    <Badge>{badge}</Badge>
    {children}
  </div>
);

const PhotoPair = ({
  photos,
  badge,
  onRemove,
  removePhotoLabel,
}: {
  photos: ProofPhotoThumbnail[];
  badge: string;
  onRemove: (position: number) => void;
  removePhotoLabel: (position: number) => string;
}) => (
  <div className={PREVIEW}>
    <ul className="grid size-full grid-cols-2">
      {photos.map((photo, index) => (
        <li key={photo.id} className="relative min-w-0 not-first:border-l-3 not-first:border-ink-950">
          {photo.src && <img src={photo.src} alt={photo.alt} className="size-full object-cover" />}
          <BaseButton
            onClick={() => onRemove(index + 1)}
            aria-label={removePhotoLabel(index + 1)}
            className={cn(OVERLAY_BUTTON, "absolute top-1.5 right-1.5 w-9 px-0")}
          >
            <TrashIcon size={16} strokeWidth={2.2} />
          </BaseButton>
        </li>
      ))}
    </ul>
    <Badge>{badge}</Badge>
  </div>
);

const Note = ({ children }: { children: ReactNode }) => (
  <span className="flex items-center gap-1.5 text-note font-bold">
    <CheckIcon size={16} strokeWidth={3} className="shrink-0" />
    {children}
  </span>
);

type MediaProps = {
  state: Extract<ProofUploadState, { status: "photo" | "video" }>;
  labels: Pick<
    ProofUploadLabels,
    "photoLabel" | "videoLabel" | "soundLabel" | "replaceLabel" | "removeLabel" | "addPhotoLabel" | "removePhotoLabel"
  >;
  onReplace: () => void;
  onAddPhoto: () => void;
  onRemove: () => void;
  onRemovePhoto: (position: number) => void;
  onSoundChange: (sound: boolean) => void;
};

const Media = ({ state, labels, onReplace, onAddPhoto, onRemove, onRemovePhoto, onSoundChange }: MediaProps) => {
  const isPair = state.status === "photo" && state.photos.length > 1;
  const single = state.status === "photo" ? state.photos[0] : undefined;
  const actions = !isPair && (
    <div className="absolute right-2 bottom-2 flex gap-1.5">
      <BaseButton onClick={onReplace} className={OVERLAY_BUTTON}>
        {labels.replaceLabel}
      </BaseButton>
      <BaseButton onClick={onRemove} aria-label={labels.removeLabel} className={cn(OVERLAY_BUTTON, "w-9 px-0")}>
        <CloseIcon size={16} strokeWidth={2.6} />
      </BaseButton>
    </div>
  );
  return (
    <div className="flex flex-col gap-2.5">
      {state.status === "video" ? (
        <Preview src={state.posterSrc} alt="" badge={labels.videoLabel}>
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 flex size-11 -translate-1/2 items-center justify-center rounded-full border-3 border-ink-950 bg-sun"
          >
            <PlayIcon size={18} className="translate-x-px" />
          </span>
          <span className="absolute bottom-2 left-2 rounded-sticker bg-ink-950 px-2 py-0.5 font-display text-note font-extrabold text-cream">
            {state.duration}
          </span>
          {actions}
        </Preview>
      ) : isPair ? (
        <PhotoPair
          photos={state.photos}
          badge={labels.photoLabel}
          onRemove={onRemovePhoto}
          removePhotoLabel={labels.removePhotoLabel}
        />
      ) : (
        <Preview src={single?.src} alt={single?.alt ?? ""} badge={labels.photoLabel}>
          {actions}
        </Preview>
      )}
      {state.note && <Note>{state.note}</Note>}
      {state.status === "video" && (
        <Switch
          aria-label={labels.soundLabel}
          checked={state.sound}
          onCheckedChange={onSoundChange}
          onLabel={labels.soundLabel}
          offLabel={labels.soundLabel}
          className="self-start"
        />
      )}
      {state.status === "photo" && state.canAddPhoto && (
        <KeyButton size="sm" onClick={onAddPhoto} className="self-start">
          {labels.addPhotoLabel}
        </KeyButton>
      )}
    </div>
  );
};

const ErrorCard = ({
  state,
  onRetry,
  onDismiss,
}: {
  state: Extract<ProofUploadState, { status: "error" }>;
  onRetry: () => void;
  onDismiss: () => void;
}) => (
  <div className={cn(CARD, "justify-center gap-3 bg-brand-coral/20 p-5")}>
    <AlertIcon size={40} className="fill-brand-coral" />
    <p role="alert" className="font-display text-title-sm/tight font-extrabold">
      {state.message}
    </p>
    <div className="flex flex-wrap gap-2.5">
      <KeyButton size="sm" onClick={onRetry} className="workshop:bg-sun">
        {state.retryLabel}
      </KeyButton>
      <KeyButton size="sm" onClick={onDismiss}>
        {state.dismissLabel}
      </KeyButton>
    </div>
  </div>
);

const stateKeyOf = (state: ProofUploadState) => `${state.status}-${state.status === "photo" ? state.photos.length : 0}`;

export const ProofUpload = ({
  state,
  accept,
  photoAccept,
  onFileSelect,
  onAddPhoto,
  onCancel,
  onRemove,
  onRemovePhoto,
  onDismiss,
  onSoundChange,
  dropLabel,
  chooseLabel,
  formatsLabel,
  cancelLabel,
  replaceLabel,
  removeLabel,
  removePhotoLabel,
  addPhotoLabel,
  photoLabel,
  videoLabel,
  soundLabel,
  className,
  ...props
}: ProofUploadProps) => {
  const picker = useFilePicker(onFileSelect);
  const addPicker = useFilePicker(onAddPhoto);
  const rootRef = useFocusAfterChange(stateKeyOf(state));
  const labels = { photoLabel, videoLabel, soundLabel, replaceLabel, removeLabel, addPhotoLabel, removePhotoLabel };

  return (
    <div ref={rootRef} className={cn("flex flex-col", className)} {...props}>
      {state.status === "empty" && (
        <Dropzone
          onPick={picker.open}
          onFileSelect={onFileSelect}
          dropLabel={dropLabel}
          chooseLabel={chooseLabel}
          formatsLabel={formatsLabel}
        />
      )}
      {state.status === "compressing" && <Compressing state={state} cancelLabel={cancelLabel} onCancel={onCancel} />}
      {(state.status === "photo" || state.status === "video") && (
        <Media
          state={state}
          labels={labels}
          onReplace={picker.open}
          onAddPhoto={addPicker.open}
          onRemove={onRemove}
          onRemovePhoto={onRemovePhoto}
          onSoundChange={onSoundChange}
        />
      )}
      {state.status === "error" && (
        <ErrorCard state={state} onRetry={state.retryAddsPhoto ? addPicker.open : picker.open} onDismiss={onDismiss} />
      )}
      <input
        ref={picker.inputRef}
        type="file"
        accept={accept}
        tabIndex={-1}
        aria-hidden="true"
        onChange={picker.onChange}
        className="sr-only"
      />
      <input
        ref={addPicker.inputRef}
        type="file"
        accept={photoAccept}
        tabIndex={-1}
        aria-hidden="true"
        onChange={addPicker.onChange}
        className="sr-only"
      />
    </div>
  );
};
