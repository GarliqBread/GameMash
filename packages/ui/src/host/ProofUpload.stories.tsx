import { useEffect, useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { SAMPLE_QUESTION_IMAGES } from "../../.ladle/screen-data";
import { Caption, ThemeMatrix } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { ProofUpload, type ProofUploadState } from "./ProofUpload";

export default { title: "Workshop / Proof upload" } satisfies StoryDefault;

const FILLED_WIDTH = "w-62";
const OPEN_WIDTH = "w-130";

const useStates = (): [string, ProofUploadState][] => {
  const t = useCopy();
  return [
    ["1 Empty", { status: "empty" }],
    [
      "2 Making it smaller",
      {
        status: "compressing",
        isVideo: true,
        fileName: "kitchen-cam.mov",
        details: t("1:42 · 186 MB · 2160p"),
        progress: 0.48,
        progressLabel: t("Making it smaller"),
        progressText: t("48% done"),
      },
    ],
    [
      "3 Photo added",
      {
        status: "photo",
        photos: [
          { id: "p1", src: SAMPLE_QUESTION_IMAGES[0]?.url, alt: t("Saturn with its rings against black space") },
        ],
        canAddPhoto: true,
        note: t("Caption and alt text added"),
      },
    ],
    [
      "3b Two photos",
      {
        status: "photo",
        photos: [
          { id: "p1", src: SAMPLE_QUESTION_IMAGES[0]?.url, alt: t("Saturn") },
          { id: "p2", src: SAMPLE_QUESTION_IMAGES[2]?.url, alt: t("Jupiter") },
        ],
        canAddPhoto: false,
      },
    ],
    [
      "4 Video added",
      {
        status: "video",
        posterSrc: SAMPLE_QUESTION_IMAGES[3]?.url,
        duration: "1:42",
        note: t("Made smaller: 186 MB → 21 MB · 720p"),
        sound: true,
      },
    ],
    [
      "5 Can't read it",
      {
        status: "error",
        message: t("We couldn't read this file. Try an MP4 or MOV video, or a JPG or PNG photo"),
        retryLabel: t("Choose another"),
        dismissLabel: t("Keep the current proof"),
      },
    ],
  ];
};

const useLabels = () => {
  const t = useCopy();
  return {
    accept: "image/*,video/*",
    photoAccept: "image/*",
    dropLabel: t("Drop a photo or video"),
    chooseLabel: t("Choose a file"),
    formatsLabel: t("JPG, PNG, WebP, GIF, MP4, MOV, WebM · video up to 2 min"),
    cancelLabel: t("Cancel"),
    replaceLabel: t("Replace"),
    removeLabel: t("Remove proof"),
    removePhotoLabel: (position: number) => `${t("Remove photo")} ${position}`,
    addPhotoLabel: t("Add a second photo"),
    photoLabel: t("Photo"),
    videoLabel: t("Video"),
    soundLabel: t("Sound"),
  };
};

const isFilled = (state: ProofUploadState) => state.status === "photo" || state.status === "video";

const withoutPhoto = (state: ProofUploadState, position: number): ProofUploadState => {
  if (state.status !== "photo") return { status: "empty" };
  const photos = state.photos.filter((_, index) => index !== position - 1);
  return photos.length > 0 ? { ...state, photos, canAddPhoto: true } : { status: "empty" };
};

const withPhoto = (state: ProofUploadState, file: File): ProofUploadState =>
  state.status === "photo"
    ? {
        ...state,
        photos: [...state.photos, { id: file.name, src: URL.createObjectURL(file), alt: file.name }],
        canAddPhoto: false,
      }
    : state;

const StateCase = ({ label, initial }: { label: string; initial: ProofUploadState }) => {
  const labels = useLabels();
  const [state, setState] = useState(initial);
  useEffect(() => setState(initial), [initial]);
  return (
    <div className="flex flex-col gap-3">
      <Caption>{label}</Caption>
      <ProofUpload
        {...labels}
        state={state}
        className={isFilled(state) ? FILLED_WIDTH : OPEN_WIDTH}
        onFileSelect={() => {}}
        onAddPhoto={(file) => setState((current) => withPhoto(current, file))}
        onCancel={() => setState({ status: "empty" })}
        onRemove={() => setState({ status: "empty" })}
        onRemovePhoto={(position) => setState((current) => withoutPhoto(current, position))}
        onDismiss={() => setState({ status: "empty" })}
        onSoundChange={(sound) => setState((current) => (current.status === "video" ? { ...current, sound } : current))}
      />
    </div>
  );
};

export const States: Story = () => {
  const states = useStates();
  return (
    <ThemeMatrix themes={["workshop"]}>
      {() => (
        <div className="flex flex-wrap items-start gap-7">
          {states.map(([label, state]) => (
            <StateCase key={label} label={label} initial={state} />
          ))}
        </div>
      )}
    </ThemeMatrix>
  );
};
