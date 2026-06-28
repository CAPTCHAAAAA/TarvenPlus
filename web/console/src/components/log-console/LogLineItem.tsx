import type { LogEntry, LogLevel } from "./types";

const LEVEL_COLOR: Record<LogLevel, string> = {
  INFO: "text-log-info",
  WARN: "text-log-warn",
  ERROR: "text-log-error",
  DEBUG: "text-log-debug",
};

const LEVEL_BG: Record<LogLevel, string> = {
  INFO: "bg-white/10 text-log-info border-white/20",
  WARN: "bg-white/10 text-log-warn border-white/20",
  ERROR: "bg-white/10 text-log-error border-white/20",
  DEBUG: "bg-white/10 text-log-debug border-white/20",
};

interface LogLineItemProps {
  entry: LogEntry;
  fontScale: number;
  density: number;
}

export function LogLineItem({ entry, fontScale, density }: LogLineItemProps) {
  const baseFontSize = 0.75 * fontScale;
  const badgeFontSize = 0.625 * fontScale;
  const verticalPadding = 3 * density;
  const lineHeight = 1.45 * density;

  return (
    <div
      className="flex items-start gap-2 px-3 hover:bg-log-line-hover transition-log-fast rounded-lg group mx-1"
      style={{
        fontSize: `${baseFontSize}rem`,
        lineHeight,
        paddingTop: `${verticalPadding}px`,
        paddingBottom: `${verticalPadding}px`,
      }}
    >
      {/* Timestamp */}
      <span className="shrink-0 text-log-time tabular-nums font-log-mono select-none opacity-70">
        {entry.time}
      </span>

      {/* Level badge — glass capsule */}
      <span
        className={`shrink-0 inline-flex items-center justify-center min-w-[3em] px-2 py-0.5 rounded-full font-semibold tracking-wide font-log-mono select-none backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ${LEVEL_BG[entry.level]}`}
        style={{ fontSize: `${badgeFontSize}rem` }}
      >
        {entry.level}
      </span>

      {/* Message */}
      <span className={`font-log-mono break-all ${LEVEL_COLOR[entry.level]} opacity-90`}>
        {entry.message}
      </span>
    </div>
  );
}
