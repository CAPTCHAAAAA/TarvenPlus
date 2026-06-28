# Tarven++

One-click SillyTavern launcher for Android. No Termux, no command lines — install the APK, open the app, and your tavern is ready.

> **技术路线（转向 Capacitor）**
> 本仓为 **当前安卓实现基线**（package `com.sillyclient`，自撸混合壳）。我们正转向
> **Capacitor 多端**（以前端 UI 开发为主，仅适配已做好的 webUI 前端），目标工程见
> [`TarvenIonicApp`](../TarvenIonicApp)（`com.tarven.plus`，Ionic React + Capacitor 8）。
> 平台相关、已锁定的部分不再动：**Node.js 本地启服**、**变色龙顶框取色**（见下）。
> 后续：把 `web/console`、`web/launch` 等 webUI 经 Capacitor 框架接入，替代当前自撸 `TarvenN` 桥。

## How it works

1. Install the APK
2. Open Tarven++
3. First launch downloads SillyTavern (~130 MB, one-time)
4. Tavern starts automatically, WebView loads `http://127.0.0.1:8000`

## 当下安卓端实现

- **Node.js 本地运行时**：`libtarven-node.so`（Node v24 Bionic）+ `rootfs-libs.zip` 打包进 APK，
  运行时解压并以 `ProcessBuilder` 起本地服务，监听 `127.0.0.1:8000`，WebView 再加载之。
  实现在 `runtime/*` + `MainActivity` 的 `provisionAndStart/extractNativeLibs/startServer/pollUntilReady`。**锁定不改。**
- **变色龙顶框（顶条带自适应取色）**：`MainActivity.sampleTopColor` 用 `PixelCopy` 读酒馆页顶部
  3px×全宽条带 → 平均色 → `TopScrimBar`（`TopColor` 折算三段渐变 45/80/100%）做 scrim + 点击白色光波 +
  自下而上色波。**锁定不改（`DO NOT CHANGE`）。** 取色层读远端页真实像素、无可移植 API，
  转 Capacitor 后以原生插件补回。
- **SillyTavern 承载**：酒馆 WebView 加载 `http://127.0.0.1:8000`（远端页，非自有内容）。
- **启动页**：`web/launch`（React + Vite 单文件 `index.html`，`assets/ui/launch/`）。
- **JS↔原生桥**：自撸单入口 JSON 桥——`window.TarvenN.invoke(action, payloadJson)`（JS→原生）
  与 `window.__tarvenDispatch(event, payloadJson)`（原生→JS）。契约见 `web/launch/src/bridge.ts`。
  **待 Capacitor 插件替代**（不拆，当前在用）。

## Architecture

```
APK assets (bundled)
├── jniLibs/arm64-v8a/
│   ├── libtarven-node.so    # Node.js v24 Bionic runtime
│   └── libc++_shared.so
├── bootstrap/rootfs/
│   └── rootfs-libs.zip      # Runtime shared libraries
├── bootstrap/scripts/
│   └── start-server.sh      # Server launcher
└── assets/ui/launch/
    └── index.html           # 启动页（Vite 单文件 React 产物）

First launch (downloaded)
└── server-source.zip        # SillyTavern + node_modules
    └── → files/tarven/bootstrap/server/
```

## Build

```bash
./gradlew :app:assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

Web 模块（启动页）单独构建后拷入 assets：

```bash
cd web/launch && pnpm build   # 产 dist/index.html（vite-plugin-singlefile）
cp dist/index.html ../../app/src/main/assets/ui/launch/index.html
```

### Pre-built server source

`server-source.zip` 由单独流水线生成并托管在 GitHub Releases。

```bash
bash scripts/build-server-source.sh
```

## Requirements

- Android 8.0+ (API 26)
- arm64-v8a device
- ~200 MB free storage (runtime + tavern)
- Internet connection for first launch

## License

MIT
