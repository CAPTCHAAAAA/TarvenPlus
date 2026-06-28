import { useState, useEffect, useRef, useCallback } from "react";
import Bridge, { Action, Event } from "@/bridge";
import type { LogEntry, LogSession, LogLevel } from "@/components/log-console/types";

const MAX_LOGS = 500;

// ── dev mock（浏览器调试用；原生壳内不走这套）──
const MOCK_MESSAGES: Record<LogLevel, string[]> = {
  INFO: ["Compiling frontend assets...", "Server started on port 8000", "Route /api/health registered", "Static files served from /dist"],
  WARN: ["Port 8000 occupied, falling back", "Deprecated endpoint called", "Memory usage above 80%"],
  ERROR: ["Failed to connect to Redis", "Unhandled promise rejection", "SSL certificate expires soon"],
  DEBUG: ["Parsing request body", "Middleware chain: auth → handler", "GC pause: 12ms"],
};
const LEVEL_WEIGHTS: LogLevel[] = ["INFO","INFO","INFO","INFO","WARN","WARN","ERROR","DEBUG","DEBUG"];
function randomLevel(): LogLevel { return LEVEL_WEIGHTS[Math.floor(Math.random()*LEVEL_WEIGHTS.length)]; }
function generateMockLog(): LogEntry {
  const level = randomLevel();
  const msgs = MOCK_MESSAGES[level];
  return { id: `log-${++idCounter}`, time: fmtTime(new Date()), level, message: msgs[Math.floor(Math.random()*msgs.length)] };
}

let idCounter = 0;
function fmtTime(d: Date) { return d.toTimeString().slice(0, 8); }
function fmtDateTime(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da} ${fmtTime(d)}`;
}

/** 把原生推来的一行日志解析成 LogEntry。 */
function lineToEntry(line: string): LogEntry {
  let level: LogLevel = "INFO";
  if (/\[?error\]?/i.test(line) || line.includes("✗")) level = "ERROR";
  else if (/\[?warn(ing)?\]?/i.test(line)) level = "WARN";
  else if (/\[?debug\]?/i.test(line)) level = "DEBUG";
  return { id: `log-${++idCounter}`, time: fmtTime(new Date()), level, message: line };
}

interface UseLogPollingOptions { apiUrl?: string; intervalMs: number; enabled: boolean; }

export function useLogPolling({ intervalMs, enabled }: UseLogPollingOptions) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [session, setSession] = useState<LogSession>({ name: "启动日志", updateTime: fmtDateTime(new Date()) });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 原生壳：订阅日志推送，挂载时拉取当前日志 ──
  useEffect(() => {
    if (!Bridge.isNative) return;
    const off = Bridge.on(Event.LOG, (l: any) => {
      const line = typeof l === "string" ? l : (l?.line ?? "");
      if (!line) return;
      const entry = lineToEntry(line);
      setLogs(prev => {
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next;
      });
      setSession(prev => ({ ...prev, updateTime: fmtDateTime(new Date()) }));
    });
    Bridge.call(Action.REFRESH_LOGS); // 拉取当前 server.log 尾部
    return off;
  }, []);

  const refresh = useCallback(() => {
    if (Bridge.isNative) {
      setLogs([]);              // 本地先清空，原生会重推尾部
      Bridge.call(Action.REFRESH_LOGS);
    } else {
      const e = generateMockLog();
      setLogs(prev => [...prev, e].slice(-MAX_LOGS));
      setSession(prev => ({ ...prev, updateTime: fmtDateTime(new Date()) }));
    }
  }, []);

  const clear = useCallback(() => {
    setLogs([]);
    setSession(prev => ({ ...prev, updateTime: fmtDateTime(new Date()) }));
    if (Bridge.isNative) Bridge.call(Action.CLEAR_LOGS);
  }, []);

  // ── dev mock 轮询（仅浏览器）──
  useEffect(() => {
    if (Bridge.isNative) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (enabled) {
      const add = () => {
        const e = generateMockLog();
        setLogs(prev => [...prev, e].slice(-MAX_LOGS));
        setSession(prev => ({ ...prev, updateTime: fmtDateTime(new Date()) }));
      };
      add();
      timerRef.current = setInterval(add, intervalMs);
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [enabled, intervalMs]);

  return { logs, session, refresh, clear };
}
