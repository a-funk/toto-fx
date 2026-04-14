import React from "react";
import { Terminal } from "../components/Terminal";
import { SceneLabel } from "../components/SceneLabel";

// ---------------------------------------------------------------------------
// Scene 2: CloneAndBuild — 690 frames (23 seconds)
//
// Full-screen Terminal showing git clone, cd, npm install, npm run build
// with actual output. Commands type at 3 chars/frame, output lines appear
// with 4-frame gaps.
// ---------------------------------------------------------------------------

const TERMINAL_LINES: Array<{
  type: "command" | "output" | "blank";
  text: string;
  delay?: number;
  highlight?: boolean;
}> = [
  // git clone
  { type: "command", text: "git clone https://github.com/a-funk/toto-fx.git", delay: 15 },
  { type: "output", text: "Cloning into 'toto-fx'...", delay: 8 },
  { type: "output", text: "remote: Enumerating objects: 847, done.", delay: 4 },
  { type: "output", text: "remote: Total 847, done.", delay: 4 },
  { type: "blank", text: "", delay: 12 },

  // cd
  { type: "command", text: "cd toto-fx", delay: 20 },
  { type: "blank", text: "", delay: 12 },

  // npm install
  { type: "command", text: "npm install", delay: 20 },
  { type: "output", text: "added 1 package in 1.2s", delay: 30 },
  { type: "blank", text: "", delay: 12 },

  // npm run build
  { type: "command", text: "npm run build", delay: 20 },
  { type: "blank", text: "", delay: 4 },
  { type: "output", text: "> toto-fx@0.1.1 build", delay: 10 },
  { type: "output", text: "> node build.js", delay: 4 },
  { type: "blank", text: "", delay: 8 },
  { type: "output", text: "Built:", delay: 12 },
  { type: "output", text: "  dist/toto-fx.esm.js       74.6KB (full ESM)", delay: 4 },
  { type: "output", text: "  dist/toto-fx.min.js       75.1KB (full IIFE)", delay: 4 },
  { type: "output", text: "  dist/core.esm.js          15.4KB (engine only)", delay: 4 },
  { type: "output", text: "  dist/dotgrid.min.js       15.0KB (TotoFXDotgrid)", delay: 4 },
  { type: "output", text: "  dist/plugins/thud.min.js  53.9KB (TotoFXThud)", delay: 4 },
  { type: "output", text: "  dist/plugins/death.min.js 70.1KB (TotoFXDeath)", delay: 4 },
  { type: "output", text: "  dist/plugins/cute.min.js  69.6KB (TotoFXCute)", delay: 4 },
  { type: "output", text: "  dist/plugins/creation.min.js 46.5KB (TotoFXCreation)", delay: 4 },
  { type: "output", text: "  dist/plugins/in-progress.min.js 15.9KB (TotoFXInProgress)", delay: 4 },
  { type: "output", text: "  dist/plugins/heart-pulse.min.js 24.2KB (TotoFXHeartPulse)", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/ripple.min.js 1.8KB", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/vortex.min.js 2.0KB", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/crater.min.js 2.5KB", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/nuclear.min.js 2.3KB", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/scorch.min.js 1.8KB", delay: 4 },
  { type: "output", text: "  dist/dotgrid-plugins/heart.min.js 2.6KB", delay: 4 },
];

export const CloneAndBuild: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1a1a2e",
        padding: 32,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <SceneLabel label="01 / SETUP" />
      <Terminal
        lines={TERMINAL_LINES}
        typingSpeed={3}
        title="Terminal — toto-fx"
      />
    </div>
  );
};
