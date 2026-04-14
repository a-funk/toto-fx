import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { Terminal } from "../components/Terminal";
import { Browser } from "../components/Browser";
import { CodeEditor } from "../components/CodeEditor";
import { FileTree } from "../components/FileTree";
import { SceneLabel } from "../components/SceneLabel";

// ---------------------------------------------------------------------------
// Scene 4: CreateAnimation — 1500 frames (50 seconds)
//
// Phase A (0-180):   Terminal typing the heart pulse prompt
// Phase B (180-780): Code editor showing actual heart.js with highlights
// Phase C (780-1200): Browser with heart-effect.mp4
// Phase D (1200-1500): FileTree showing dotgrid-plugins with heart.js NEW
// ---------------------------------------------------------------------------

const PROMPT_TEXT =
  'Create a "heart pulse" dotgrid effect. Use the implicit heart equation to inject density in a heart shape with pulsing outward velocity beats.';

// Actual code from heart.js — the key section
const HEART_CODE = `// Implicit heart: (x^2 + y^2 - 1)^3 - x^2 * y^3 < 0 means inside
var x2 = hx * hx;
var y2 = hy * hy;
var y3 = y2 * hy;
var sum = x2 + y2 - 1;
var f = sum * sum * sum - x2 * y3;

if (f <= 0) {
  var depth = Math.min(1, Math.pow(Math.abs(f), 0.3));
  density[idx] = Math.min(1, density[idx] + depth * densStr * strength * dm);
  
  if (dist > 0.1) {
    var nx = hx / dist, ny = -hy / dist;
    velX[idx] += nx * depth * pushStr * strength / dotSz;
    velY[idx] += ny * depth * pushStr * strength / dotSz;
  }
}`;

// Build output lines for the terminal after code generation
const BUILD_OUTPUT_LINES: Array<{
  type: "command" | "output" | "blank";
  text: string;
  delay?: number;
  highlight?: boolean;
}> = [
  { type: "command", text: PROMPT_TEXT, delay: 5 },
  { type: "blank", text: "", delay: 4 },
  { type: "output", text: "Creating src/dotgrid-plugins/heart.js ...", delay: 10 },
  { type: "output", text: "Writing heart effect with implicit equation ...", delay: 4 },
  { type: "output", text: "Adding pulse logic with decreasing intensity ...", delay: 4 },
  { type: "output", text: "Registering plugin export ...", delay: 4 },
  { type: "blank", text: "", delay: 8 },
  { type: "output", text: "> npm run build", delay: 10 },
  { type: "output", text: "  dist/dotgrid-plugins/heart.min.js 2.6KB", delay: 4 },
  { type: "blank", text: "", delay: 4 },
  { type: "output", text: "Build succeeds.", delay: 10, highlight: true },
];

// File tree entries for Phase D
const FILE_TREE_ENTRIES = [
  { name: "src/", indent: 0, isDir: true },
  { name: "dotgrid-plugins/", indent: 1, isDir: true, highlight: true },
  { name: "ripple.js", indent: 2 },
  { name: "vortex.js", indent: 2 },
  { name: "crater.js", indent: 2 },
  { name: "nuclear.js", indent: 2 },
  { name: "scorch.js", indent: 2 },
  { name: "heart.js", indent: 2, isNew: true, highlight: true },
  { name: "plugins/", indent: 1, isDir: true },
  { name: "core/", indent: 1, isDir: true },
];

// Highlight regions for the code editor (line indices are 0-based)
// Line 0: equation comment
// Lines 1-5: equation computation
// Line 8: depth calculation
// Line 9: density injection
// Lines 12-14: velocity injection
const CODE_HIGHLIGHTS = [
  {
    lines: [0, 4, 5],
    color: "#ffd700",
    startFrame: 60,
    duration: 60,
  },
  {
    lines: [8, 9],
    color: "#00d4aa",
    startFrame: 130,
    duration: 40,
  },
  {
    lines: [12, 13, 14],
    color: "#ff6eb4",
    startFrame: 180,
    duration: 40,
  },
];

export const CreateAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase boundaries
  const PHASE_A_END = 180;
  const PHASE_B_END = 780;
  const PHASE_C_END = 1200;
  // Phase D: 1200-1500

  const inPhaseA = frame <= PHASE_A_END;
  const inPhaseB = frame > PHASE_A_END && frame <= PHASE_B_END;
  const inPhaseC = frame > PHASE_B_END && frame <= PHASE_C_END;
  const inPhaseD = frame > PHASE_C_END;

  // Phase C split slides to 20/80
  const phaseCRatio = inPhaseC
    ? interpolate(
        frame - PHASE_B_END,
        [0, 60],
        [0.5, 0.2],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0.5;

  // Phase B: typing animation for code editor
  const phaseBFrame = inPhaseB ? frame - PHASE_A_END : 0;
  const codeVisibleChars = inPhaseB
    ? Math.floor(phaseBFrame * 2.5) // ~2.5 chars per frame
    : inPhaseC || inPhaseD
      ? Infinity
      : 0;

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
      <SceneLabel label="03 / THE PROMPT" />

      {/* Phase A: Full terminal with prompt typing */}
      {inPhaseA && (
        <div style={{ width: "100%", height: "100%", padding: 32, boxSizing: "border-box" }}>
          <Terminal
            lines={BUILD_OUTPUT_LINES.slice(0, 1)}
            typingSpeed={2}
            title="Claude Code"
          />
        </div>
      )}

      {/* Phase B: Split — Terminal left, CodeEditor right */}
      {inPhaseB && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            gap: 16,
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "45%", height: "100%", overflow: "hidden" }}>
            <Terminal
              lines={BUILD_OUTPUT_LINES}
              typingSpeed={2}
              title="Claude Code"
            />
          </div>
          <div style={{ width: "55%", height: "100%", overflow: "hidden" }}>
            <CodeEditor
              code={HEART_CODE}
              fileName="heart.js"
              language="javascript"
              visibleChars={codeVisibleChars}
              highlights={CODE_HIGHLIGHTS.map((h) => ({
                ...h,
                // Offset highlights so they appear relative to Phase B start
                startFrame: h.startFrame,
              }))}
            />
          </div>
        </div>
      )}

      {/* Phase C: Split — small terminal left, browser with video right */}
      {inPhaseC && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            gap: 16,
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: `${phaseCRatio * 100}%`,
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Terminal
              lines={BUILD_OUTPUT_LINES}
              typingSpeed={2}
              title="Claude Code"
            />
          </div>
          <div
            style={{
              width: `${(1 - phaseCRatio) * 100}%`,
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Browser url="file:///toto-fx/test-drive.html#heart">
              <VideoWithFallback
                src={staticFile("heart-effect.mp4")}
                startFrom={0}
              />
            </Browser>
          </div>
        </div>
      )}

      {/* Phase D: Full-screen FileTree */}
      {inPhaseD && (
        <FileTree
          files={FILE_TREE_ENTRIES}
          title="dotgrid-plugins"
        />
      )}
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
