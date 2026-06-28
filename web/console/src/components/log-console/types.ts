import type { SFDotIconName } from "./SFDotIcon";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface LogEntry {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
}

export interface LogSession {
  name: string;
  updateTime: string;
}

export interface ConsoleConfig {
  autoRefresh: boolean;
  intervalMs: number;
  fontScale: number;
  density: number;
}

export interface ActionItem {
  id: string;
  icon: SFDotIconName;
  label: string;
  onClick: () => void;
}

export const DEFAULT_CONFIG: ConsoleConfig = {
  autoRefresh: true,
  intervalMs: 1000,
  fontScale: 1,
  density: 1,
};

export const INTERVAL_OPTIONS = [
  { label: "1秒", value: 1000 },
  { label: "3秒", value: 3000 },
  { label: "5秒", value: 5000 },
  { label: "10秒", value: 10000 },
] as const;
