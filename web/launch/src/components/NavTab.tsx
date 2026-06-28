import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";

interface TavernInstance {
  id: string;
  name: string;
  color: string;
}

interface NavTabProps {
  selectedInstance: TavernInstance | null;
  instances: TavernInstance[];
  showNavDropdown: boolean;
  setShowNavDropdown: Dispatch<SetStateAction<boolean>>;
  setSelectedInstance: Dispatch<SetStateAction<TavernInstance | null>>;
  isLight: boolean;
}

export function NavTab({
  selectedInstance,
  instances,
  showNavDropdown,
  setShowNavDropdown,
  setSelectedInstance,
  isLight,
}: NavTabProps) {
  const currentTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="relative">
        <button
          onClick={() => setShowNavDropdown(!showNavDropdown)}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full transition-all max-w-[200px]",
            isLight ? "hover:bg-black/5" : "hover:bg-white/10",
            selectedInstance ? (isLight ? "bg-black/5" : "bg-white/10") : ""
          )}
        >
          {selectedInstance && (
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedInstance.color }}
            />
          )}
          <span className={cn("text-sm font-medium truncate", isLight ? "text-[#1a1625]" : "text-white")}>
            {selectedInstance ? selectedInstance.name : currentTime}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 flex-shrink-0 transition-transform",
            isLight ? "text-[#1a1625]/60" : "text-white/60",
            showNavDropdown && "rotate-180"
          )} />
        </button>

        {/* 实例切换下拉菜单 */}
        {showNavDropdown && (
          <div className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden z-50",
            isLight ? "bg-white/90 border-black/10" : "bg-[#1a1625]/90 border-white/10"
          )}>
            <div className="p-2 space-y-1">
              {/* 当前实例（如果在详情页） */}
              {selectedInstance && (
                <>
                  <div className={cn("px-3 py-1 text-xs", isLight ? "text-[#1a1625]/50" : "text-white/50")}>
                    当前实例
                  </div>
                  <button
                    onClick={() => setShowNavDropdown(false)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm",
                      isLight ? "bg-black/10 text-[#1a1625]" : "bg-white/10 text-white"
                    )}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedInstance.color }}
                    />
                    <span className="flex-1 truncate">{selectedInstance.name}</span>
                    <Check className="w-4 h-4 flex-shrink-0" />
                  </button>
                  <div className={cn("h-px my-1", isLight ? "bg-black/10" : "bg-white/10")} />
                </>
              )}
              <div className={cn("px-3 py-1 text-xs", isLight ? "text-[#1a1625]/50" : "text-white/50")}>
                所有实例
              </div>
              {instances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => {
                    setSelectedInstance(instance);
                    setShowNavDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                    selectedInstance?.id === instance.id
                      ? (isLight ? "bg-black/10 text-[#1a1625]" : "bg-white/10 text-white")
                      : (isLight ? "text-[#1a1625]/70 hover:bg-black/5" : "text-white/70 hover:bg-white/5")
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: instance.color }}
                  />
                  <span className="flex-1 truncate">{instance.name}</span>
                  {selectedInstance?.id === instance.id && (
                    <Check className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
