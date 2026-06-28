import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SFDotIcon } from "./SFDotIcon";
import { LogLineItem } from "./LogLineItem";
import type { LogEntry } from "./types";

interface LogViewerProps {
  logs: LogEntry[];
  fontScale: number;
  density: number;
}

export function LogViewer({ logs, fontScale, density }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] gap-3 mx-3 sm:mx-4 my-2 rounded-2xl glass-inner">
        <SFDotIcon name="inbox" size={28} className="text-log-time opacity-40" />
        <span className="text-xs text-log-time opacity-60">暂无日志，等待数据...</span>
      </div>
    );
  }

  return (
    <div className="mx-3 sm:mx-4 my-2 rounded-2xl glass-inner overflow-hidden">
      <ScrollArea className="h-[320px] log-scrollbar">
        <div className="py-2 space-y-px">
          {logs.map((entry) => (
            <LogLineItem
              key={entry.id}
              entry={entry}
              fontScale={fontScale}
              density={density}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
