import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypingTextProps {
  text: string;
  fontSize?: number;
  color?: string;
  style?: "bold" | "italic" | "mono" | "normal";
  enterFrom?: "bottom" | "fade" | "left";
  delay?: number;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function fontStyleFor(style: TypingTextProps["style"]): React.CSSProperties {
  switch (style) {
    case "bold":
      return { fontWeight: 700 };
    case "italic":
      return { fontStyle: "italic" };
    case "mono":
      return { fontFamily: "'JetBrains Mono', monospace" };
    case "normal":
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TypingText: React.FC<TypingTextProps> = ({
  text,
  fontSize = 48,
  color = "#e0e0e0",
  style = "normal",
  enterFrom = "bottom",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const progress = spring({
    frame: delayedFrame,
    fps,
    config: { damping: 12 },
  });

  // Build transform + opacity based on enterFrom
  let transform = "none";
  let opacity = frame < delay ? 0 : progress;

  switch (enterFrom) {
    case "bottom": {
      const translateY = interpolate(progress, [0, 1], [30, 0]);
      transform = `translateY(${translateY}px)`;
      break;
    }
    case "left": {
      const translateX = interpolate(progress, [0, 1], [-40, 0]);
      transform = `translateX(${translateX}px)`;
      break;
    }
    case "fade":
    default:
      // opacity-only, already handled
      break;
  }

  return (
    <div
      style={{
        fontSize,
        color,
        opacity,
        transform,
        fontFamily: "Inter, system-ui, sans-serif",
        lineHeight: 1.3,
        ...fontStyleFor(style),
      }}
    >
      {text}
    </div>
  );
};
