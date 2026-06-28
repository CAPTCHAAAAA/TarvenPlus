import { createFileRoute } from "@tanstack/react-router";
import { LogConsoleCard } from "@/components/log-console/LogConsoleCard";
import { ThemeToggle } from "@/components/log-console/ThemeToggle";
import Bridge from "@/bridge";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  // 原生壳内：只渲染控制台卡片 + 主题切换（全宽，作为顶部下拉面板内容）
  if (Bridge.isNative) {
    return (
      <div className="w-full relative">
        <div className="absolute top-2 right-2 z-50">
          <ThemeToggle />
        </div>
        <LogConsoleCard />
      </div>
    );
  }
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-hidden transition-colors duration-500">
      <div className="relative z-10 w-full max-w-sm">
        <LogConsoleCard />
      </div>
    </div>
  );
}
