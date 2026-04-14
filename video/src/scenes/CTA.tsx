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
// Scene 6: CTA — 450 frames (15 seconds)
//
// Dark background with optional dotgrid-idle.mp4 behind.
// Text elements spring in with staggered timing:
//   Frame 0:   "TotoFX" — 96px bold white
//   Frame 60:  npm install toto-fx — 36px mono, #88aaff
//   Frame 120: "Or just tell your AI to do it." — 28px italic, #aaa
//   Frame 210: github.com/a-funk/toto-fx — 24px, #6a9eff
// ---------------------------------------------------------------------------

const SPRING_CONFIG = { damping: 15, stiffness: 100 };

interface CTAItem {
  text: string;
  startFrame: number;
  fontSize: number;
  color: string;
  fontWeight?: number;
  fontStyle?: string;
  fontFamily?: string;
  background?: string;
  padding?: string;
  borderRadius?: number;
}

const CTA_ITEMS: CTAItem[] = [
  {
    text: "TotoFX",
    startFrame: 0,
    fontSize: 96,
    color: "#ffffff",
    fontWeight: 700,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  {
    text: "npm install toto-fx",
    startFrame: 60,
    fontSize: 36,
    color: "#88aaff",
    fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(136, 170, 255, 0.08)",
    padding: "8px 24px",
    borderRadius: 8,
  },
  {
    text: "Or just tell your AI to do it.",
    startFrame: 120,
    fontSize: 28,
    color: "#aaaaaa",
    fontStyle: "italic",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  {
    text: "github.com/a-funk/toto-fx",
    startFrame: 210,
    fontSize: 24,
    color: "#6a9eff",
    fontFamily: "'JetBrains Mono', monospace",
  },
];

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#1a1a2e",
      }}
    >
      {/* Background video (optional — falls back to solid color) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15,
        }}
      >
        <VideoWithFallback
          src={staticFile("dotgrid-idle.mp4")}
          startFrom={0}
        />
      </div>

      {/* CTA content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          zIndex: 1,
        }}
      >
        {CTA_ITEMS.map((item, idx) => {
          const s = spring({
            frame: Math.max(0, frame - item.startFrame),
            fps,
            config: SPRING_CONFIG,
          });

          // Only animate once the start frame is reached
          const active = frame >= item.startFrame;
          const opacity = active ? s : 0;
          const translateY = active
            ? interpolate(s, [0, 1], [40, 0])
            : 40;

          return (
            <div
              key={idx}
              style={{
                fontSize: item.fontSize,
                color: item.color,
                fontWeight: item.fontWeight ?? 400,
                fontStyle: item.fontStyle ?? "normal",
                fontFamily: item.fontFamily ?? "Inter, system-ui, sans-serif",
                opacity,
                transform: `translateY(${translateY}px)`,
                background: item.background ?? "transparent",
                padding: item.padding ?? "0",
                borderRadius: item.borderRadius ?? 0,
                textAlign: "center",
                userSelect: "none",
              }}
            >
              {item.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Video with fallback
// ---------------------------------------------------------------------------

const VideoWithFallback: React.FC<{
  src: string;
  startFrom?: number;
}> = ({ src, startFrom = 0 }) => {
  return (
    <ErrorBoundaryFallback
      fallback={
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#1a1a2e",
          }}
        />
      }
    >
      <OffthreadVideo
        src={src}
        startFrom={startFrom}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </ErrorBoundaryFallback>
  );
};

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
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
