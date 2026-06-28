import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import Bridge, { Action, Event } from "@/bridge";
import {
  Menu,
  Monitor,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Circle,
  Copy,
  Terminal,
  Settings,
  Plus,
  Search,
  X,
  Smartphone,
  Wifi,
  Battery,
  Signal,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Edit3,
  ExternalLink,
  Cloud,
  Laptop,
  MoreVertical,
  ChevronRight,
  ArrowLeft,
  StopCircle,
  RefreshCw,
  LogOut,
  FolderOpen,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  GripVertical,
  Image as ImageIcon,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: SillyClientLauncher,
});

type StepStatus = "pending" | "loading" | "completed" | "error";

interface LaunchStep {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
}

interface TavernInstance {
  id: string;
  name: string;
  subtitle?: string;
  version?: string;
  status: "running" | "stopped" | "error" | "online" | "offline";
  type: "mobile" | "remote";
  lastUsed?: string;
  icon: React.ReactNode;
  color: string;
  isLaunching?: boolean;
  progress?: number;
  remark?: string;
  domain?: string;
  nodeRuntime?: string;
  bionicLibs?: string;
  serverStatus?: string;
}

const generateLogs = (progress: number, instanceType: string): string[] => {
  const baseLogs = [
    `[INFO] SillyClient ${instanceType} Launcher v2.1.0`,
    "[INFO] Initializing environment...",
    "[INFO] Loading configuration...",
    "[INFO] Configuration loaded successfully",
    "[INFO] Checking dependencies...",
    "[INFO] All dependencies satisfied",
    "[INFO] Starting core service...",
  ];
  
  const progressLogs = [
    "[INFO] Loading model weights...",
    "[INFO] Model: stable-diffusion-xl-base-1.0",
    "[INFO] Loading checkpoint...",
    "[INFO] Checkpoint loaded successfully",
    "[INFO] Initializing VAE...",
    "[INFO] VAE loaded successfully",
    "[INFO] Initializing CLIP...",
    "[INFO] CLIP loaded successfully",
    "[INFO] Loading LoRA adapters...",
    "[INFO] Initializing scheduler...",
    "[INFO] Warming up...",
    "[INFO] Warmup complete",
    "[INFO] Starting HTTP server...",
    "[INFO] Server started successfully",
    "[INFO] Ready for image generation",
  ];
  
  const logCount = Math.floor((progress / 100) * progressLogs.length);
  return [...baseLogs, ...progressLogs.slice(0, logCount)];
};

const getInitialSteps = (): LaunchStep[] => [
  { id: "1", title: "环境检查", description: "检查系统和依赖", status: "pending" },
  { id: "2", title: "加载配置", description: "读取用户配置", status: "pending" },
  { id: "3", title: "初始化核心", description: "启动核心服务", status: "pending" },
  { id: "4", title: "加载模型", description: "加载AI模型", status: "pending" },
  { id: "5", title: "启动服务", description: "启动HTTP服务", status: "pending" },
];

// 手机酒馆数据 - 统一灰色
const mobileTaverns = [
  {
    id: "mobile-1",
    name: "手机酒馆",
    subtitle: "本地运行",
    version: "v2.1.0",
    status: "running" as const,
    type: "mobile" as const,
    lastUsed: "刚刚",
    icon: <Smartphone className="w-5 h-5" />,
    color: "#9ca3af",
    nodeRuntime: "v18.17.0",
    bionicLibs: "已加载",
    serverStatus: "运行中"
  },
  {
    id: "mobile-2",
    name: "手机酒馆",
    subtitle: "测试环境",
    version: "v2.0.5",
    status: "stopped" as const,
    type: "mobile" as const,
    lastUsed: "2天前",
    icon: <Smartphone className="w-5 h-5" />,
    color: "#9ca3af",
    nodeRuntime: "v16.20.0",
    bionicLibs: "未加载",
    serverStatus: "已停止"
  },
];

// 远程控制数据 - 统一灰色
const remoteControls = [
  {
    id: "remote-1",
    name: "远程控制",
    subtitle: "家里电脑",
    version: "v2.1.0",
    status: "online" as const,
    type: "remote" as const,
    icon: <Laptop className="w-5 h-5" />,
    color: "#9ca3af",
    serverStatus: "在线"
  },
];

const initialTavernInstances: TavernInstance[] = [
  ...mobileTaverns,
  ...remoteControls,
];

type BgMode = "dynamic" | "custom";
type ThemeStyle = "dark" | "light";

function SillyClientLauncher() {
  const [instances, setInstances] = useState<TavernInstance[]>(initialTavernInstances);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<TavernInstance | null>(null);
  const [activeInstance, setActiveInstance] = useState<TavernInstance | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [steps, setSteps] = useState<LaunchStep[]>(getInitialSteps());
  const [isLogExpanded, setIsLogExpanded] = useState(true);
  const [showNewInstanceModal, setShowNewInstanceModal] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 背景设置面板状态
  const [showBgPanel, setShowBgPanel] = useState(false);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [bgMode, setBgMode] = useState<BgMode>("dynamic");

  // 菜单动画状态
  const [isMenuClosing, setIsMenuClosing] = useState(false);

  // 详情页动画状态
  const [isDetailClosing, setIsDetailClosing] = useState(false);

  // 实例卡片菜单状态
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);

  // 导航栏显示设置
  const [navDisplayMode, setNavDisplayMode] = useState<"time" | "quote">("time");
  const [navAlign, setNavAlign] = useState<"left" | "center" | "right">("center");
  const [showNavDropdown, setShowNavDropdown] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("生活不止眼前的苟且，还有诗和远方");
  const [dynamicPaused, setDynamicPaused] = useState(false);
  const [themeStyle, setThemeStyle] = useState<ThemeStyle>("dark");
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState<string | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const isLight = bgMode === "custom" && themeStyle === "light";

  const toggleBgPanel = () => {
    if (showBgPanel) {
      setIsPanelClosing(true);
      setTimeout(() => {
        setShowBgPanel(false);
        setIsPanelClosing(false);
      }, 250);
    } else {
      setShowBgPanel(true);
    }
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomWallpaperUrl(url);
    }
  };

  // 默认深色模式
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // 主题桥接：订阅原生广播的主题（启动页/控制台共享）
  useEffect(() => {
    if (!Bridge.isNative) return;
    return Bridge.on(Event.THEME, (p: any) => {
      const dark = (p?.theme ?? 'dark') === 'dark';
      setIsDarkMode(dark);
      document.documentElement.classList.toggle('dark', dark);
    });
  }, []);

  const toggleTheme = () => {
    if (Bridge.isNative) {
      Bridge.call(Action.SET_THEME, { theme: isDarkMode ? 'light' : 'dark' });
      return;
    }
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (!isLaunching || !activeInstance) return;
    if (Bridge.isNative) return; // 原生壳内由 native 推进度，跳过模拟爬升

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsLaunching(false);
          setInstances(prev => prev.map(i => 
            i.id === activeInstance.id 
              ? { ...i, status: "running", isLaunching: false, progress: 100 }
              : i
          ));
          clearInterval(interval);
          return 100;
        }
        const increment = Math.random() * 5 + 2;
        return Math.min(prev + increment, 100);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isLaunching, activeInstance]);

  useEffect(() => {
    if (!activeInstance) return;
    if (!Bridge.isNative) setLogs(generateLogs(progress, activeInstance.name)); // 原生模式日志由 native 推送
    setSteps((prevSteps) => {
      return prevSteps.map((step, index) => {
        const stepThreshold = (index + 1) * (100 / prevSteps.length);
        if (progress >= stepThreshold) {
          return { ...step, status: "completed" };
        } else if (progress >= stepThreshold - (100 / prevSteps.length) && progress < stepThreshold) {
          return { ...step, status: "loading" };
        }
        return { ...step, status: "pending" };
      });
    });
  }, [progress, activeInstance]);

  useEffect(() => {
    if (isLogExpanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isLogExpanded]);

  // ── 原生壳桥接：自动选中酒馆实例，由 native 推送进度/日志/可进入状态 ──
  useEffect(() => {
    if (!Bridge.isNative) return;
    const tavern = initialTavernInstances[0];
    if (!tavern) return;
    setSelectedInstance(tavern);
    setActiveInstance(tavern);
    setIsLaunching(true);
    setInstances(prev => prev.map(i => i.id === tavern.id ? { ...i, isLaunching: true, status: "running" } : i));

    const offProgress = Bridge.on(Event.PROGRESS, (p: any) => {
      const pct = typeof p === "number" ? p : (p?.pct ?? 0);
      setProgress(pct);
      setIsLaunching(pct < 100);
      setInstances(prev => prev.map(i => i.id === tavern.id ? { ...i, isLaunching: pct < 100, progress: pct, status: pct >= 100 ? "running" : i.status } : i));
    });
    const offLog = Bridge.on(Event.LOG, (l: any) => {
      const line = typeof l === "string" ? l : (l?.line ?? "");
      if (line) setLogs(prev => [...prev, line]);
    });
    const offCanEnter = Bridge.on(Event.CAN_ENTER, (ok: any) => {
      const ready = !!ok;
      setInstances(prev => prev.map(i => i.id === tavern.id ? { ...i, status: ready ? "running" : "stopped", isLaunching: false, progress: ready ? 100 : i.progress } : i));
      if (ready) setIsLaunching(false);
    });
    return () => { offProgress(); offLog(); offCanEnter(); };
  }, []);

  // 挂载并订阅后，主动向原生拉取当前状态（规避订阅与原生推送的时机竞争）
  useEffect(() => {
    if (!Bridge.isNative) return;
    Bridge.call(Action.REQUEST_STATE);
  }, []);

  const handleLaunchInstance = (instance: TavernInstance) => {
    setActiveInstance(instance);
    setProgress(0);
    setIsLaunching(true);
    setSteps(getInitialSteps());
    setInstances(prev => prev.map(i => 
      i.id === instance.id 
        ? { ...i, isLaunching: true, progress: 0 }
        : i
    ));
  };

  const handleStopInstance = (instanceId: string) => {
    setInstances(prev => prev.map(i => 
      i.id === instanceId 
        ? { ...i, status: "stopped", isLaunching: false, progress: 0 }
        : i
    ));
    if (activeInstance?.id === instanceId) {
      setIsLaunching(false);
      setActiveInstance(null);
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case "loading":
        return <Loader2 className="w-3.5 h-3.5 text-white/90 animate-spin" />;
      case "error":
        return <X className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Circle className="w-3.5 h-3.5 text-white/20" />;
    }
  };

  const getLogLevelColor = (log: string) => {
    if (log.includes("[ERROR]")) return "text-red-400";
    if (log.includes("[WARN]")) return "text-white/90";
    if (log.includes("[INFO]")) return "text-blue-400";
    return "text-white/50";
  };

  const getStatusColor = (status: TavernInstance["status"]) => {
    switch (status) {
      case "running": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "stopped": return "bg-white/5 text-white/40 border-white/10";
      case "error": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "online": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "offline": return "bg-white/5 text-white/40 border-white/10";
    }
  };

  const getStatusText = (status: TavernInstance["status"]) => {
    switch (status) {
      case "running": return "运行中";
      case "stopped": return "已停止";
      case "error": return "错误";
      case "online": return "在线";
      case "offline": return "离线";
    }
  };

  // 详情页
  if (selectedInstance || isDetailClosing) {
    const isThisLaunching = selectedInstance?.isLaunching && activeInstance?.id === selectedInstance?.id;
    const currentProgress = isThisLaunching ? progress : (selectedInstance?.progress || 0);
    const currentLogs = isThisLaunching ? logs : [];
    const currentSteps = isThisLaunching ? steps : getInitialSteps();
    const currentStep = currentSteps.find(s => s.status === "loading") || currentSteps.find(s => s.status === "pending") || currentSteps[currentSteps.length - 1];

    return (
      <div
        className={cn(
          "min-h-screen overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isLight ? "bg-[#f0ece8] text-[#1a1625]" : "bg-[#1a1625] text-white",
          isDetailClosing ? "opacity-0 scale-[0.95] translate-y-4" : "opacity-100 scale-100 translate-y-0"
        )}
      >
        {/* 动态背景光效 */}
        {bgMode === "dynamic" && (
          <div className={cn("ambient-glow-container", dynamicPaused && "ambient-paused")}>
            <div className="ambient-glow ambient-glow-1" />
            <div className="ambient-glow ambient-glow-2" />
            <div className="ambient-glow ambient-glow-3" />
          </div>
        )}

        {/* 状态栏 */}
        <div className={cn("fixed top-0 left-0 right-0 z-[60] px-6 pt-3 pb-1 flex items-center justify-between text-xs font-medium", isLight ? "text-[#1a1625]/60" : "text-white/60")}>
          <span className="tabular-nums">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5">
            <Signal className={cn("w-3.5 h-3.5", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
            <Wifi className={cn("w-3.5 h-3.5", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
            <Battery className={cn("w-4 h-4", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
          </div>
        </div>

        {/* 顶部导航 */}
        <header className="fixed top-8 left-0 right-0 z-50 px-4">
          <div className={cn("h-12 flex items-center justify-between px-3 rounded-[var(--radius-3xl)] border backdrop-blur-[40px] saturate-180", isLight ? "bg-white/60 border-black/5" : "glass-panel")}>
            <button
              onClick={() => {
                setIsDetailClosing(true);
                setTimeout(() => {
                  setSelectedInstance(null);
                  setIsDetailClosing(false);
                }, 400);
              }}
              className={cn("capsule-btn px-4 h-9 flex items-center justify-center gap-2 text-xs font-medium", isLight ? "text-[#1a1625]/80" : "text-white/80")}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>

            <div className="flex items-center gap-2">
              <div style={{ color: selectedInstance.color }}>
                {selectedInstance.icon}
              </div>
              <span className={cn("font-semibold text-sm", isLight ? "text-[#1a1625]" : "text-white/90")}>{selectedInstance.name}</span>
            </div>

            <button className={cn("capsule-btn px-4 h-9 flex items-center justify-center gap-2 text-xs font-medium", isLight ? "text-[#1a1625]/80" : "text-white/80")}>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 主内容 */}
        <main className="pt-24 pb-6 px-6 max-w-4xl mx-auto">
          {/* 实例信息卡片 */}
          <div
            className={cn(
              "comfy-card p-6 mb-6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10",
              isDetailClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
            )}
            style={{ transitionDelay: isDetailClosing ? "0ms" : "80ms" }}
          >
            <div className="flex items-center gap-4 mb-4">
              <div style={{ color: selectedInstance.color }} className="scale-150">
                {selectedInstance.icon}
              </div>
              <div>
                <div className={cn("text-xl font-semibold", isLight ? "text-[#1a1625]" : "text-white")}>{selectedInstance.name}</div>
                <div className={cn("text-sm", isLight ? "text-[#1a1625]/50" : "text-white/50")}>{selectedInstance.subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("px-3 py-1 rounded-full text-xs border", getStatusColor(selectedInstance.status))}>
                {getStatusText(selectedInstance.status)}
              </span>
              <span className={cn("text-sm", isLight ? "text-[#1a1625]/40" : "text-white/40")}>{selectedInstance.version}</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div
            className={cn(
              "flex gap-3 mb-6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isDetailClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
            )}
            style={{ transitionDelay: isDetailClosing ? "0ms" : "160ms" }}
          >
            {selectedInstance.status === "stopped" && !isThisLaunching && (
                <button
                  onClick={() => Bridge.isNative ? Bridge.call(Action.DIAGNOSE) : handleLaunchInstance(selectedInstance)}
                  className={cn("flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-colors", isLight ? "bg-[#1a1625] text-white hover:bg-[#1a1625]/90" : "bg-white/90 text-[#1a1625] hover:bg-white")}
                >
                  <Play className="w-4 h-4" />
                  启动环境
                </button>
            )}
            {selectedInstance.status === "running" && !isThisLaunching && (
              <>
                <button
                  onClick={() => Bridge.call(Action.ENTER)}
                  className={cn("flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-colors", isLight ? "bg-[#1a1625] text-white hover:bg-[#1a1625]/90" : "bg-white/90 text-[#1a1625] hover:bg-white")}
                >
                  <ExternalLink className="w-4 h-4" />
                  打开界面
                </button>
                <button
                  onClick={() => handleStopInstance(selectedInstance.id)}
                  className={cn("h-12 px-4 rounded-xl flex items-center justify-center transition-colors", isLight ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30")}
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              </>
            )}
            {isThisLaunching && (
              <button
                onClick={() => handleStopInstance(selectedInstance.id)}
                className={cn("flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-colors", isLight ? "bg-black/10 text-[#1a1625] hover:bg-black/15 border border-black/10" : "bg-white/10 text-white/90 hover:bg-white/15 border border-white/15")}
              >
                <Pause className="w-4 h-4" />
                停止启动
              </button>
            )}
          </div>

          {/* 启动进度区域 */}
          {(isThisLaunching || selectedInstance.status === "running") && (
            <div
              className={cn(
                "space-y-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isDetailClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
              )}
              style={{ transitionDelay: isDetailClosing ? "0ms" : "240ms" }}
            >
              {/* 进度条 */}
              <div className={cn("p-4 rounded-2xl", isLight ? "bg-black/5" : "bg-white/5")}>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className={cn("flex items-center gap-2", isLight ? "text-[#1a1625]/60" : "text-white/60")}>
                    {isThisLaunching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {currentStep?.title || "正在启动..."}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        启动完成
                      </>
                    )}
                  </span>
                  <span className={cn("font-mono", isLight ? "text-[#1a1625]" : "text-white/90")}>{Math.round(currentProgress)}%</span>
                </div>
                <div className={cn("h-2 rounded-full overflow-hidden", isLight ? "bg-black/10" : "bg-white/10")}>
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", isLight ? "bg-[#1a1625]/60" : "bg-gradient-to-r from-white/70 to-white/50")}
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
              </div>

              {/* 日志区域 */}
              <div className={cn("overflow-hidden rounded-2xl border", isLight ? "bg-black/5 border-black/10" : "bg-white/5 border-white/10")}>
                <div
                  className={cn("flex items-center justify-between px-4 py-3 border-b cursor-pointer", isLight ? "border-black/10" : "border-white/10")}
                  onClick={() => setIsLogExpanded(!isLogExpanded)}
                >
                  <div className="flex items-center gap-2">
                    <Terminal className={cn("w-4 h-4", isLight ? "text-[#1a1625]/50" : "text-white/50")} />
                    <span className={cn("text-sm font-medium", isLight ? "text-[#1a1625]" : "text-white")}>运行日志</span>
                    {isThisLaunching && (
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px]", isLight ? "bg-black/10 text-[#1a1625]" : "bg-white/10 text-white/90")}>
                        实时
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const text = currentLogs.join('\n');
                        if (Bridge.isNative) Bridge.call(Action.COPY_LOGS, { text });
                        else navigator.clipboard.writeText(text);
                      }}
                      className={cn("p-1.5 rounded transition-colors", isLight ? "hover:bg-black/5" : "hover:bg-white/5")}
                    >
                      <Copy className={cn("w-3.5 h-3.5", isLight ? "text-[#1a1625]/40" : "text-white/40")} />
                    </button>
                    {isLogExpanded ? (
                      <ChevronDown className={cn("w-4 h-4", isLight ? "text-[#1a1625]/40" : "text-white/40")} />
                    ) : (
                      <ChevronUp className={cn("w-4 h-4", isLight ? "text-[#1a1625]/40" : "text-white/40")} />
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    isLogExpanded ? "max-h-64" : "max-h-0"
                  )}
                >
                  <div className={cn("p-4 font-mono text-xs overflow-y-auto max-h-64", isLight ? "bg-black/5" : "bg-black/20")}>
                    {currentLogs.length > 0 ? (
                      currentLogs.map((log, index) => (
                        <div key={index} className={cn("py-0.5", getLogLevelColor(log))}>
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className={cn("py-4 text-center", isLight ? "text-[#1a1625]/30" : "text-white/30")}>
                        暂无日志
                      </div>
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // 主页 - Comfy Desktop 风格
  return (
    <div className={cn(
      "min-h-screen overflow-hidden transition-colors duration-500",
      isLight ? "bg-[#f0ece8] text-[#1a1625]" : "bg-[#1a1625] text-white"
    )}>
      {/* 动态背景光效 */}
      {bgMode === "dynamic" && (
        <div className={cn("ambient-glow-container", dynamicPaused && "ambient-paused")}>
          <div className="ambient-glow ambient-glow-1" />
          <div className="ambient-glow ambient-glow-2" />
          <div className="ambient-glow ambient-glow-3" />
          <div className="ambient-glow ambient-glow-4" />
          <div className="ambient-glow ambient-glow-5" />
        </div>
      )}

      {/* 自定义壁纸背景 */}
      {bgMode === "custom" && customWallpaperUrl && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${customWallpaperUrl})` }}
        />
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={wallpaperInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleWallpaperUpload}
      />

      {/* 背景设置展开面板 */}
      {(showBgPanel || isPanelClosing) && (
      <div className={cn(
        "fixed top-[5.5rem] left-1/2 -translate-x-1/2 z-[55] w-72 border backdrop-blur-[40px] saturate-180 rounded-[var(--radius-3xl)]",
        isLight ? "bg-white/60 border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "glass-panel",
        isPanelClosing ? "bg-panel-exit" : "bg-panel-enter"
      )}>
        <div className="p-4 space-y-4">
          {/* 面板标题 */}
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-semibold", isLight ? "text-[#1a1625]" : "text-white/90")}>背景设置</span>
            <button onClick={toggleBgPanel} className={cn("p-1 rounded-lg transition-colors", isLight ? "hover:bg-black/5 text-[#1a1625]/60" : "hover:bg-white/5 text-white/40")}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 模式选择 - 仅动态和自定义 */}
          <div className="space-y-1.5">
            <span className={cn("text-xs font-medium", isLight ? "text-[#1a1625]/50" : "text-white/40")}>背景模式</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setBgMode("dynamic")}
                className={cn(
                  "px-2 py-2 rounded-lg text-xs font-medium transition-all border",
                  bgMode === "dynamic"
                    ? isLight ? "bg-black/10 border-black/20 text-[#1a1625]" : "bg-white/10 border-white/20 text-white/90"
                    : isLight
                      ? "bg-black/5 border-black/10 text-[#1a1625]/60 hover:bg-black/10"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                基础
              </button>
              <button
                onClick={() => setBgMode("custom")}
                className={cn(
                  "px-2 py-2 rounded-lg text-xs font-medium transition-all border",
                  bgMode === "custom"
                    ? isLight ? "bg-black/10 border-black/20 text-[#1a1625]" : "bg-white/10 border-white/20 text-white/90"
                    : isLight
                      ? "bg-black/5 border-black/10 text-[#1a1625]/60 hover:bg-black/10"
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                自定义
              </button>
            </div>
          </div>

          {/* 动态壁纸拨杆 */}
          {bgMode === "dynamic" && (
            <div className="flex items-center justify-between py-1">
              <span className={cn("text-xs font-medium", isLight ? "text-[#1a1625]" : "text-white/90")}>动态壁纸</span>
              <button
                onClick={() => setDynamicPaused(!dynamicPaused)}
                className="ios-toggle"
                aria-label="切换动态壁纸"
              >
                <div className={cn("ios-toggle-track", !dynamicPaused && "ios-toggle-track-active")}>
                  <div className="ios-toggle-icons">
                    <span className="ios-toggle-icon-off">○</span>
                    <span className="ios-toggle-icon-on">│</span>
                  </div>
                  <div className={cn("ios-toggle-thumb", !dynamicPaused && "ios-toggle-thumb-active")} />
                </div>
              </button>
            </div>
          )}

          {/* 自定义模式设置 */}
          {bgMode === "custom" && (
            <div className="space-y-3">
              {/* 暗夜/白天切换 */}
              <div className="space-y-1.5">
                <span className={cn("text-xs font-medium", isLight ? "text-[#1a1625]/50" : "text-white/40")}>主题风格</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setThemeStyle("dark"); if (Bridge.isNative) Bridge.call(Action.SET_THEME, { theme: 'dark' }); }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border",
                      themeStyle === "dark"
                        ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                        : isLight
                          ? "bg-black/5 border-black/10 text-[#1a1625]/60 hover:bg-black/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    暗夜
                  </button>
                  <button
                    onClick={() => { setThemeStyle("light"); if (Bridge.isNative) Bridge.call(Action.SET_THEME, { theme: 'light' }); }}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all border",
                      themeStyle === "light"
                        ? isLight ? "bg-black/10 border-black/20 text-[#1a1625]" : "bg-white/10 border-white/20 text-white/90"
                        : isLight
                          ? "bg-black/5 border-black/10 text-[#1a1625]/60 hover:bg-black/10"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    白天
                  </button>
                </div>
              </div>

              {/* 导入图片壁纸 */}
              <div className="space-y-1.5">
                <span className={cn("text-xs font-medium", isLight ? "text-[#1a1625]/50" : "text-white/40")}>壁纸图片</span>
                <button
                  onClick={() => wallpaperInputRef.current?.click()}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border",
                    isLight
                      ? "bg-black/5 border-black/10 hover:bg-black/10 text-[#1a1625]"
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    customWallpaperUrl ? "bg-emerald-500/20 text-emerald-400" : isLight ? "bg-black/10 text-[#1a1625]/50" : "bg-white/10 text-white/50"
                  )}>
                    {customWallpaperUrl ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-medium", isLight ? "text-[#1a1625]" : "text-white/90")}>
                      {customWallpaperUrl ? "已导入壁纸" : "导入本地图片"}
                    </div>
                    <div className={cn("text-[10px] truncate", isLight ? "text-[#1a1625]/50" : "text-white/40")}>
                      {customWallpaperUrl ? "点击更换" : "支持 JPG / PNG / WebP"}
                    </div>
                  </div>
                </button>
                {customWallpaperUrl && (
                  <button
                    onClick={() => setCustomWallpaperUrl(null)}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-[10px] font-medium transition-all border",
                      isLight
                        ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/15"
                        : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15"
                    )}
                  >
                    移除壁纸
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 状态栏 */}
      <div className="fixed top-0 left-0 right-0 z-[60] px-6 pt-3 pb-1 flex items-center justify-between text-xs font-medium">
        <span className={cn("tabular-nums", isLight ? "text-[#1a1625]/60" : "text-white/60")}>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex items-center gap-1.5">
          <Signal className={cn("w-3.5 h-3.5", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
          <Wifi className={cn("w-3.5 h-3.5", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
          <Battery className={cn("w-4 h-4", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
        </div>
      </div>

      {/* 顶部导航 */}
      <header className="fixed top-8 left-0 right-0 z-50 px-4">
        <div className={cn("h-12 flex items-center px-3 rounded-[var(--radius-3xl)] border backdrop-blur-[40px] saturate-180 transition-colors", isLight ? "bg-white/60 border-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]" : "glass-panel")}>
          {/* 左侧：交通灯（仅作为状态指示器） */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={cn("traffic-light-btn flex items-center gap-2 group px-2 py-1.5 rounded-full border", isLight ? "border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05),0_1px_2px_rgba(255,255,255,0.5)]" : "border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_2px_rgba(255,255,255,0.1)]")}
            >
              <div className={cn("w-3 h-3 rounded-full transition-all", isLight ? "bg-red-400" : "bg-red-500")} />
              <div className={cn("w-3 h-3 rounded-full transition-all", dynamicPaused ? "bg-amber-300" : "bg-amber-500")} />
              <div className={cn("w-3 h-3 rounded-full transition-all", bgMode === "dynamic" && !dynamicPaused ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" : "bg-emerald-500/50")} />
            </div>
          </div>

          {/* 中间：浏览器标签页样式 - 显示时间或实例名称 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <button
                onClick={toggleBgPanel}
                className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full transition-all max-w-[200px] border", isLight ? "hover:bg-black/5 border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05),0_1px_2px_rgba(255,255,255,0.5)]" : "hover:bg-white/10 border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_2px_rgba(255,255,255,0.1)]", selectedInstance ? (isLight ? "bg-black/5" : "bg-white/10") : "")}
              >
                {selectedInstance ? (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: (selectedInstance as TavernInstance).color }}
                  />
                ) : null}
                <span className={cn("text-sm font-medium truncate", isLight ? "text-[#1a1625]" : "text-white")}>
                  {selectedInstance ? (selectedInstance as TavernInstance).name : new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <ChevronDown className={cn("w-4 h-4 flex-shrink-0 transition-transform", isLight ? "text-[#1a1625]/60" : "text-white/60", showBgPanel && "rotate-180")} />
              </button>
            </div>
          </div>

          {/* 右侧：菜单按钮 */}
          <button
            onClick={() => { setIsMenuClosing(false); setShowMenu(true); }}
            className={cn("capsule-btn px-4 h-9 flex items-center justify-center gap-2 text-xs font-medium flex-shrink-0", isLight ? "text-[#1a1625]/80" : "text-white/80")}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 全屏菜单界面 */}
      {(showMenu || isMenuClosing) && (
        <div
          className={cn(
            "fixed inset-0 z-[100] min-h-screen transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            isLight ? "bg-[#f0ece8]" : "bg-[#1a1625]",
            isMenuClosing ? "opacity-0 scale-[0.95] translate-y-4" : "opacity-100 scale-100 translate-y-0"
          )}
        >
          {/* 顶部导航 */}
          <header className="fixed top-8 left-0 right-0 z-[101] px-4">
            <div
              className={cn(
                "h-12 flex items-center justify-between px-3 rounded-[var(--radius-3xl)] border backdrop-blur-[40px] saturate-180 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isLight ? "bg-white/60 border-black/5" : "glass-panel",
                isMenuClosing ? "opacity-0 -translate-y-8" : "opacity-100 translate-y-0"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isLight ? "linear-gradient(135deg, rgba(26,22,37,0.8), rgba(26,22,37,0.6))" : "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))" }}>
                  <span className="text-white font-black text-lg">A</span>
                </div>
                <span className={cn("font-bold text-lg", isLight ? "text-[#1a1625]" : "text-white")}>菜单</span>
              </div>
              <button
                onClick={() => {
                  setIsMenuClosing(true);
                  setTimeout(() => {
                    setShowMenu(false);
                    setIsMenuClosing(false);
                  }, 400);
                }}
                className={cn("capsule-btn px-4 h-9 flex items-center justify-center gap-2 text-xs font-medium", isLight ? "text-[#1a1625]/80" : "text-white/80")}
              >
                <X className="w-4 h-4" />
                关闭
              </button>
            </div>
          </header>

          {/* 主内容区 */}
          <main className="pt-24 pb-12 px-6 min-h-screen">
            <div
              className={cn(
                "max-w-4xl mx-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isMenuClosing ? "opacity-0 translate-y-12" : "opacity-100 translate-y-0"
              )}
            >
              {/* 应用信息 */}
              <div
                className={cn(
                  "p-6 rounded-2xl mb-8 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  isLight ? "bg-black/5" : "bg-white/5",
                  isMenuClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
                )}
                style={{ transitionDelay: isMenuClosing ? "0ms" : "80ms" }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: isLight ? "linear-gradient(135deg, rgba(26,22,37,0.8), rgba(26,22,37,0.6))" : "linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.5))" }}>
                    <span className="text-white font-black text-2xl">A</span>
                  </div>
                  <div>
                    <div className={cn("font-bold text-xl", isLight ? "text-[#1a1625]" : "text-white")}>SillyClient</div>
                    <div className={cn("text-sm", isLight ? "text-[#1a1625]/50" : "text-white/50")}>Desktop v2.1.0</div>
                  </div>
                </div>
              </div>

              {/* 功能菜单 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: <Monitor className={cn("w-8 h-8 mb-4", isLight ? "text-[#1a1625]" : "text-white")} />, title: "我的酒馆", desc: "管理本地实例" },
                  { icon: <Download className={cn("w-8 h-8 mb-4", isLight ? "text-[#1a1625]" : "text-white")} />, title: "模型管理", desc: "下载和管理模型" },
                  { icon: <Settings className={cn("w-8 h-8 mb-4", isLight ? "text-[#1a1625]" : "text-white")} />, title: "设置", desc: "应用偏好设置" },
                ].map((item, index) => (
                  <button
                    key={item.title}
                    className={cn(
                      "p-6 rounded-2xl text-left transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                      isLight ? "bg-black/5 hover:bg-black/10" : "bg-white/5 hover:bg-white/10",
                      isMenuClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
                    )}
                    style={{ transitionDelay: isMenuClosing ? "0ms" : `${160 + index * 80}ms` }}
                  >
                    {item.icon}
                    <div className={cn("font-semibold text-lg mb-1", isLight ? "text-[#1a1625]" : "text-white")}>{item.title}</div>
                    <div className={cn("text-sm", isLight ? "text-[#1a1625]/50" : "text-white/50")}>{item.desc}</div>
                  </button>
                ))}
              </div>

              {/* 存储空间 */}
              <div
                className={cn(
                  "mt-8 p-6 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  isLight ? "bg-black/5" : "bg-white/5",
                  isMenuClosing ? "opacity-0 translate-y-12 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
                )}
                style={{ transitionDelay: isMenuClosing ? "0ms" : "400ms" }}
              >
                <div className={cn("flex items-center justify-between mb-4", isLight ? "text-[#1a1625]" : "text-white")}>
                  <span className="font-medium">存储空间</span>
                  <span className="text-sm opacity-60">已用 167GB / 共 256GB</span>
                </div>
                <div className={cn("h-3 rounded-full overflow-hidden", isLight ? "bg-black/10" : "bg-white/10")}>
                  <div className={cn("h-full w-[65%] rounded-full", isLight ? "bg-[#1a1625]/60" : "bg-gradient-to-r from-white/70 to-white/50")} />
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 主内容区 */}
      <main className="pt-24 pb-12 px-6 min-h-screen flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className={cn("text-4xl font-black italic tracking-tight text-transparent bg-clip-text", isLight ? "bg-gradient-to-r from-[#1a1625] to-[#1a1625]/70" : "bg-gradient-to-r from-white to-white/80")}>
            SillyClient
          </h1>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-10 w-full max-w-2xl">
          <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", isLight ? "text-[#1a1625]/40" : "text-white/40")} />
          <input
            type="text"
            placeholder="搜索并打开实例"
            className={cn(
              "w-full h-14 pl-12 pr-4 rounded-2xl border focus:outline-none focus:border-[#1a1625]/30 transition-all",
              isLight
                ? "bg-black/5 border-black/10 text-[#1a1625] placeholder:text-[#1a1625]/40 focus:bg-black/8"
                : "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10"
            )}
          />
        </div>

        {/* 卡片区域 */}
        <div className="w-full max-w-6xl mx-auto px-6 md:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {/* 新建实例卡片 */}
            <button
              onClick={() => setShowNewInstanceModal(true)}
              className={cn(
                "comfy-card w-40 sm:w-44 md:w-48 h-32 p-4 flex flex-col items-start justify-between transition-all group flex-shrink-0",
                isLight ? "hover:border-black/20" : "hover:border-white/15"
              )}
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center group-hover:bg-white/5 transition-colors", isLight ? "bg-black/5" : "bg-white/5")}>
                <Plus className={cn("w-4 h-4 group-hover:text-white transition-colors", isLight ? "text-[#1a1625]/60" : "text-white/60")} />
              </div>
              <div>
                <div className={cn("text-sm font-semibold mb-0.5", isLight ? "text-[#1a1625]" : "text-white")}>新建实例</div>
                <div className={cn("text-xs", isLight ? "text-[#1a1625]/40" : "text-white/40")}>设置新环境</div>
              </div>
            </button>

            {/* 实例卡片 */}
            {instances.map((instance) => (
              <div
                key={instance.id}
                className={cn(
                  "comfy-card w-40 sm:w-44 md:w-48 h-32 p-4 flex flex-col items-start justify-between transition-all text-left flex-shrink-0 relative",
                  isLight ? "hover:border-black/20" : "hover:border-white/20"
                )}
              >
                {/* 右上角三点菜单 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCardMenu(activeCardMenu === instance.id ? null : instance.id);
                  }}
                  className={cn(
                    "absolute top-3 right-3 p-1.5 rounded-lg transition-colors z-10",
                    isLight ? "hover:bg-black/5 text-[#1a1625]/60" : "hover:bg-white/5 text-white/60"
                  )}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* 下拉菜单 */}
                {activeCardMenu === instance.id && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActiveCardMenu(null)}
                    />
                    <div
                      className={cn(
                        "absolute top-10 -right-2 w-40 py-2 rounded-[15px] border z-50 shadow-lg origin-top-right transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        isLight ? "bg-white/95 border-black/10" : "bg-[#1a1625]/95 border-white/10",
                        "animate-in fade-in zoom-in-95 slide-in-from-top-2"
                      )}
                    >
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors", isLight ? "text-[#1a1625] hover:bg-black/5" : "text-white hover:bg-white/5")}>
                        管理
                      </button>
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors", isLight ? "text-[#1a1625] hover:bg-black/5" : "text-white hover:bg-white/5")}>
                        恢复快照
                      </button>
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors", isLight ? "text-[#1a1625] hover:bg-black/5" : "text-white hover:bg-white/5")}>
                        Show in Explorer
                      </button>
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors", isLight ? "text-[#1a1625] hover:bg-black/5" : "text-white hover:bg-white/5")}>
                        分享
                      </button>
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors", isLight ? "text-[#1a1625] hover:bg-black/5" : "text-white hover:bg-white/5")}>
                        复制实例
                      </button>
                      <div className={cn("my-1 h-px", isLight ? "bg-black/10" : "bg-white/10")} />
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors text-red-500", isLight ? "hover:bg-red-50" : "hover:bg-red-500/10")}>
                        忘记
                      </button>
                      <button className={cn("w-full px-4 py-2.5 text-left text-sm transition-colors text-red-500", isLight ? "hover:bg-red-50" : "hover:bg-red-500/10")}>
                        卸载
                      </button>
                    </div>
                  </>
                )}

                <div
                  onClick={() => { setIsDetailClosing(false); setSelectedInstance(instance); }}
                  className="w-full h-full flex flex-col items-start justify-between cursor-pointer"
                >
                  <div style={{ color: instance.color }}>
                    {instance.icon}
                  </div>
                  <div className="w-full">
                    <div className={cn("text-sm font-semibold mb-0.5", isLight ? "text-[#1a1625]" : "text-white")}>{instance.name}</div>
                    <div className={cn("flex items-center gap-1.5 text-xs", isLight ? "text-[#1a1625]/40" : "text-white/40")}>
                      <span>{instance.subtitle}</span>
                      {instance.version && (
                        <span className={isLight ? "text-[#1a1625]/30" : "text-white/30"}>· {instance.version}</span>
                      )}
                    </div>
                    {instance.serverStatus && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] border", getStatusColor(instance.status))}>
                          {getStatusText(instance.status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 新建实例弹窗 */}
      {showNewInstanceModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowNewInstanceModal(false)}
          />
          <div className={cn("fixed inset-x-4 top-20 bottom-4 z-50 border rounded-2xl overflow-hidden max-w-2xl mx-auto", isLight ? "bg-[#f0ece8] border-black/10" : "bg-[#1a1625] border-white/10")}>
            <div className={cn("flex items-center justify-between px-6 py-4 border-b", isLight ? "border-black/10" : "border-white/10")}>
              <span className={cn("font-semibold text-lg", isLight ? "text-[#1a1625]" : "text-white")}>新建酒馆环境</span>
              <button
                onClick={() => setShowNewInstanceModal(false)}
                className={cn("p-2 rounded-lg transition-colors", isLight ? "hover:bg-black/5" : "hover:bg-white/5")}
              >
                <X className={cn("w-5 h-5", isLight ? "text-[#1a1625]" : "text-white")} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <div>
                <label className={cn("text-sm mb-2 block", isLight ? "text-[#1a1625]/50" : "text-white/50")}>环境名称</label>
                <input
                  type="text"
                  placeholder="输入环境名称"
                  className={cn(
                    "w-full h-12 px-4 rounded-xl border focus:outline-none focus:border-[#1a1625]/30",
                    isLight
                      ? "bg-black/5 border-black/10 text-[#1a1625] placeholder:text-[#1a1625]/30"
                      : "bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  )}
                />
              </div>
              <div>
                <label className={cn("text-sm mb-2 block", isLight ? "text-[#1a1625]/50" : "text-white/50")}>环境类型</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Smartphone className="w-5 h-5" />, name: "手机酒馆", desc: "本地运行", color: "oklch(0.72_0.18_150)" },
                    { icon: <Laptop className="w-5 h-5" />, name: "电脑酒馆", desc: "远程连接", color: "oklch(0.6_0.1_250)" },
                    { icon: <Cloud className="w-5 h-5" />, name: "云端酒馆", desc: "云服务", color: "oklch(0.65_0.15_145)" },
                  ].map((type, i) => (
                    <button
                      key={type.name}
                      className={cn(
                        "p-4 rounded-xl text-left transition-all border",
                        i === 0
                          ? isLight ? "bg-black/5 border-black/20" : "bg-white/10 border-white/15"
                          : isLight ? "bg-black/3 border-black/10 hover:border-black/20" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      <div className="mb-2" style={{ color: type.color }}>{type.icon}</div>
                      <div className={cn("font-medium text-sm", isLight ? "text-[#1a1625]" : "text-white")}>{type.name}</div>
                      <div className={cn("text-xs", isLight ? "text-[#1a1625]/40" : "text-white/40")}>{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={cn("text-sm mb-2 block", isLight ? "text-[#1a1625]/50" : "text-white/50")}>模型版本</label>
                <div className="space-y-2">
                  <button className={cn("w-full p-4 rounded-xl border text-left", isLight ? "bg-black/5 border-black/20" : "bg-white/10 border-white/15")}>
                    <div className={cn("font-medium", isLight ? "text-[#1a1625]" : "text-white")}>完整版</div>
                    <div className={cn("text-sm", isLight ? "text-[#1a1625]/40" : "text-white/40")}>6.9GB · 最高质量</div>
                  </button>
                  <button className={cn("w-full p-4 rounded-xl border text-left transition-colors", isLight ? "bg-black/3 border-black/10 hover:border-black/20" : "bg-white/5 border-white/10 hover:border-white/20")}>
                    <div className={cn("font-medium", isLight ? "text-[#1a1625]" : "text-white")}>轻量版</div>
                    <div className={cn("text-sm", isLight ? "text-[#1a1625]/40" : "text-white/40")}>3.2GB · 快速生成</div>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowNewInstanceModal(false)}
                className={cn("w-full h-12 rounded-xl font-medium hover:opacity-90 transition-opacity", isLight ? "bg-[#1a1625] text-white" : "bg-gradient-to-r from-white to-white/80 text-[#1a1625]")}
              >
                创建环境
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SillyClientLauncher;
