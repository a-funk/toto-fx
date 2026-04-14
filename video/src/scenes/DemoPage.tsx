import React from "react";
import {
  useCurrentFrame,
  interpolate,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { Terminal } from "../components/Terminal";
import { Browser } from "../components/Browser";
import { SceneLabel } from "../components/SceneLabel";

// ---------------------------------------------------------------------------
// Scene 3: DemoPage — 900 frames (30 seconds)
//
// SplitScreen: Left = Terminal (Claude Code prompt), Right = Browser.
// Left shows prompt being typed, code generation scroll, then "File created".
// Right starts as about:blank, at frame 480 loads demo-page.mp4.
// Split ratio transitions from 55/45 to 35/65 when the page loads.
// ---------------------------------------------------------------------------

const PROMPT_TEXT =
  "Create a test-drive.html with 11 animation cards, dotgrid fluid simulation background, and Rise All / Fall All buttons.";

// Simulated scrolling code lines for the generation animation
const CODE_GEN_LINES: string[] = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <title>TotoFX Test Drive</title>',
  '  <style>',
  '    * { margin: 0; padding: 0; box-sizing: border-box; }',
  '    body { background: #0a0a0a; color: #fff; font-family: system-ui; }',
  '    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }',
  '    .card { background: rgba(255,255,255,0.04); border-radius: 16px; padding: 24px; }',
  '    .card h3 { font-size: 18px; margin-bottom: 8px; }',
  '    .card button { background: linear-gradient(135deg, #667eea, #764ba2); }',
  '    #dotgrid-canvas { position: fixed; inset: 0; z-index: 0; }',
  '    .controls { position: fixed; bottom: 24px; display: flex; gap: 12px; }',
  '  </style>',
  '</head>',
  '<body>',
  '  <canvas id="dotgrid-canvas"></canvas>',
  '  <div class="card-grid" id="cards"></div>',
  '  <div class="controls">',
  '    <button onclick="riseAll()">Rise All</button>',
  '    <button onclick="fallAll()">Fall All</button>',
  '  </div>',
  '  <script src="dist/toto-fx.min.js"></script>',
  '  <script src="dist/dotgrid.min.js"></script>',
  '  <script>',
  '    const grid = TotoFX.createDotgrid({ canvas: "#dotgrid-canvas" });',
  '    const effects = ["thud","death","cute","creation","heart-pulse",...];',
  '    effects.forEach(name => { /* create card */ });',
  '  </script>',
  '</body>',
  '</html>',
];

const TERMINAL_LINES: Array<{
  type: "command" | "output" | "blank";
  text: string;
  delay?: number;
}> = [
  // Claude prompt
  {
    type: "command",
    text: PROMPT_TEXT,
    delay: 10,
  },
  { type: "blank", text: "", delay: 8 },
  // Code generation output lines (simulated file creation scroll)
  ...CODE_GEN_LINES.map((line, i) => ({
    type: "output" as const,
    text: line,
    delay: i === 0 ? 20 : 3,
  })),
  { type: "blank", text: "", delay: 8 },
  { type: "output", text: "File created: test-drive.html", delay: 10, highlight: true } as const,
];

export const DemoPage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split ratio: transitions from 0.55 to 0.35 around frame 480
  const PAGE_LOAD_FRAME = 480;
  const splitRatio = interpolate(
    frame,
    [PAGE_LOAD_FRAME - 30, PAGE_LOAD_FRAME + 30],
    [0.55, 0.35],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const pageLoaded = frame >= PAGE_LOAD_FRAME;
  const url = pageLoaded
    ? "file:///toto-fx/test-drive.html"
    : "about:blank";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        gap: 16,
        padding: 24,
        boxSizing: "border-box",
        background: "#1a1a2e",
        position: "relative",
      }}
    >
      <SceneLabel label="02 / DEMO PAGE" />

      {/* Left: Terminal */}
      <div
        style={{
          width: `${splitRatio * 100}%`,
          height: "100%",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Terminal
          lines={TERMINAL_LINES}
          typingSpeed={3}
          title="Claude Code"
        />
      </div>

      {/* Right: Browser */}
      <div
        style={{
          width: `${(1 - splitRatio) * 100}%`,
          height: "100%",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <Browser url={url}>
          {pageLoaded ? (
            <VideoWithFallback
              src={staticFile("demo-page.mp4")}
              startFrom={0}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#1e1e2e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#555",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
              }}
            >
              about:blank
            </div>
          )}
        </Browser>
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
            background: "linear-gradient(135deg, #1a1a2e, #2d1b4e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#555",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
          }}
        >
          [video: {src.split("/").pop()}]
        </div>
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
