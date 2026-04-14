import React from "react";
import { Composition, Series } from "remotion";

// ---------------------------------------------------------------------------
// Scene imports
// ---------------------------------------------------------------------------

import { Hook } from "./scenes/Hook";
import { CloneAndBuild } from "./scenes/CloneAndBuild";
import { DemoPage } from "./scenes/DemoPage";
import { CreateAnimation } from "./scenes/CreateAnimation";
import { PluginSystem } from "./scenes/PluginSystem";
import { CTA } from "./scenes/CTA";

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

const TotoFXDemo: React.FC = () => {
  return (
    <Series>
      <Series.Sequence durationInFrames={360}>
        <Hook />
      </Series.Sequence>
      <Series.Sequence durationInFrames={690}>
        <CloneAndBuild />
      </Series.Sequence>
      <Series.Sequence durationInFrames={900}>
        <DemoPage />
      </Series.Sequence>
      <Series.Sequence durationInFrames={1500}>
        <CreateAnimation />
      </Series.Sequence>
      <Series.Sequence durationInFrames={900}>
        <PluginSystem />
      </Series.Sequence>
      <Series.Sequence durationInFrames={450}>
        <CTA />
      </Series.Sequence>
    </Series>
  );
};

// ---------------------------------------------------------------------------
// Root — registers all compositions with Remotion
// ---------------------------------------------------------------------------

export const Root: React.FC = () => {
  return (
    <Composition
      id="TotoFXDemo"
      component={TotoFXDemo}
      durationInFrames={4800}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
