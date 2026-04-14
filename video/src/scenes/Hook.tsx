import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  OffthreadVideo,
  staticFile,
} from "remotion";

// ---------------------------------------------------------------------------
// Scene 1: Hook — 360 frames (12 seconds)
//
// 0-90:    Black screen with faint "TotoFX"
// 91-210:  Full-bleed heart-effect.mp4
// 211-300: Overlay text fades in: "I built this from a single prompt."
// 301-359: Title card — TotoFX + subtitle
// ---------------------------------------------------------------------------

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---- Phase boundaries ----
  const PHASE_DARK_END = 90;
  const PHASE_VIDEO_END = 210;
  const PHASE_OVERLAY_END = 300;
  // 301-359 = title card

  // ---- Phase A: dark screen with faint title (0-90) ----
  const faintPulse =
    frame <= PHASE_DARK_END
      ? interpolate(
          Math.sin(frame * 0.05),
          [-1, 1],
          [0.03, 0.08],
        )
      : 0;

  // ---- Phase C: overlay text spring (211-300) ----
  const overlaySpring =
    frame >= PHASE_VIDEO_END + 1
      ? spring({
          frame: frame - (PHASE_VIDEO_END + 1),
          fps,
          config: { damping: 15, stiffness: 100 },
        })
      : 0;

  // ---- Phase D: title card spring (301-359) ----
  const titleSpring =
    frame >= PHASE_OVERLAY_END + 1
      ? spring({
          frame: frame - (PHASE_OVERLAY_END + 1),
          fps,
          config: { damping: 14, stiffness: 120 },
        })
      : 0;

  // ---- Video asset with fallback ----
  const showVideo = frame > PHASE_DARK_END && frame <= PHASE_OVERLAY_END;
  const showOverlay = frame > PHASE_VIDEO_END && frame <= PHASE_OVERLAY_END;
  const showTitleCard = frame > PHASE_OVERLAY_END;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1a1a2e",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Phase A: Faint TotoFX text */}
      {frame <= PHASE_DARK_END && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#ffffff",
              opacity: faintPulse,
              userSelect: "none",
            }}
          >
            TotoFX
          </div>
        </div>
      )}

      {/* Phase B: Heart effect video */}
      {showVideo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
          }}
        >
          <VideoWithFallback
            src={staticFile("heart-effect.mp4")}
            startFrom={0}
          />
        </div>
      )}

      {/* Phase C: Overlay text */}
      {showOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(26, 26, 46, 0.5)",
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#ffffff",
              opacity: overlaySpring,
              transform: `translateY(${interpolate(overlaySpring, [0, 1], [30, 0])}px)`,
              textAlign: "center",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            I built this from a single prompt.
          </div>
        </div>
      )}

      {/* Phase D: Title card */}
      {showTitleCard && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#ffffff",
              opacity: titleSpring,
              transform: `scale(${interpolate(titleSpring, [0, 1], [0.8, 1])})`,
            }}
          >
            TotoFX
          </div>
          <div
            style={{
              fontSize: 28,
              fontFamily: "Inter, system-ui, sans-serif",
              color: "#888888",
              opacity: titleSpring,
              transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)`,
            }}
          >
            Agent-Native Animation Engine
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Video with fallback — renders a placeholder if the asset is missing
// ---------------------------------------------------------------------------

const VideoWithFallback: React.FC<{
  src: string;
  startFrom?: number;
  style?: React.CSSProperties;
}> = ({ src, startFrom = 0, style }) => {
  // OffthreadVideo will throw during render if the file doesn't exist.
  // We wrap in an error-boundary-style approach: if the file path looks valid
  // we render the video; the Remotion renderer will surface the error at build
  // time if missing. For studio preview, we provide a visual fallback.
  return (
    <ErrorBoundaryFallback
      fallback={
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #1a1a2e, #2d1b4e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#555",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            ...style,
          }}
        >
          [video: {src.split("/").pop()}]
        </div>
      }
    >
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...style,
        }}
      />
    </ErrorBoundaryFallback>
  );
};

// ---------------------------------------------------------------------------
// Minimal error boundary for video fallback
// ---------------------------------------------------------------------------

class ErrorBoundaryFallback extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
