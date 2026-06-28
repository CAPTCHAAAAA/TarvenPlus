import { Slider } from "@/components/ui/slider";
import Bridge, { Action } from "@/bridge";
import type { ConsoleConfig } from "./types";

interface LogConfigPanelProps {
  config: ConsoleConfig;
  onConfigChange: (patch: Partial<ConsoleConfig>) => void;
}

const DEFAULT_FONT_SCALE = 1.0;

export function LogConfigPanel({ config, onConfigChange }: LogConfigPanelProps) {
  const applyFontScale = (v: number) => {
    onConfigChange({ fontScale: v });
    if (Bridge.isNative) Bridge.call(Action.SET_ZOOM, { pct: Math.round(v * 100) });
  };

  return (
    <div className="px-3 sm:px-5 py-3">
      {/* Slider row matching capsule-btn style */}
      <div className="capsule-btn flex items-center gap-3 px-4 py-2.5 font-rounded">
        {/* Label */}
        <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">
          字体缩放
        </span>

        {/* Slider track area */}
        <div className="flex-1 min-w-0">
          <Slider
            value={[config.fontScale]}
            min={0.8}
            max={1.5}
            step={0.05}
            onValueChange={([v]) => applyFontScale(v)}
            className="py-1"
          />
        </div>

        {/* Value display */}
        <span className="text-foreground/70 tabular-nums text-xs font-semibold whitespace-nowrap">
          {Math.round(config.fontScale * 100)}%
        </span>

        {/* Reset button */}
        {config.fontScale !== DEFAULT_FONT_SCALE && (
          <button
            onClick={() => applyFontScale(DEFAULT_FONT_SCALE)}
            className="flex-shrink-0 w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="重置"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
