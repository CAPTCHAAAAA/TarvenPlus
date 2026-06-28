import { useState, useCallback } from "react";
import { LogStatusBar } from "./LogStatusBar";
import { LogConfigPanel } from "./LogConfigPanel";
import { LogViewer } from "./LogViewer";
import { LogActionBar } from "./LogActionBar";
import { useLogPolling } from "@/hooks/useLogPolling";
import Bridge, { Action } from "@/bridge";
import type { ConsoleConfig, ActionItem } from "./types";
import { DEFAULT_CONFIG } from "./types";

interface LogConsoleCardProps {
  apiUrl?: string;
  onClose?: () => void;
  className?: string;
}

export function LogConsoleCard({
  apiUrl,
  onClose,
  className = "",
}: LogConsoleCardProps) {
  const [config, setConfig] = useState<ConsoleConfig>(DEFAULT_CONFIG);

  const handleConfigChange = useCallback(
    (patch: Partial<ConsoleConfig>) => {
      setConfig((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const { logs, session, refresh, clear } = useLogPolling({
    apiUrl,
    intervalMs: config.intervalMs,
    enabled: config.autoRefresh,
  });

  const actions: ActionItem[] = [
    { id: "refresh", icon: "refresh", label: "刷新页面", onClick: refresh },
    {
      id: "export",
      icon: "download",
      label: "导出日志",
      onClick: () => {
        const text = logs
          .map((l) => `[${l.time}] ${l.level} ${l.message}`)
          .join("\n");
        if (Bridge.isNative) { Bridge.call(Action.EXPORT_LOGS, { text }); return; }
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `log-export-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    { id: "clear", icon: "trash", label: "清空日志", onClick: clear },
    {
      id: "browser",
      icon: "external",
      label: "浏览器打开",
      onClick: () => {
        if (Bridge.isNative) Bridge.call(Action.OPEN_EXTERNAL, { url: "http://127.0.0.1:8000/" });
        else window.open(window.location.href, "_blank");
      },
    },
  ];

  return (
    <div
      className={`glass-panel rounded-3xl overflow-hidden glass-highlight-top ${className}`}
    >
      <LogStatusBar session={session} />
      <LogConfigPanel config={config} onConfigChange={handleConfigChange} />
      <LogViewer
        logs={logs}
        fontScale={1}
        density={1}
      />
      <LogActionBar actions={actions} />
    </div>
  );
}
