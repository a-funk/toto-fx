import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrowserProps {
  url?: string;
  children: React.ReactNode;
  darkMode?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const Browser: React.FC<BrowserProps> = ({
  url = "https://localhost:3000",
  children,
  darkMode = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const urlSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  const bg = darkMode ? "#1e1e2e" : "#ffffff";
  const chromeBg = darkMode ? "#161b22" : "#e8e8e8";
  const barBg = darkMode ? "#0d1117" : "#f5f5f5";
  const textColor = darkMode ? "#e0e0e0" : "#333333";
  const mutedColor = darkMode ? "#888888" : "#999999";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        background: bg,
        border: darkMode ? "1px solid #2a2a3e" : "1px solid #ccc",
      }}
    >
      {/* ---- Chrome ---- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: chromeBg,
          flexShrink: 0,
        }}
      >
        {/* Traffic lights + tab area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 38,
            padding: "0 14px",
            gap: 8,
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
        </div>

        {/* Address bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 36,
            padding: "0 14px",
            gap: 10,
          }}
        >
          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 6 }}>
            {["<", ">", "↻"].map((icon, i) => (
              <div
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  fontSize: 14,
                  color: mutedColor,
                  cursor: "default",
                  userSelect: "none",
                }}
              >
                {icon}
              </div>
            ))}
          </div>

          {/* URL bar */}
          <div
            style={{
              flex: 1,
              height: 28,
              borderRadius: 6,
              background: barBg,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              color: textColor,
              overflow: "hidden",
              whiteSpace: "nowrap",
              opacity: urlSpring,
            }}
          >
            {/* Lock icon */}
            <span style={{ color: "#4ade80", marginRight: 6, fontSize: 12 }}>
              🔒
            </span>
            {url}
          </div>
        </div>
      </div>

      {/* ---- Content area ---- */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          background: bg,
        }}
      >
        {children}
      </div>
    </div>
  );
};
