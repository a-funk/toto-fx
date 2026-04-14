import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerminalLine {
  type: "command" | "output" | "blank";
  text: string;
  delay?: number;
  highlight?: boolean;
}

interface TerminalProps {
  lines: TerminalLine[];
  typingSpeed?: number;
  title?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pre-compute the frame at which each line begins and (for commands) the
 * number of frames the typing animation occupies.
 */
function computeTimeline(
  lines: TerminalLine[],
  typingSpeed: number,
) {
  const timeline: Array<{
    line: TerminalLine;
    startFrame: number;
    typingFrames: number;
  }> = [];
  let cursor = 0;

  for (const line of lines) {
    const delay = line.delay ?? 0;
    const start = cursor + delay;
    const typingFrames =
      line.type === "command"
        ? Math.ceil(line.text.length / typingSpeed)
        : 0;

    timeline.push({ line, startFrame: start, typingFrames });
    cursor = start + typingFrames + (line.type === "output" ? 1 : 0);
  }

  return timeline;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Terminal: React.FC<TerminalProps> = ({
  lines,
  typingSpeed = 3,
  title = "Terminal",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeline = useMemo(
    () => computeTimeline(lines, typingSpeed),
    [lines, typingSpeed],
  );

  // Blink cycle: 530 ms ≈ 16 frames at 30 fps
  const blinkCycleFrames = Math.round(0.53 * fps);
  const cursorVisible =
    Math.floor(frame / blinkCycleFrames) % 2 === 0;

  // Find the index of the last line that has begun — cursor lives there
  let lastActiveIdx = -1;
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (frame >= timeline[i].startFrame) {
      lastActiveIdx = i;
      break;
    }
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        background: "#0d1117",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 16,
        color: "#e0e0e0",
      }}
    >
      {/* ---- Title bar ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 38,
          padding: "0 14px",
          background: "#161b22",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ff5f56",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#ffbd2e",
          }}
        />
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "#27c93f",
          }}
        />
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 13,
            color: "#888888",
            userSelect: "none",
          }}
        >
          {title}
        </div>
        {/* Spacer matching dots width for centering */}
        <div style={{ width: 60 }} />
      </div>

      {/* ---- Scrollable line area ---- */}
      <div
        style={{
          flex: 1,
          padding: "12px 16px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        {timeline.map((entry, idx) => {
          if (frame < entry.startFrame) return null;

          const { line, startFrame, typingFrames } = entry;

          // -- Blank line --
          if (line.type === "blank") {
            return (
              <div key={idx} style={{ height: 24, flexShrink: 0 }} />
            );
          }

          // -- Command line: type char-by-char --
          if (line.type === "command") {
            const elapsed = frame - startFrame;
            const charsVisible = Math.min(
              Math.floor(elapsed * typingSpeed),
              line.text.length,
            );
            const visibleText = line.text.slice(0, charsVisible);
            const isTypingDone = charsVisible >= line.text.length;
            const showCursor =
              idx === lastActiveIdx && cursorVisible;

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  lineHeight: "24px",
                  flexShrink: 0,
                  whiteSpace: "pre",
                }}
              >
                <span style={{ color: "#4ade80", marginRight: 8 }}>
                  $
                </span>
                <span
                  style={{
                    color: line.highlight ? "#ffd700" : "#e0e0e0",
                  }}
                >
                  {visibleText}
                </span>
                {(!isTypingDone || idx === lastActiveIdx) &&
                  showCursor && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 9,
                        height: 18,
                        background: "#e0e0e0",
                        marginLeft: 1,
                        verticalAlign: "middle",
                        transform: "translateY(1px)",
                      }}
                    />
                  )}
              </div>
            );
          }

          // -- Output line: fade in instantly --
          if (line.type === "output") {
            const opacity = interpolate(
              frame - startFrame,
              [0, 3],
              [0, 1],
              { extrapolateRight: "clamp" },
            );
            const fadeSpring = spring({
              frame: frame - startFrame,
              fps,
              config: { damping: 20, mass: 0.5 },
            });

            return (
              <div
                key={idx}
                style={{
                  lineHeight: "24px",
                  flexShrink: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  opacity: fadeSpring,
                  transform: `translateY(${interpolate(fadeSpring, [0, 1], [6, 0])}px)`,
                  color: line.highlight ? "#ffd700" : "#e0e0e0",
                }}
              >
                {line.text}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
