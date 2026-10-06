import type { QuizProof } from "@gamemash/games/config";
import { formatClock } from "@gamemash/shared";
import { cn, PhoneIcon, StagePanel, Sticker } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ProofVideo } from "./ProofVideo";
import { useRevealVideo } from "./proof-media";

export type NextTarget = "question" | "game" | "final";

type MediaProps = {
  proof: QuizProof;
  autoNext: boolean;
  urlOf: (id: string) => string | undefined;
  onVideoEnded: () => void;
};

const STICKER = "border-3 px-3.5 py-1.5 text-title-sm shadow-brutal-sm";

export const isPlayedVideo = (proof: QuizProof | null) => proof?.kind === "video" && !proof.loop;

const ProofSticker = ({ className }: { className?: string }) => (
  <Sticker tone="sun" rotate={-3} aria-hidden="true" className={cn(STICKER, className)}>
    <FormattedMessage id="quiz.proof" />
  </Sticker>
);

const VideoLine = ({ proof }: { proof: QuizProof }) =>
  proof.kind === "video" && (
    <span className="text-stage-caption text-fg-subtle">
      <FormattedMessage
        id="quiz.proofVideoKind"
        values={{ duration: formatClock(proof.durationMs), sound: proof.sound ? "on" : "off" }}
      />
    </span>
  );

const ProofMedia = ({ proof, urlOf, onVideoEnded }: Omit<MediaProps, "autoNext">) => {
  const intl = useIntl();
  const videoAssetId = proof.kind === "video" ? proof.assetId : undefined;
  const videoUrl = useRevealVideo(videoAssetId, videoAssetId && urlOf(videoAssetId));
  if (proof.kind === "video") {
    return (
      <ProofVideo
        src={videoUrl}
        poster={urlOf(proof.posterAssetId)}
        label={proof.caption || intl.formatMessage({ id: "quiz.proofVideo" })}
        sound={proof.sound}
        loop={proof.loop}
        onEnded={onVideoEnded}
      />
    );
  }
  return (
    <div className={cn("grid size-full", proof.photos.length > 1 && "grid-cols-2 gap-1 bg-cream")}>
      {proof.photos.map((photo) => (
        <img
          key={photo.assetId}
          src={urlOf(photo.assetId)}
          alt={photo.alt}
          className="size-full min-h-0 min-w-0 bg-ink-950 object-cover"
        />
      ))}
    </div>
  );
};

export const ScoresNote = ({
  proof,
  target,
  autoNext,
}: {
  proof: QuizProof;
  target: NextTarget;
  autoNext: boolean;
}) => (
  <p className="flex items-center gap-3.5 text-stage-caption text-fg-muted">
    <PhoneIcon size={30} className="shrink-0 text-sun" />
    {autoNext && isPlayedVideo(proof) ? (
      <FormattedMessage id="quiz.proofScoresAfterVideo" values={{ target }} />
    ) : (
      <FormattedMessage id="quiz.proofScoresOnPhones" />
    )}
  </p>
);

export type StageProofProps = MediaProps & { target: NextTarget; className?: string | undefined };

export const ProofPanel = ({ proof, urlOf, onVideoEnded, target, autoNext, className }: StageProofProps) => {
  const intl = useIntl();
  return (
    <StagePanel
      aria-label={intl.formatMessage({ id: "quiz.proof" })}
      className={cn("gap-4.5 px-7.5 pt-7 pb-6.5", className)}
    >
      <div className="flex items-center justify-between gap-4">
        <ProofSticker />
        <VideoLine proof={proof} />
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-tile border-4 border-cream bg-ink-950">
        <ProofMedia proof={proof} urlOf={urlOf} onVideoEnded={onVideoEnded} />
      </div>
      {proof.caption && (
        <p className="font-display text-stage-lg font-bold hyphens-auto wrap-break-word">{proof.caption}</p>
      )}
      <ScoresNote proof={proof} target={target} autoNext={autoNext} />
    </StagePanel>
  );
};

export const ProofFigure = ({ proof, urlOf, onVideoEnded, className }: StageProofProps) => {
  const isVideo = proof.kind === "video";
  return (
    <figure
      className={cn("relative m-0 min-w-0 overflow-hidden rounded-panel border-5 border-cream bg-ink-950", className)}
    >
      <ProofMedia proof={proof} urlOf={urlOf} onVideoEnded={onVideoEnded} />
      {(proof.caption || isVideo) && (
        <Caption isVideo={isVideo}>
          {proof.caption && (
            <span className="font-display text-stage-xl font-extrabold hyphens-auto wrap-break-word">
              {proof.caption}
            </span>
          )}
          <VideoLine proof={proof} />
        </Caption>
      )}
      <div className="absolute top-7 left-7 z-10">
        <ProofSticker />
      </div>
    </figure>
  );
};

const Caption = ({ isVideo, children }: { isVideo: boolean; children: ReactNode }) =>
  isVideo ? (
    <figcaption className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-2 bg-linear-to-b from-ink-950/90 to-ink-950/0 px-10 pt-24 pb-20">
      {children}
    </figcaption>
  ) : (
    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-linear-to-b from-ink-950/0 to-ink-950/90 px-10 pt-22.5 pb-8.5">
      {children}
    </figcaption>
  );
