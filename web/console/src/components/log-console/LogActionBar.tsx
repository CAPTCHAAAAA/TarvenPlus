import { Button } from "@/components/ui/button";
import type { ActionItem } from "./types";

interface LogActionBarProps {
  actions: ActionItem[];
}

// Flat icon SVGs
const icons: Record<string, React.ReactNode> = {
  refresh: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  external: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

// Short 2-char labels
const shortLabels: Record<string, string> = {
  refresh: "刷新",
  download: "导出",
  trash: "清空",
  external: "打开",
};

export function LogActionBar({ actions }: LogActionBarProps) {
  return (
    <div className="flex gap-2 px-3 sm:px-4 py-3">
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          className="capsule-btn flex-1 h-9 text-muted-foreground hover:text-foreground text-xs font-medium font-rounded flex items-center justify-center gap-1.5"
        >
          {icons[action.icon]}
          <span>{shortLabels[action.icon] || action.label}</span>
        </Button>
      ))}
    </div>
  );
}
