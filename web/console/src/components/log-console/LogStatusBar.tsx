import { SFDotIcon } from "./SFDotIcon";
import { ThemeToggle } from "./ThemeToggle";
import type { LogSession } from "./types";

interface LogStatusBarProps {
  session: LogSession;
}

export function LogStatusBar({ session }: LogStatusBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 sm:px-5 py-2 sm:py-2.5">
      {/* macOS traffic light dots */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/40 bg-background/30 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-sm ring-1 ring-black/10" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-sm ring-1 ring-black/10" />
        <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-sm ring-1 ring-black/10" />
      </div>

      <div className="flex items-center gap-2">
        {/* Update time */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/20 bg-gradient-to-r from-background/40 via-background/20 to-transparent backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-300 hover:border-border/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <span className="text-muted-foreground/80 text-[0.6875rem] sm:text-xs font-medium tracking-wide">更新时间</span>
          <span className="text-foreground/90 tabular-nums font-semibold text-[0.6875rem] sm:text-xs bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{session.updateTime.split(" ")[1]}</span>
        </div>

        {/* Theme toggle - iPhone 4 Home button style */}
        <ThemeToggle />
      </div>
    </div>
  );
}
