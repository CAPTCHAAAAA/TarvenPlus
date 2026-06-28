/**
 * Tarven++ JS ↔ Native bridge (shared contract).
 *
 * 设计：单入口、JSON 字符串传参 —— 避开 @JavascriptInterface 不能传对象、
 * 数字强转等坑。所有数据走 JSON 序列化，两端各 parse。
 *
 * JS → 原生：调 window.TarvenN.invoke(action, payloadJson) —— 原生只有一个
 *           @JavascriptInterface 方法 invoke(action:String, payload:String)，
 *           内部 when(action) 分发。
 * 原生 → JS：原生调 window.__tarvenDispatch(event, payloadJson) —— 这里分发到
 *           Bridge.on(event, cb) 注册的回调。
 *
 * 在浏览器/dev（无 window.TarvenN）时自动降级为 console 日志 + 本地 emit，
 * 便于脱离设备用 chrome 直接调样式。
 */

export type Handler = (payload: any) => void;

// ── JS → 原生 动作名 ──
export const Action = {
  ENTER: 'enter',                 // 进入阅读页（仪表盘 ENTER）
  EXIT: 'exit',                   // 退出阅读页
  GO_BACK: 'goBack',
  GO_FORWARD: 'goForward',
  SET_ZOOM: 'setZoom',            // {pct:number}
  SET_DARK: 'setDark',            // {on:boolean}
  SET_JS: 'setJs',                // {on:boolean}
  SET_COOKIES: 'setCookies',      // {on:boolean}
  SET_UA: 'setUa',                // {value:string}
  REFRESH_LOGS: 'refreshLogs',
  CLEAR_LOGS: 'clearLogs',
  EXPORT_LOGS: 'exportLogs',      // {text:string}
  OPEN_EXTERNAL: 'openExternal',  // {url:string}
  COPY_LOGS: 'copyLogs',          // {text:string}
  ON_CONSOLE_OPEN: 'onConsoleOpen',
  ON_CONSOLE_CLOSED: 'onConsoleClosed',
  DIAGNOSE: 'diagnose',
  REQUEST_STATE: 'requestState',   // web 挂载后主动拉取当前状态
  SET_THEME: 'setTheme',           // {theme:'dark'|'light'} —— 启动页/控制台共享
} as const;

// ── 原生 → JS 事件名 ──
export const Event = {
  PROGRESS: 'progress',           // {pct:number, text?:string}
  LOG: 'log',                     // {line:string} 或 string
  STATUS: 'status',               // {node,libs,server} 各 {ready:boolean,subtitle?:string}
  NAV_STATE: 'navState',          // {canBack,canForward,url,status}
  COLOR: 'color',                 // {hex:string}
  MODE: 'mode',                   // 'dashboard' | 'tavern'
  CAN_ENTER: 'canEnter',          // boolean
  LAUNCHING: 'launching',         // boolean
  VERSION: 'version',             // {text:string}
  THEME: 'theme',                 // {theme:'dark'|'light'} —— 广播给启动页+控制台
} as const;

const handlers: Record<string, Set<Handler>> = {};

function getNative(): any | null {
  const n = (window as any).TarvenN;
  return n && typeof n === 'object' && typeof n.invoke === 'function' ? n : null;
}

function safeParse(json: string | null | undefined): any {
  if (json == null || json === '') return undefined;
  try { return JSON.parse(json); } catch { return json; }
}

export const Bridge = {
  /** 是否运行在原生壳内（window.TarvenN 存在）。 */
  get isNative(): boolean { return getNative() != null; },

  /**
   * JS → 原生。payload 任意可序列化值；原生端 JSON.parse。
   * 无原生时降级为 console 日志（dev）。
   */
  call(action: string, payload?: any): void {
    const n = getNative();
    const json = payload === undefined ? '' : JSON.stringify(payload);
    if (!n) { console.log('[bridge:dev] →', action, payload ?? ''); return; }
    try { n.invoke(action, json); }
    catch (e) { console.error('[bridge] invoke failed', action, e); }
  },

  /**
   * 原生 → JS 订阅。返回取消订阅函数。
   * 同一事件可多订阅；回调出错不影响其它。
   */
  on(event: string, cb: Handler): () => void {
    let set = handlers[event];
    if (!set) { set = new Set(); handlers[event] = set; }
    set.add(cb);
    return () => { set!.delete(cb); };
  },

  /** 本地派发事件（dev 调试用，绕过原生）。 */
  emit(event: string, payload?: any): void {
    const set = handlers[event];
    if (!set) return;
    for (const cb of [...set]) { try { cb(payload); } catch (e) { console.error(e); } }
  },
};

// 原生调用入口：evaluateJavascript("window.__tarvenDispatch('log', '{...}')")
;(window as any).__tarvenDispatch = function (event: string, payloadJson: string | null) {
  Bridge.emit(event, safeParse(payloadJson));
};

// 全局别名，便于非模块场景（HTML 内联 onclick / 调试控制台）调用
;(window as any).Tarven = Bridge;
;(window as any).TarvenBridge = Bridge;

export default Bridge;
