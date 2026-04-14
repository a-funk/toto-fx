import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FileEntry {
  path: string;
  size?: string;
  isNew?: boolean;
  indent?: number;
}

interface FileTreeProps {
  files: FileEntry[];
  staggerFrames?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDirectory(path: string): boolean {
  return path.endsWith("/");
}

function displayName(path: string): string {
  const clean = path.replace(/\/$/, "");
  const segments = clean.split("/");
  const name = segments[segments.length - 1];
  return path.endsWith("/") ? name + "/" : name;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  staggerFrames = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 15,
        color: "#e0e0e0",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {files.map((file, idx) => {
        const entryDelay = idx * staggerFrames;
        const delayedFrame = Math.max(0, frame - entryDelay);

        const slideProgress = spring({
          frame: delayedFrame,
          fps,
          config: { damping: 14, mass: 0.5 },
        });

        const translateX = interpolate(slideProgress, [0, 1], [-30, 0]);
        const opacity = slideProgress;

        // "isNew" green pulse
        let bgColor = "transparent";
        if (file.isNew && frame >= entryDelay) {
          const pulseProgress = interpolate(
            frame - entryDelay,
            [0, 10, 40],
            [0, 0.25, 0.08],
            { extrapolateRight: "clamp" },
          );
          bgColor = `rgba(74, 222, 128, ${pulseProgress})`;
        }

        const indent = (file.indent ?? 0) * 20;
        const isDir = isDirectory(file.path);
        const icon = isDir ? "\uD83D\uDCC1" : "\uD83D\uDCC4";

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              height: 30,
              paddingLeft: 12 + indent,
              paddingRight: 16,
              borderRadius: 4,
              background: bgColor,
              opacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <span style={{ marginRight: 8, fontSize: 14 }}>{icon}</span>
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>
              {displayName(file.path)}
            </span>
            {file.size && (
              <span
                style={{
                  color: "#888888",
                  fontSize: 13,
                  marginLeft: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {file.size}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
