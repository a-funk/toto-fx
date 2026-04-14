import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HighlightRange {
  lines: [number, number]; // 1-based inclusive range
  color: string;
  fromFrame: number;
  durationFrames: number;
}

interface CodeEditorProps {
  code: string;
  language?: string;
  fileName?: string;
  highlightLines?: HighlightRange[];
  scrollToLine?: number;
  visibleFromLine?: number;
  zoom?: number;
}

// ---------------------------------------------------------------------------
// Syntax highlighting (regex-based, simple but effective)
// ---------------------------------------------------------------------------

type TokenType =
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "function"
  | "plain";

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: "#c792ea",   // purple
  string: "#4ade80",    // green
  number: "#f78c6c",    // orange
  comment: "#636d83",   // gray
  function: "#ffd700",  // yellow
  plain: "#e0e0e0",
};

const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "extends",
  "new",
  "this",
  "async",
  "await",
  "default",
  "type",
  "interface",
  "enum",
  "true",
  "false",
  "null",
  "undefined",
  "typeof",
  "as",
  "of",
  "in",
]);

function tokenizeLine(
  line: string,
): Array<{ text: string; type: TokenType }> {
  const tokens: Array<{ text: string; type: TokenType }> = [];

  // Order matters: comments first, then strings, numbers, func calls, keywords
  const regex =
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_$][\w$]*(?=\s*\())|(\b[a-zA-Z_$][\w$]*\b)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, match.index),
        type: "plain",
      });
    }

    if (match[1]) {
      tokens.push({ text: match[0], type: "comment" });
    } else if (match[2]) {
      tokens.push({ text: match[0], type: "string" });
    } else if (match[3]) {
      tokens.push({ text: match[0], type: "number" });
    } else if (match[4]) {
      // function call
      if (KEYWORDS.has(match[0])) {
        tokens.push({ text: match[0], type: "keyword" });
      } else {
        tokens.push({ text: match[0], type: "function" });
      }
    } else if (match[5]) {
      if (KEYWORDS.has(match[0])) {
        tokens.push({ text: match[0], type: "keyword" });
      } else {
        tokens.push({ text: match[0], type: "plain" });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Remainder
  if (lastIndex < line.length) {
    tokens.push({
      text: line.slice(lastIndex),
      type: "plain",
    });
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  fileName,
  highlightLines = [],
  scrollToLine,
  visibleFromLine = 1,
  zoom = 1,
}) => {
  const frame = useCurrentFrame();

  const codeLines = useMemo(() => code.split("\n"), [code]);

  const LINE_HEIGHT = 22 * zoom;
  const FONT_SIZE = 14 * zoom;

  // File tab icon based on language
  const tabIcon = useMemo(() => {
    switch (language) {
      case "tsx":
      case "jsx":
        return "\u269B"; // atom symbol
      case "json":
        return "{ }";
      case "js":
      case "ts":
        return "JS";
      default:
        return "\uD83D\uDCC4"; // page icon
    }
  }, [language]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#1e1e2e",
        borderRadius: 10,
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: FONT_SIZE,
        color: "#e0e0e0",
      }}
    >
      {/* Tab bar */}
      {fileName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 36,
            padding: "0 16px",
            background: "#161b22",
            borderBottom: "1px solid #2a2a3e",
            fontSize: 13,
            color: "#e0e0e0",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, opacity: 0.7 }}>{tabIcon}</span>
          <span>{fileName}</span>
        </div>
      )}

      {/* Code area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "10px 0",
        }}
      >
        {codeLines.map((line, idx) => {
          const lineNum = idx + 1;
          if (lineNum < visibleFromLine) return null;

          // Highlight calculation
          let highlightBg: string | null = null;
          let highlightOpacity = 0;

          for (const hl of highlightLines) {
            const [start, end] = hl.lines;
            if (lineNum >= start && lineNum <= end) {
              const progress = interpolate(
                frame,
                [
                  hl.fromFrame,
                  hl.fromFrame + 8,
                  hl.fromFrame + hl.durationFrames - 8,
                  hl.fromFrame + hl.durationFrames,
                ],
                [0, 0.25, 0.25, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
              if (progress > highlightOpacity) {
                highlightOpacity = progress;
                highlightBg = hl.color;
              }
            }
          }

          const tokens = tokenizeLine(line);

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                height: LINE_HEIGHT,
                lineHeight: `${LINE_HEIGHT}px`,
                whiteSpace: "pre",
                background:
                  highlightBg && highlightOpacity > 0
                    ? `${highlightBg}${Math.round(highlightOpacity * 255)
                        .toString(16)
                        .padStart(2, "0")}`
                    : "transparent",
              }}
            >
              {/* Line number */}
              <span
                style={{
                  display: "inline-block",
                  width: 50 * zoom,
                  textAlign: "right",
                  paddingRight: 16 * zoom,
                  color: "#555555",
                  userSelect: "none",
                  flexShrink: 0,
                }}
              >
                {lineNum}
              </span>

              {/* Code tokens */}
              <span style={{ paddingLeft: 4 * zoom }}>
                {tokens.map((tok, tIdx) => (
                  <span key={tIdx} style={{ color: TOKEN_COLORS[tok.type] }}>
                    {tok.text}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
