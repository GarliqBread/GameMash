import { formatClock, MS_PER_SECOND } from "@gamemash/shared";
import { Button, cn, IconButton, PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from "@gamemash/ui";
import { useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";

export type ProofVideoProps = {
  src: string | undefined;
  poster: string | undefined;
  label: string;
  sound: boolean;
  loop: boolean;
  onEnded: () => void;
  className?: string | undefined;
};

const ICON_SIZE = 30;

const isAutoplayBlocked = (error: unknown) => error instanceof DOMException && error.name === "NotAllowedError";

const usePlayback = (sound: boolean, onUnplayable: () => void) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(!sound);
  const [needsTap, setNeedsTap] = useState(false);
  const [timeMs, setTimeMs] = useState({ current: 0, total: 0 });

  const onUnplayableRef = useRef(onUnplayable);
  onUnplayableRef.current = onUnplayable;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !sound;
    video.play().catch((error: unknown) => {
      if (!isAutoplayBlocked(error) || !sound) {
        if (isAutoplayBlocked(error)) onUnplayableRef.current();
        return;
      }
      video.muted = true;
      setIsMuted(true);
      setNeedsTap(true);
      video.play().catch(() => onUnplayableRef.current());
    });
  }, [sound]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  };

  const setMuted = (muted: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    setIsMuted(muted);
    setNeedsTap(false);
    if (!muted && video.paused) void video.play().catch(() => {});
  };

  const onTime = () => {
    const video = videoRef.current;
    if (!video) return;
    const total = Number.isFinite(video.duration) ? video.duration * MS_PER_SECOND : 0;
    setTimeMs({ current: video.currentTime * MS_PER_SECOND, total });
  };

  return { videoRef, isPlaying, setIsPlaying, isMuted, setMuted, needsTap, timeMs, toggle, onTime };
};

export const ProofVideo = ({ src, poster, label, sound, loop, onEnded, className }: ProofVideoProps) => {
  const intl = useIntl();
  const playback = usePlayback(sound, onEnded);
  const share = playback.timeMs.total > 0 ? playback.timeMs.current / playback.timeMs.total : 0;
  const text = (id: string, values?: Record<string, string>) => intl.formatMessage({ id }, values);

  return (
    <div className={cn("relative size-full bg-ink-950", className)}>
      <video
        ref={playback.videoRef}
        src={src}
        poster={poster}
        aria-label={label}
        loop={loop}
        playsInline
        preload="auto"
        muted={playback.isMuted}
        onPlay={() => playback.setIsPlaying(true)}
        onPause={() => playback.setIsPlaying(false)}
        onTimeUpdate={playback.onTime}
        onLoadedMetadata={playback.onTime}
        onError={onEnded}
        onEnded={() => {
          playback.setIsPlaying(false);
          onEnded();
        }}
        className="size-full object-cover"
      />
      {playback.needsTap && (
        <Button
          size="stage"
          icon={<SoundOnIcon size={40} />}
          onClick={() => playback.setMuted(false)}
          className="absolute top-1/2 left-1/2 z-10 -translate-1/2"
        >
          {text("quiz.tapForSound")}
        </Button>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-4.5 bg-ink-950/80 px-5.5 py-4 text-cream">
        <IconButton
          size="md"
          onClick={playback.toggle}
          label={text(playback.isPlaying ? "quiz.pauseVideo" : "quiz.playVideo")}
          className="text-cream"
        >
          {playback.isPlaying ? <PauseIcon size={ICON_SIZE} /> : <PlayIcon size={ICON_SIZE} />}
        </IconButton>
        <span
          role="progressbar"
          aria-label={text("quiz.videoProgress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="flex h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-700"
        >
          <span className="h-full rounded-full bg-sun" style={{ width: `${share * 100}%` }} />
        </span>
        <span className="shrink-0 font-display text-stage-caption font-extrabold tabular-nums">
          {text("quiz.videoTime", {
            current: formatClock(playback.timeMs.current),
            total: formatClock(playback.timeMs.total),
          })}
        </span>
        <IconButton
          size="md"
          onClick={() => playback.setMuted(!playback.isMuted)}
          label={text(playback.isMuted ? "quiz.soundOn" : "quiz.soundOff")}
          className="text-cream"
        >
          {playback.isMuted ? <SoundOffIcon size={ICON_SIZE} /> : <SoundOnIcon size={ICON_SIZE} />}
        </IconButton>
      </div>
    </div>
  );
};
