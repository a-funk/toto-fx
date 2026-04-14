import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatioTransition {
  from: number;
  to: number;
  startFrame: number;
  endFrame: number;
}

interface SplitScreenProps {
  ratio?: number;
  ratioTransition?: RatioTransition;
  left: React.ReactNode;
  right: React.ReactNode;
  gap?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SplitScreen: React.FC<SplitScreenProps> = ({
  ratio = 0.5,
  ratioTransition,
  left,
  right,
  gap = 12,
}) => {
  const frame = useCurrentFrame();

  // Resolve effective ratio — transition overrides the static `ratio` prop
  let effectiveRatio = ratio;

  if (ratioTransition) {
    effectiveRatio = interpolate(
      frame,
      [ratioTransition.startFrame, ratioTransition.endFrame],
      [ratioTransition.from, ratioTransition.to],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  }

  const leftPercent = effectiveRatio * 100;
  const rightPercent = (1 - effectiveRatio) * 100;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        gap,
      }}
    >
      {/* Left panel */}
      <div
        style={{
          width: `calc(${leftPercent}% - ${gap / 2}px)`,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {left}
      </div>

      {/* Right panel */}
      <div
        style={{
          width: `calc(${rightPercent}% - ${gap / 2}px)`,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {right}
      </div>
    </div>
  );
};
