import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SizeChartItem {
  label: string;
  sizeKB: number;
  color?: string;
}

interface SizeChartProps {
  items: SizeChartItem[];
  maxKB?: number;
  staggerFrames?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const SizeChart: React.FC<SizeChartProps> = ({
  items,
  maxKB,
  staggerFrames = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const resolvedMax = useMemo(
    () => maxKB ?? Math.max(...items.map((i) => i.sizeKB), 1),
    [items, maxKB],
  );

  const BAR_HEIGHT = 32;
  const ROW_GAP = 10;
  const LABEL_WIDTH = 180;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ROW_GAP,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        color: "#e0e0e0",
      }}
    >
      {items.map((item, idx) => {
        const entryDelay = idx * staggerFrames;
        const delayedFrame = Math.max(0, frame - entryDelay);

        const grow = spring({
          frame: delayedFrame,
          fps,
          config: { damping: 14, mass: 0.6 },
        });

        const barWidthPercent = (item.sizeKB / resolvedMax) * 100 * grow;
        const barColor = item.color ?? "#6a9eff";

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              height: BAR_HEIGHT,
              opacity: grow,
            }}
          >
            {/* Label */}
            <div
              style={{
                width: LABEL_WIDTH,
                flexShrink: 0,
                textAlign: "right",
                paddingRight: 14,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "#e0e0e0",
              }}
            >
              {item.label}
            </div>

            {/* Bar track */}
            <div
              style={{
                flex: 1,
                height: BAR_HEIGHT,
                background: "#1a1a2e",
                borderRadius: 4,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Bar fill */}
              <div
                style={{
                  width: `${barWidthPercent}%`,
                  height: "100%",
                  background: barColor,
                  borderRadius: 4,
                }}
              />
            </div>

            {/* KB label */}
            <div
              style={{
                width: 80,
                flexShrink: 0,
                textAlign: "right",
                paddingLeft: 10,
                color: "#888888",
                fontSize: 13,
              }}
            >
              {Math.round(item.sizeKB * grow)} KB
            </div>
          </div>
        );
      })}
    </div>
  );
};
