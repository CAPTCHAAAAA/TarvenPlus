import { useState, useEffect, useCallback } from "react";
import Bridge, { Action, Event } from "@/bridge";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (Bridge.isNative) return "dark"; // 原生会在加载完成时推送真实主题
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 主题桥接：订阅原生广播（启动页/控制台共享）
  useEffect(() => {
    if (!Bridge.isNative) return;
    return Bridge.on(Event.THEME, (p: any) => {
      setThemeState(p?.theme === "light" ? "light" : "dark");
    });
  }, []);

  const toggleTheme = useCallback(() => {
    if (Bridge.isNative) {
      Bridge.call(Action.SET_THEME, { theme: theme === "dark" ? "light" : "dark" });
      return;
    }
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, [theme]);

  return { theme, toggleTheme };
}
