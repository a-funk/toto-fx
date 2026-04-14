import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  OffthreadVideo,
  staticFile,
} from "remotion";
import { CodeEditor } from "../components/CodeEditor";
import { SizeChart } from "../components/SizeChart";
import { Browser } from "../components/Browser";
import { SceneLabel } from "../components/SceneLabel";

// ---------------------------------------------------------------------------
// Scene 5: PluginSystem — 900 frames (30 seconds)
//
// Phase A (0-300):   CodeEditor with annotated run function
// Phase B (300-600): SizeChart with dotgrid plugin sizes
// Phase C (600-900): Browser with composition-demo.mp4
// ---------------------------------------------------------------------------

// Actual plugin run function signature + key lines (from heart.js)
const PLUGIN_CODE = `run: function (g, args) {
  var cx = args.cx, cy = args.cy;
  var opts = args.opts || {};
  var dotSz = g.dotSize;
  var dm = g.densityMultiplier;
  var radius = (opts.radius) || 200;

  var density = g.density;
  var velX = g.velX;
  var velY = g.velY;
  var colorR = g.colorR;
  var colorG = g.colorG;
  var colorB = g.colorB;

  // ... effect logic ...

  density[idx] = Math.min(1, density[idx] + depth * densStr);
  velX[idx] += nx * depth * pushStr / dotSz;
  velY[idx] += ny * depth * pushStr / dotSz;

  g.startSim();
}`;

const SIZE_ENTRIES = [
  { name: "ripple", size: "1.8KB", sizeKB: 1.8 },
  { name: "scorch", size: "1.8KB", sizeKB: 1.8 },
  { name: "vortex", size: "2.0KB", sizeKB: 2.0 },
  { name: "nuclear", size: "2.3KB", sizeKB: 2.3 },
  { name: "crater", size: "2.5KB", sizeKB: 2.5 },
  { name: "heart", size: "2.6KB", sizeKB: 2.6 },
];

// Annotation data for Phase A
interface Annotation {
  text: string;
  lineIdx: number;
  startFrame: number;
  duration: number;
  side: "right";
}

const ANNOTATIONS: Annotation[] = [
  {
    text: "One function. That's the whole API.",
    lineIdx: 0,
    startFrame: 30,
    duration: 120,
    side: "right",
  },
  {
    text: "Typed arrays. Direct field access.",
    lineIdx: 7,
    startFrame: 90,
    duration: 100,
    side: "right",
  },
  {
    text: "Kick the simulation. Rendering is automatic.",
    lineIdx: 21,
    startFrame: 180,
    duration: 100,
    side: "right",
  },
];

export const PluginSystem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const PHASE_A_END = 300;
  const PHASE_B_END = 600;

  const inPhaseA = frame <= PHASE_A_END;
  const inPhaseB = frame > PHASE_A_END && frame <= PHASE_B_END;
  const inPhaseC = frame > PHASE_B_END;

  // Phase transitions
  const phaseAOpacity = inPhaseA
    ? 1
    : interpolate(frame - PHASE_A_END, [0, 15], [1, 0], {
        extrapolateRight: "clamp",
      });

  const phaseBOpacity = inPhaseB
    ? interpolate(frame - PHASE_A_END, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
      })
    : inPhaseC
      ? interpolate(frame - PHASE_B_END, [0, 15], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 0;

  const phaseCOpacity = inPhaseC
    ? interpolate(frame - PHASE_B_END, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
      })
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
      <SceneLabel label="04 / HOW IT WORKS" />

      {/* Phase A: Code editor with annotations */}
      {(inPhaseA || frame <= PHASE_A_END + 15) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            gap: 24,
            padding: 32,
            boxSizing: "border-box",
            opacity: phaseAOpacity,
          }}
        >
          <div style={{ width: "55%", height: "100%" }}>
            <CodeEditor
              code={PLUGIN_CODE}
              fileName="heart.js"
              language="javascript"
              highlights={[
                { lines: [0], color: "#58a6ff", startFrame: 30, duration: 120 },
                { lines: [7, 8, 9], color: "#3fb950", startFrame: 90, duration: 100 },
                { lines: [21], color: "#d2a8ff", startFrame: 180, duration: 100 },
              ]}
            />
          </div>
          <div
            style={{
              width: "45%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 48,
              padding: "0 24px",
            }}
          >
            {ANNOTATIONS.map((ann, idx) => {
              const annSpring =
                frame >= ann.startFrame
                  ? spring({
                      frame: frame - ann.startFrame,
                      fps,
                      config: { damping: 15, stiffness: 100 },
                    })
                  : 0;

              return (
                <div
                  key={idx}
                  style={{
                    opacity: annSpring,
                    transform: `translateX(${interpolate(annSpring, [0, 1], [40, 0])}px)`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 4,
                      height: 24,
                      borderRadius: 2,
                      background:
                        idx === 0
                          ? "#58a6ff"
                          : idx === 1
                            ? "#3fb950"
                            : "#d2a8ff",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontSize: 22,
                      color: "#e0e0e0",
                      lineHeight: 1.4,
                    }}
                  >
                    {ann.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase B: Size chart */}
      {(inPhaseB || (inPhaseC && frame <= PHASE_B_END + 15)) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: phaseBOpacity,
          }}
        >
          <SizeChart
            entries={SIZE_ENTRIES}
            title="Dotgrid Plugin Sizes"
            maxKB={3}
          />
        </div>
      )}

      {/* Phase C: Browser with composition demo */}
      {inPhaseC && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: 32,
            boxSizing: "border-box",
            opacity: phaseCOpacity,
          }}
        >
          <Browser url="file:///toto-fx/test-drive.html">
            <VideoWithFallback
              src={staticFile("composition-demo.mp4")}
              startFrom={0}
            />
          </Browser>
        </div>
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
