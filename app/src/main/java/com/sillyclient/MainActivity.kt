package com.sillyclient

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.PixelCopy
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.sillyclient.runtime.RuntimePaths
import com.sillyclient.runtime.RuntimeFileUtils
import com.sillyclient.runtime.TarvenProcessRunner
import com.sillyclient.ui.HybridUiHost
import com.sillyclient.ui.TopScrimBar
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {

    private val handler = Handler(Looper.getMainLooper())
    private val topColorPoll: Runnable = Runnable {
        if (isWebViewVisible) {
            sampleTopColor { c -> if (c != null) applyTopColor(c) }
            handler.postDelayed(topColorPoll, 1500)
        }
    }

    // ---- Views ----
    private lateinit var root: FrameLayout
    private lateinit var topScrimBar: TopScrimBar     // 酒馆顶框 scrim 条（渐变+光泽+色波）
    private lateinit var webViewScreen: FrameLayout
    private lateinit var webView: WebView

    // ---- Hybrid UI host (web dashboard / console / bridge) ----
    private lateinit var hybridHost: HybridUiHost

    // ---- State ----
    private lateinit var runner: TarvenProcessRunner
    private var serverReady = false
    private var isWebViewVisible = false
    private var statusBarFixedPx = 0  // fixed physical pixels, never changes

    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null

    companion object {
        private const val TAG = "SillyClient"
        private const val SERVER_SOURCE_URL =
            "https://github.com/CAPTCHAAAAA/TarvenPlus/releases/download/v0.2/server-source.zip"
        private const val TAVERN_URL = "http://127.0.0.1:8000/"
        private val MATCH = ViewGroup.LayoutParams.MATCH_PARENT

        private const val BG = 0xFF070408.toInt()
        private const val STATE_SERVER_READY = "server_ready"
        private const val STATE_WEBVIEW_VISIBLE = "webview_visible"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ╔══════════════════════════════════════════════════════════════╗
        // ║  DO NOT CHANGE — Fullscreen immersion foundation.           ║
        // ║  These 4 lines are the result of 2 weeks of trial-and-error ║
        // ║  against MIUI/HyperOS window state machines.                ║
        // ║  - setDecorFitsSystemWindows(false): content behind bars    ║
        // ║  - SHORT_EDGES: tell MIUI "we own the cutout, don't push"  ║
        // ║  - statusBarFixedPx: from hardware DisplayCutout (116px),   ║
        // ║    NEVER from software insets (they lie).                   ║
        // ║  - CONSUMED insets: WebView never sees layout shifts.        ║
        // ╚══════════════════════════════════════════════════════════════╝
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        // Match window background to Compose BG — eliminates native flash
        window.decorView.setBackgroundColor(BG)
        runner = TarvenProcessRunner()
        statusBarFixedPx = readStatusBarFixedPx()

        val wasServerReady = savedInstanceState?.getBoolean(STATE_SERVER_READY, false) ?: false
        val wasWebViewVisible = savedInstanceState?.getBoolean(STATE_WEBVIEW_VISIBLE, false) ?: false

        // ---- Hybrid web dashboard = primary content ----
        hybridHost = HybridUiHost(this)
        hybridHost.callback = object : HybridUiHost.Callback {
            override fun onEnter() = enterTavern()
            override fun onExit() = exitTavern()
            override fun onDiagnose() = runDiagnostics()
            override fun onCopyLogs(text: String) {
                val cm = getSystemService(android.content.ClipboardManager::class.java)
                cm.setPrimaryClip(android.content.ClipData.newPlainText("Tarven logs", text))
            }
            override fun onGoBack() { if (webView.canGoBack()) webView.goBack() }
            override fun onGoForward() { if (webView.canGoForward()) webView.goForward() }
            override fun onSetZoom(pct: Int) { webView.settings.textZoom = pct.coerceIn(50, 200) }
            override fun onSetDark(on: Boolean) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                    webView.settings.forceDark =
                        if (on) android.webkit.WebSettings.FORCE_DARK_ON else android.webkit.WebSettings.FORCE_DARK_OFF
            }
            override fun onSetJs(on: Boolean) { webView.settings.javaScriptEnabled = on }
            override fun onSetCookies(on: Boolean) { CookieManager.getInstance().setAcceptCookie(on) }
            override fun onSetUa(value: String) { /* TODO: map ua preset → userAgentString */ }
            override fun onRefreshLogs() = refreshLogToCompose()
            override fun onClearLogs() {}
            override fun onExportLogs(text: String) = onCopyLogs(text)
            override fun onOpenExternal(url: String) {
                startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url)))
            }
            override fun onRequestState() = pushCurrentStateToWeb()
            override fun onSetTheme(t: String) = hybridHost.setTheme(t)
        }
        hybridHost.onPageReady = { pushCurrentStateToWeb() }
        setContentView(hybridHost.webView, FrameLayout.LayoutParams(MATCH, MATCH))
        hybridHost.loadDashboard()

        // ---- Native overlay for WebView + FCC (hidden until entering tavern) ----
        root = FrameLayout(this).apply {
            setBackgroundColor(BG)
            visibility = View.GONE  // hidden — Compose is the only visible content at launch
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            WindowInsetsCompat.CONSUMED
        }
        addContentView(root, FrameLayout.LayoutParams(MATCH, MATCH))

        // 顶框 scrim 条：覆盖 root 顶部 statusBarFixedPx 条带（仅酒馆模式 root 可见时显现）。
        // 随酒馆页顶部取色，scrim 渐变 + 光泽呼吸 + 自下而上色波（设计见 TopScrimBar）。
        topScrimBar = TopScrimBar(this)
        topScrimBar.attach(root, statusBarFixedPx)

        // ============================================
        // WEBVIEW SCREEN (inside native overlay)
        // ============================================
        webViewScreen = FrameLayout(this).apply {
            visibility = View.GONE
            setBackgroundColor(BG)
        }

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                settings.forceDark = android.webkit.WebSettings.FORCE_DARK_AUTO
            }
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(v: WebView?, url: String?) {
                    super.onPageFinished(v, url)
                    android.util.Log.i(TAG, "Page loaded: $url")
                    installChameleonProbes()
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onShowCustomView(v: View?, cb: CustomViewCallback?) {
                    fullscreenView?.let { root.removeView(it) }
                    fullscreenView = v
                    fullscreenCallback = cb
                    v?.let {
                        root.addView(it, FrameLayout.LayoutParams(MATCH, MATCH))
                        webViewScreen.visibility = View.GONE
                    }
                }
                override fun onHideCustomView() {
                    exitFullscreen()
                }
            }
        }

        webViewScreen.addView(webView, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(webViewScreen, FrameLayout.LayoutParams(MATCH, MATCH))

        // ---- Hybrid UI host owns the web dashboard + console + bridge ----

        // Restore or init
        if (wasWebViewVisible && wasServerReady) {
            serverReady = true
            // 镜像 enterTavern 的布局：WebView 下移 statusBarFixedPx，露出顶条带
            val h = statusBarFixedPx
            val lp = webViewScreen.layoutParams as FrameLayout.LayoutParams
            lp.topMargin = h
            webViewScreen.layoutParams = lp
            webView.loadUrl(TAVERN_URL)
            handler.post {
                switchToWebView(false)
                enterImmersive()
            }
            setStatus("Ready")
            hybridHost.pushCanEnter(true)
        } else if (wasServerReady) {
            serverReady = true
            updateHomeReady()
        } else {
            provisionAndStart(wasServerReady)
        }
    }

    override fun onResume() {
        super.onResume()
        if (!isWebViewVisible) showSystemBars()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(STATE_SERVER_READY, serverReady)
        outState.putBoolean(STATE_WEBVIEW_VISIBLE, isWebViewVisible)
    }

    private fun provisionAndStart(skipIfExists: Boolean) {
        Thread {
            val paths = RuntimePaths.from(this)
            paths.ensureDirs()

            val serverJs = File(paths.serverDir, "server.js")
            val hasServer = serverJs.exists()

            if (!hasServer) {
                appendLog("→ Provisioning...")
                updateProgress(5)
                appendLog("→ Extracting rootfs-libs.zip...")
                extractNativeLibs(paths)
                updateProgress(15)
                appendLog("→ Downloading server-source.zip (136MB)...")
                val ok = downloadAndExtractServer(paths)
                updateProgress(100)
                if (!ok) {
                    appendLog("✗ Download failed")
                    setStatus("Download failed")
                    return@Thread
                }
                appendLog("✓ Server source extracted")
            } else {
                appendLog("✓ Server source already exists")
            }

            appendLog("→ Starting Node.js server...")
            setStatus("Starting server...")
            val started = startServer(paths)
            if (!started) {
                appendLog("✗ Server start failed")
                setStatus("Start failed")
                return@Thread
            }
            appendLog("✓ Node.js process launched")
            appendLog("→ Polling 127.0.0.1:8000...")

            pollUntilReady()
        }.start()
    }

    private fun updateHomeReady() {
        post {
            hybridHost.pushProgress(100f, "Ready")
            hybridHost.pushCanEnter(true)
            hybridHost.pushStatus(
                HybridUiHost.Status(true, "Node v24.17.0 ready"),
                HybridUiHost.Status(true, "Loaded"),
                HybridUiHost.Status(true, "Ready")
            )
        }
    }

    /**
     * ╔══════════════════════════════════════════════════════════════════╗
     * ║  DO NOT CHANGE the layout strategy.                              ║
     * ║  We manually push WebView down by statusBarHeight so the top    ║
     * ║  band is free for our info bar. This is intentional — we do NOT ║
     * ║  rely on system insets (they change to 0 in immersive and break ║
     * ║  everything on MIUI). The fixed topMargin + consumed insets     ║
     * ║  combo is the only stable approach found for HyperOS.           ║
     * ╚══════════════════════════════════════════════════════════════════╝
     */
    private fun runDiagnostics() {
        appendLog("→ Diagnostics...")
        hybridHost.pushProgress(0f)
        Thread {
            val paths = RuntimePaths.from(this)
            var nodeS = HybridUiHost.Status(false, "")
            var libsS = HybridUiHost.Status(false, "")
            var srvS = HybridUiHost.Status(false, "")
            // 1. Node binary
            val nodeOk = paths.nodeBin.exists()
            nodeS = HybridUiHost.Status(nodeOk, if (nodeOk) "Node v24.17.0 ready" else "Binary missing!")
            hybridHost.pushStatus(nodeS, libsS, srvS)
            hybridHost.pushProgress(30f)
            // 2. Bionic libs
            val libCount = paths.usrLibDir.listFiles()?.size ?: 0
            libsS = HybridUiHost.Status(libCount > 50, if (libCount > 50) "$libCount libs loaded" else "$libCount libs — need rootfs")
            hybridHost.pushStatus(nodeS, libsS, srvS)
            hybridHost.pushProgress(60f)
            // 3. Server source
            val serverJs = File(paths.serverDir, "server.js")
            val serverOk = serverJs.exists() && File(paths.serverDir, "node_modules").isDirectory
            srvS = HybridUiHost.Status(serverOk, if (serverOk) "Server source ready" else "Server source missing!")
            hybridHost.pushStatus(nodeS, libsS, srvS)
            hybridHost.pushProgress(80f)
            // 4. Fix if needed
            if (!nodeOk || libCount < 50 || !serverOk) {
                appendLog("→ Issues found — fixing...")
                if (libCount < 50) try {
                    paths.usrDir.mkdirs()
                    assets.open("bootstrap/rootfs/rootfs-libs.zip").use { RuntimeFileUtils.unzipStream(it, paths.usrDir) }
                    val n = paths.usrLibDir.listFiles()?.size ?: 0
                    libsS = HybridUiHost.Status(n > 50, "$n libs (re-extracted)")
                    hybridHost.pushStatus(nodeS, libsS, srvS)
                } catch (_: Exception) {
                    libsS = HybridUiHost.Status(false, "Extraction failed")
                    hybridHost.pushStatus(nodeS, libsS, srvS)
                }
            }
            // 5. HTTP check
            val httpOk = tryConnect(TAVERN_URL)
            if (httpOk) {
                srvS = HybridUiHost.Status(true, "127.0.0.1:8000 — online")
                hybridHost.pushStatus(nodeS, libsS, srvS)
                hybridHost.pushCanEnter(true)
                hybridHost.pushProgress(100f, "All systems ready")
                serverReady = true
            } else {
                hybridHost.pushProgress(100f, "Check complete — tap ENTER to start")
            }
        }.start()
    }

    private fun enterTavern() {
        if (!serverReady || isWebViewVisible) return
        if (webView.url == null || webView.url.isNullOrBlank()) {
            webView.loadUrl(TAVERN_URL)
        }
        val h = statusBarFixedPx
        val lp = webViewScreen.layoutParams as FrameLayout.LayoutParams
        lp.topMargin = h
        webViewScreen.layoutParams = lp
        enterImmersive()
        switchToWebView(true)
        // 顶条带自动取色由 installChameleonProbes 驱动（控制台转向 Capacitor 接入）
        // 页面若已加载，onPageFinished 不会重触发，故在此 kick 轮询。
        handler.removeCallbacks(topColorPoll)
        handler.postDelayed(topColorPoll, 350)
    }

    private fun exitTavern() {
        if (!isWebViewVisible) return
        handler.removeCallbacks(topColorPoll)
        topScrimBar.reset()
        showSystemBars()
        // Restore system gesture handling
        clearSystemGestureExclusions()
        val lp = webViewScreen.layoutParams as FrameLayout.LayoutParams
        lp.topMargin = 0
        webViewScreen.layoutParams = lp
        switchToHome(true)
    }

    /** Prevent system back gesture from intercepting edge touches inside the WebView. */
    private fun excludeSystemGestures() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        webView.post {
            val w = webView.width; if (w <= 0) return@post
            val h = webView.height; if (h <= 0) return@post
            val band = dp(36) // exclude ~36dp from each vertical edge
            webView.systemGestureExclusionRects = listOf(
                Rect(0, 0, band, h),            // left edge
                Rect(w - band, 0, w, h)         // right edge
            )
        }
    }

    private fun clearSystemGestureExclusions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            webView.systemGestureExclusionRects = emptyList()
        }
    }

    private fun switchToWebView(animate: Boolean) {
        isWebViewVisible = true
        // Show native overlay (tavernWebView + FCC), hide web dashboard underneath
        root.visibility = View.VISIBLE
        // webViewScreen starts GONE in onCreate and is hidden again on exit — it must
        // be flipped to VISIBLE here or the WebView area stays invisible (black screen).
        webViewScreen.visibility = View.VISIBLE
        hybridHost.webView.visibility = View.INVISIBLE  // stop painting dashboard while in tavern
        hybridHost.pushMode("tavern")
        if (animate) {
            webViewScreen.alpha = 0f
            webViewScreen.animate().alpha(1f).setDuration(220).start()
        } else {
            webViewScreen.alpha = 1f
        }
    }

    private fun switchToHome(animate: Boolean) {
        isWebViewVisible = false
        // Immediately hide native overlay — web dashboard shows underneath
        webViewScreen.visibility = View.GONE
        root.visibility = View.GONE
        hybridHost.webView.visibility = View.VISIBLE
        hybridHost.pushMode("dashboard")
        hybridHost.pushCanEnter(true)   // re-enable ENTER for next entry
    }

    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  DO NOT CHANGE — Immersive hide/show.                           ║
    // ║  API 30+: WindowInsetsController (modern, clean).                ║
    // ║  API 26-29: SYSTEM_UI_FLAG_IMMERSIVE_STICKY (proven fallback).  ║
    // ║  DO NOT mix old and new APIs — Android 15+ has a concurrency    ║
    // ║  bug in ClientWindowFrames when both are active simultaneously. ║
    // ╚══════════════════════════════════════════════════════════════════╝
    @Suppress("DEPRECATION")
    private fun enterImmersive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller.hide(WindowInsets.Type.systemBars())
            }
        } else {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
    }

    @Suppress("DEPRECATION")
    private fun showSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.systemBars())
        } else {
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }

    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  DO NOT REMOVE — MIUI re-immersive guard.                       ║
    // ║  MIUI forcibly shows system bars after notification shade pull,  ║
    // ║  recents, or screen rotation. This callback re-hides them.      ║
    // ╚══════════════════════════════════════════════════════════════════╝
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && isWebViewVisible) {
            enterImmersive()
        }
    }

    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  DO NOT CHANGE — 顶框自适应取色（PixelCopy → TopScrimBar）。       ║
    // ║  读 WebView 顶部 3px×全宽条带 → 平均非透明像素 → 喂 TopScrimBar。  ║
    // ║  · 条带平均而非单像素：抗抖动、稳主色。                            ║
    // ║  · isShown + try/catch：恢复态/转场无 surface 时跳过，轮询稍后重试。║
    // ║  · 触发分工：周期轮询(1.5s)+touch-up 仅做色波；gloss 白色光波仅点击。║
    // ║  取色层 Android 落地（远端页真实像素无可移植 API）；色数学生见      ║
    // ║  com.sillyclient.ui.TopColor；渲染见 com.sillyclient.ui.TopScrimBar。║
    // ╚══════════════════════════════════════════════════════════════════╝
    private fun sampleTopColor(onResult: (Int?) -> Unit) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) { onResult(null); return }
        val w = webView.width
        if (w <= 0 || !webView.isShown) { onResult(null); return }  // 未绘制/无 surface 时跳过
        val loc = IntArray(2)
        webView.getLocationInWindow(loc)
        val top = loc[1] + 1                       // WebView 顶边下 1px
        val stripH = 3
        val srcRect = Rect(loc[0], top, loc[0] + w, top + stripH)
        val bmp = Bitmap.createBitmap(w, stripH, Bitmap.Config.ARGB_8888)
        try {
            PixelCopy.request(window, srcRect, bmp, { result ->
                if (result == PixelCopy.SUCCESS) {
                    var rs = 0; var gs = 0; var bs = 0; var n = 0
                    for (y in 0 until stripH) {
                        for (x in 0 until w) {
                            val p = bmp.getPixel(x, y)
                            if (Color.alpha(p) > 200) {
                                rs += Color.red(p); gs += Color.green(p); bs += Color.blue(p); n++
                            }
                        }
                    }
                    bmp.recycle()
                    if (n > 0) {
                        val avg = (0xFF shl 24) or ((rs / n and 0xFF) shl 16) or
                            ((gs / n and 0xFF) shl 8) or (bs / n and 0xFF)
                        onResult(avg)
                    } else onResult(null)
                } else {
                    bmp.recycle()
                    onResult(null)
                }
            }, handler)
        } catch (_: Exception) {
            // 窗口无 surface（恢复态/转场）→ 放弃本次，轮询稍后重试
            bmp.recycle()
            onResult(null)
        }
    }

    /** 取色 → 顶框 scrim 条色波 + 光泽呼吸。 */
    private fun applyTopColor(color: Int) {
        topScrimBar.setColor(color)
    }

    /** 探针：页面加载后 + 每次 touch-up + 酒馆内 1.5s 周期轮询（单链去重）。 */
    private fun installChameleonProbes() {
        handler.removeCallbacks(topColorPoll)
        handler.postDelayed(topColorPoll, 0)
        webView.setOnTouchListener { _, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                topScrimBar.sweepGloss()   // 点击白色光波
                handler.postDelayed({
                    if (isWebViewVisible) sampleTopColor { c -> if (c != null) applyTopColor(c) }
                }, 200)
            }
            false
        }
    }

    private fun exitFullscreen() {
        fullscreenView?.let { root.removeView(it) }
        fullscreenView = null
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null
        webViewScreen.visibility = View.VISIBLE
    }

    // ============================================
    // SERVER PROVISIONING
    // ============================================

    private fun extractNativeLibs(paths: RuntimePaths) {
        setStatus("Extracting runtime...")
        val nativeDir = paths.nativeLibDir
        val bootstrapDir = paths.bootstrapDir
        bootstrapDir.mkdirs()

        // Extract Bionic system libraries (libz, libssl, libicu etc.) from APK assets
        try {
            paths.usrDir.mkdirs()
            val assetPath = "bootstrap/rootfs/rootfs-libs.zip"
            assets.open(assetPath).use { input ->
                RuntimeFileUtils.unzipStream(input, paths.usrDir)
            }
            android.util.Log.i(TAG, "Rootfs extracted to ${paths.usrDir}")
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Rootfs extraction failed", e)
        }

        // Copy native SO files from lib dir to bootstrap for scripts
        val soFiles = listOf(
            "libtarven-sh.so",
            "libtarven-git.so",
            "libtarven-git-remote-http.so",
            "libtarven-curl.so"
        )
        for (so in soFiles) {
            val src = File(nativeDir, so)
            val dst = File(bootstrapDir, so)
            if (src.exists() && !dst.exists()) {
                src.copyTo(dst)
                RuntimeFileUtils.chmodExecutable(dst)
            }
        }
    }

    private fun downloadAndExtractServer(paths: RuntimePaths): Boolean {
        val destZip = File(paths.tarvenHome, "server-source.zip")
        val serverDir = paths.serverDir
        serverDir.mkdirs()

        if (!downloadFile(SERVER_SOURCE_URL, destZip)) return false

        setStatus("Extracting server...")
        setStatus("Extracting server...")
        try {
            destZip.inputStream().use { input ->
                RuntimeFileUtils.unzipStream(input, serverDir)
            }
            destZip.delete()
            return true
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Extract failed", e)
            setStatus("Extract failed")
            setStatus("Extract failed")
            return false
        }
    }

    private fun downloadFile(urlStr: String, dest: File): Boolean {
        return try {
            val conn = URL(urlStr).openConnection() as HttpURLConnection
            conn.connectTimeout = 15000
            conn.readTimeout = 60000
            conn.setRequestProperty("User-Agent", "Tarven++/0.4")
            conn.connect()
            if (conn.responseCode != 200) {
                android.util.Log.e(TAG, "Download HTTP ${conn.responseCode}")
                return false
            }
            val total = conn.contentLengthLong
            val input = BufferedInputStream(conn.inputStream)
            val output = FileOutputStream(dest)
            val buf = ByteArray(65536)
            var dl = 0L
            var len: Int
            while (input.read(buf).also { len = it } != -1) {
                output.write(buf, 0, len)
                dl += len
                if (total > 0 && dl % (5 * 1024 * 1024) < buf.size) {
                    val pct = (dl * 100 / total).toInt()
                    updateProgress(15 + (pct * 80 / 100))
                    setStatus("Downloading... $pct%")
                }
            }
            output.close()
            input.close()
            conn.disconnect()
            android.util.Log.i(TAG, "Downloaded: ${dest.length()} bytes")
            true
        } catch (e: Exception) {
            dest.delete()
            android.util.Log.e(TAG, "Download failed", e)
            false
        }
    }

    private fun startServer(paths: RuntimePaths): Boolean {
        paths.logsDir.mkdirs()
        // Ensure local xdg-open from open package is executable
        val localXdgOpen = File(paths.serverDir, "node_modules/open/xdg-open")
        if (localXdgOpen.exists()) RuntimeFileUtils.chmodExecutable(localXdgOpen)
        // Create fake xdg-open that exits cleanly — open npm pkg forces system xdg-open on Android
        val fakeXdgDir = File(paths.tmpDir, "bin")
        fakeXdgDir.mkdirs()
        val fakeXdg = File(fakeXdgDir, "xdg-open")
        if (!fakeXdg.exists()) {
            fakeXdg.writeText("#!/system/bin/sh\nexit 0\n")
            RuntimeFileUtils.chmodExecutable(fakeXdg)
        }
        // Patch open package: on Android, use /system/bin/true instead of xdg-open
        val openIndex = File(paths.serverDir, "node_modules/open/index.js")
        if (openIndex.exists()) {
            var patched = openIndex.readText()
            patched = patched.replace(
                "platform === 'android' || isBundled || ",
                "isBundled || ")
            // Force command = '/system/bin/true' on Android
            patched = patched.replace(
                "command = useSystemXdgOpen ? 'xdg-open' : localXdgOpenPath;",
                "command = '/system/bin/true';")
            openIndex.writeText(patched)
        }
        try {
            // Launch directly: node server.js (skip npm install — node_modules is pre-bundled)
            val pb = ProcessBuilder(paths.nodeBin.absolutePath, "server.js")
            pb.directory(paths.serverDir)
            pb.redirectErrorStream(true)
            pb.redirectOutput(ProcessBuilder.Redirect.appendTo(File(paths.logsDir, "server.log")))
            val env = pb.environment()
            env["TARVEN_HOME"] = paths.tarvenHome.absolutePath
            env["TARVEN_USR"] = paths.usrDir.absolutePath
            env["TARVEN_SERVER_DIR"] = paths.serverDir.absolutePath
            env["TARVEN_NODE"] = paths.nodeBin.absolutePath
            env["TARVEN_NATIVE_LIB_DIR"] = paths.nativeLibDir.absolutePath
            env["TARVEN_TMP"] = paths.tmpDir.absolutePath
            env["TARVEN_BOOTSTRAP"] = paths.bootstrapDir.absolutePath
            env["LD_LIBRARY_PATH"] = "${paths.usrDir.absolutePath}/lib:${paths.nativeLibDir.absolutePath}"
            env["AUTO_LAUNCH"] = "false"
            env["NO_BROWSER"] = "true"
            env["BROWSER"] = "/system/bin/true"
            env["PATH"] = "${paths.tmpDir.absolutePath}/bin:/system/bin:${System.getenv("PATH") ?: ""}"
            env["HOST"] = "127.0.0.1"
            env["PORT"] = "8000"
            pb.start()
            return true
        } catch (_: Exception) {
            return false
        }
    }

    private fun pollUntilReady() {
        var a = 0
        while (a < 120) {
            if (tryConnect(TAVERN_URL)) {
                appendLog("✓ SillyTavern is online at 127.0.0.1:8000")
                serverReady = true
                updateHomeReady()
                refreshLogToCompose()
                return
            }
            a++
            if (a % 10 == 0) appendLog("... still waiting ($a/120)")
            try { Thread.sleep(1000) } catch (_: Exception) { break }
        }
        appendLog("✗ Server did not respond within 120s")
        setStatus("No response")
    }

    private fun tryConnect(url: String) = try {
        val c = URL(url).openConnection() as HttpURLConnection
        c.connectTimeout = 3000
        c.readTimeout = 3000
        c.responseCode in 200..499
    } catch (_: Exception) { false }

    // ============================================
    // HELPERS
    // ============================================

    private fun setStatus(t: String) { appendLog(t) }  // status text → 日志行（web 无独立状态文本槽）
    private fun setProgressValue(pct: Int) { hybridHost.pushProgress(pct.toFloat()) }
    private fun updateProgress(pct: Int) { hybridHost.pushProgress(pct.toFloat()) }

    /** Append a log line to the web dashboard's log panel. */
    private fun appendLog(line: String) {
        hybridHost.pushLog(line)
    }

    /** Read server.log and push its tail to the web dashboard. */
    private fun refreshLogToCompose() {
        Thread {
            val paths = RuntimePaths.from(this)
            val logFile = File(paths.logsDir, "server.log")
            if (!logFile.exists()) return@Thread
            val lines = logFile.readLines().takeLast(30)
            for (l in lines) hybridHost.pushLog(l)
        }.start()
    }

    /** Push current boot state to the web dashboard (page finished loading). */
    private fun pushCurrentStateToWeb() {
        if (serverReady) {
            hybridHost.pushProgress(100f, "Ready")
            hybridHost.pushCanEnter(true)
            hybridHost.pushStatus(
                HybridUiHost.Status(true, "Node v24.17.0 ready"),
                HybridUiHost.Status(true, "Loaded"),
                HybridUiHost.Status(true, "Ready")
            )
        }
        refreshLogToCompose()
    }

    private fun post(r: Runnable) { handler.post(r) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    /**
     * Hardware radar: read the physical camera cutout height — never lies, never changes.
     * Fallback: system status_bar_height resource → 24dp absolute last-resort.
     */
    // ╔══════════════════════════════════════════════════════════════════╗
    // ║  DO NOT CHANGE this read chain.                                 ║
    // ║  Priority: DisplayCutout (hardware, burned at factory) →         ║
    // ║  status_bar_height resource → 24dp fallback.                     ║
    // ║  NEVER use WindowInsets for status bar height — they report 0   ║
    // ║  when the bar is hidden, breaking all layout calculations.       ║
    // ║  The camera cutout is part of the phone glass. It doesn't care  ║
    // ║  whether Android thinks the status bar is visible.               ║
    // ╚══════════════════════════════════════════════════════════════════╝
    private fun readStatusBarFixedPx(): Int {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val cutout = window.decorView.rootWindowInsets?.displayCutout
            if (cutout != null) {
                val h = cutout.safeInsetTop
                if (h > 0) return h
            }
        }
        val id = resources.getIdentifier("status_bar_height", "dimen", "android")
        if (id > 0) return resources.getDimensionPixelSize(id)
        return dp(24)
    }

    override fun onBackPressed() {
        if (fullscreenView != null) exitFullscreen()
        else if (isWebViewVisible) {
            // 酒馆内 back 不退出（退出走启动页 EXIT；控制台转 Capacitor）
        } else super.onBackPressed()
    }


    override fun onDestroy() {
        handler.removeCallbacks(topColorPoll)
        if (serverReady) runner.stop()
        webView.destroy()
        super.onDestroy()
    }
}
