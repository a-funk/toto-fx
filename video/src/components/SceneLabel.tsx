import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SceneLabelProps {
  label: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SceneLabel: React.FC<SceneLabelProps> = ({ label }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        right: 32,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        color: "#888888",
        opacity,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        userSelect: "none",
      }}
    >
      {label}
    </div>
  );
};
