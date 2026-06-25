package com.tarven.plus

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import com.tarven.plus.runtime.RuntimePaths
import com.tarven.plus.runtime.RuntimeFileUtils
import com.tarven.plus.runtime.TarvenProcessRunner
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private lateinit var homeScreen: LinearLayout
    private lateinit var webViewScreen: FrameLayout
    private lateinit var webView: WebView
    private lateinit var statusText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var startButton: TextView
    private lateinit var controlFab: ImageButton
    private lateinit var controlPanel: LinearLayout
    private lateinit var runner: TarvenProcessRunner
    private var serverReady = false
    private var isWebViewVisible = false
    private var controlPanelVisible = false

    companion object {
        private const val TAG = "Tarven++"
        private const val SERVER_SOURCE_URL =
            "https://github.com/CAPTCHAAAAA/TarvenPlus/releases/download/v0.2/server-source.zip"
        private const val TAVERN_URL = "http://127.0.0.1:8000/"
        private val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
        private val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    }

    @SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        runner = TarvenProcessRunner()

        // ©¤©¤ Root layout ©¤©¤
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }

        // ©¤©¤ Home screen (launcher) ©¤©¤
        homeScreen = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
        }

        val logo = TextView(this).apply {
            text = "????"
            textSize = 64f
            gravity = Gravity.CENTER
        }

        val title = TextView(this).apply {
            text = "Tarven++"
            textSize = 28f
            setTextColor(Color.parseColor("#E0D8C8"))
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 8)
        }

        val subtitle = TextView(this).apply {
            text = "SillyTavern for Android"
            textSize = 14f
            setTextColor(Color.parseColor("#887766"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        }

        statusText = TextView(this).apply {
            textSize = 13f
            setTextColor(Color.parseColor("#AA9977"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
            text = "Tap Start to launch"
        }

        progressBar = ProgressBar(this).apply {
            isIndeterminate = true
            visibility = View.GONE
        }

        startButton = TextView(this).apply {
            text = "START"
            textSize = 18f
            setTextColor(Color.parseColor("#1A1510"))
            setBackgroundColor(Color.parseColor("#C8A96E"))
            gravity = Gravity.CENTER
            setPadding(64, 18, 64, 18)
            setOnClickListener { onStartClicked() }
        }

        homeScreen.addView(logo)
        homeScreen.addView(title)
        homeScreen.addView(subtitle)
        homeScreen.addView(statusText)
        homeScreen.addView(progressBar)
        homeScreen.addView(startButton)

        // ©¤©¤ WebView screen (hidden initially) ©¤©¤
        webViewScreen = FrameLayout(this).apply { visibility = View.GONE }

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                databaseEnabled = true
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false
                loadWithOverviewMode = true
                useWideViewPort = true
                mediaPlaybackRequiresUserGesture = false
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    isForceDarkAllowed = false
                }
            }
            setBackgroundColor(Color.parseColor("#1a1a1a"))
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
            overScrollMode = View.OVER_SCROLL_NEVER

            webChromeClient = object : WebChromeClient() {
                override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                    if (view != null) goFullscreen(view, callback)
                }
                override fun onHideCustomView() { exitFullscreen() }
            }
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    progressBar.visibility = View.GONE
                }
                override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                    if (url.startsWith("http://127.0.0.1") || url.startsWith("https://127.0.0.1")) {
                        return false
                    }
                    try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: Exception) {}
                    return true
                }
            }
        }
        webViewScreen.addView(webView, FrameLayout.LayoutParams(MATCH, MATCH))

        // ©¤©¤ Floating control FAB ©¤©¤
        controlFab = ImageButton(this).apply {
            visibility = View.GONE
            setBackgroundColor(Color.argb(180, 30, 25, 20))
            setColorFilter(Color.parseColor("#C8A96E"))
            setImageResource(android.R.drawable.ic_menu_more)
            scaleType = ImageView.ScaleType.CENTER
            val fabSize = dp(48)
            val fabMargin = dp(16)
            val fabParams = FrameLayout.LayoutParams(fabSize, fabSize).apply {
                gravity = Gravity.BOTTOM or Gravity.END
                setMargins(0, 0, fabMargin, fabMargin)
            }
            layoutParams = fabParams
            setOnClickListener { toggleControlPanel() }
        }

        // ©¤©¤ Floating control panel (expandable) ©¤©¤
        controlPanel = LinearLayout(this).apply {
            visibility = View.GONE
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.argb(220, 30, 25, 20))
            setPadding(dp(12), dp(12), dp(12), dp(12))
            val panelParams = FrameLayout.LayoutParams(WRAP, WRAP).apply {
                gravity = Gravity.BOTTOM or Gravity.END
                setMargins(0, 0, dp(16), dp(72))
            }
            layoutParams = panelParams
        }

        listOf(
            "Refresh" to { webView.reload() },
            "Settings" to { webView.loadUrl("$TAVERN_URL#/settings") },
            "Exit Tavern" to { exitTavern() }
        ).forEach { (label, action) ->
            val btn = TextView(this).apply {
                text = label
                textSize = 13f
                setTextColor(Color.parseColor("#C8A96E"))
                setPadding(dp(16), dp(10), dp(16), dp(10))
                setOnClickListener {
                    action()
                    hideControlPanel()
                }
            }
            controlPanel.addView(btn)
        }

        webViewScreen.addView(controlPanel)
        webViewScreen.addView(controlFab)

        // ©¤©¤ Assemble ©¤©¤
        root.addView(homeScreen, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(webViewScreen, FrameLayout.LayoutParams(MATCH, MATCH))
        setContentView(root)

        // Start background preparation
        prepareServer()
    }

    private fun onStartClicked() {
        if (serverReady) {
            enterTavern()
        } else {
            Toast.makeText(this, "Server not ready yet...", Toast.LENGTH_SHORT).show()
        }
    }

    private fun enterTavern() {
        hideSystemBars()
        startButton.text = "LOADING..."
        startButton.isEnabled = false
        progressBar.visibility = View.VISIBLE
        webView.loadUrl(TAVERN_URL)
        postDelayed({
            homeScreen.visibility = View.GONE
            webViewScreen.visibility = View.VISIBLE
            controlFab.visibility = View.VISIBLE
            isWebViewVisible = true
        }, 800)
    }

    private fun exitTavern() {
        showSystemBars()
        webViewScreen.visibility = View.GONE
        controlFab.visibility = View.GONE
        homeScreen.visibility = View.VISIBLE
        startButton.text = "ENTER TAVERN"
        startButton.isEnabled = true
        isWebViewVisible = false
        statusText.text = "Server running on $TAVERN_URL"
    }

    private fun toggleControlPanel() {
        if (controlPanelVisible) hideControlPanel() else showControlPanel()
    }

    private fun showControlPanel() {
        controlPanel.visibility = View.VISIBLE
        controlPanel.startAnimation(fadeIn())
        controlPanelVisible = true
    }

    private fun hideControlPanel() {
        controlPanel.startAnimation(fadeOut().apply {
            setAnimationListener(object : Animation.AnimationListener {
                override fun onAnimationEnd(a: Animation?) { controlPanel.visibility = View.GONE }
                override fun onAnimationRepeat(a: Animation?) {}
                override fun onAnimationStart(a: Animation?) {}
            })
        })
        controlPanelVisible = false
    }

    // ©¤©¤ Immersive mode ©¤©¤
    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null

    private fun goFullscreen(view: View, callback: WebChromeClient.CustomViewCallback?) {
        fullscreenView = view
        fullscreenCallback = callback
        webView.visibility = View.GONE
        controlFab.visibility = View.GONE
        webViewScreen.addView(view, FrameLayout.LayoutParams(MATCH, MATCH))
        hideSystemBars()
    }

    private fun exitFullscreen() {
        fullscreenView?.let { webViewScreen.removeView(it) }
        fullscreenView = null
        fullscreenCallback?.onCustomViewHidden()
        fullscreenCallback = null
        webView.visibility = View.VISIBLE
        controlFab.visibility = View.VISIBLE
    }

    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.apply {
                hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            )
        }
    }

    private fun showSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.show(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
    }

    // ©¤©¤ Server lifecycle ©¤©¤
    private fun prepareServer() {
        statusText.text = "Preparing..."
        Thread {
            val paths = RuntimePaths.from(this)
            paths.ensureDirs()

            try {
                RuntimeFileUtils.unzipAsset(this, "bootstrap/rootfs/rootfs-libs.zip", paths.usrDir)
                RuntimeFileUtils.copyAsset(this, "bootstrap/scripts/start-server.sh",
                    File(paths.scriptsDir, "start-server.sh"))
                RuntimeFileUtils.chmodExecutable(File(paths.scriptsDir, "start-server.sh"))
            } catch (_: Exception) {}

            val serverJs = File(paths.serverDir, "server.js")
            val serverZip = File(paths.tarvenHome, "server-source.zip")

            if (!serverJs.isFile) {
                setStatus("Downloading tavern...")
                if (!downloadServer(serverZip)) {
                    setStatus("Download failed. Check connection.")
                    return@Thread
                }
                setStatus("Extracting...")
                try {
                    RuntimeFileUtils.unzipStream(serverZip.inputStream(), paths.serverDir)
                    serverZip.delete()
                } catch (e: Exception) {
                    setStatus("Extraction failed")
                    return@Thread
                }
            }

            if (!serverJs.isFile) {
                setStatus("server.js not found")
                return@Thread
            }

            try {
                File(paths.serverDir, "config.yaml").writeText(
                    "listen: false\nprotocol:\n  ipv4: true\n  ipv6: false\n" +
                    "whitelistMode: false\nbrowserLaunch:\n  enabled: false\n" +
                    "dataRoot: ./data\nport: 8000\n"
                )
            } catch (_: Exception) {}

            setStatus("Starting server...")
            if (!startServer(paths)) {
                setStatus("Server failed to start")
                return@Thread
            }

            setStatus("Waiting for server...")
            pollUntilReady(paths)
        }.start()
    }

    private fun downloadServer(dest: File): Boolean {
        android.util.Log.i(TAG, "Downloading from $SERVER_SOURCE_URL")
        return try {
            val conn = URL(SERVER_SOURCE_URL).openConnection() as HttpURLConnection
            conn.connectTimeout = 15000
            conn.readTimeout = 60000
            conn.setRequestProperty("User-Agent", "Tarven++/0.2")
            val total = conn.contentLengthLong
            val input = BufferedInputStream(conn.inputStream)
            val output = FileOutputStream(dest)
            val buf = ByteArray(65536)
            var downloaded = 0L
            var len: Int
            while (input.read(buf).also { len = it } != -1) {
                output.write(buf, 0, len)
                downloaded += len
                if (total > 0 && downloaded % (10 * 1024 * 1024) < buf.size) {
                    val pct = downloaded * 100 / total
                    setStatus("Downloading... $pct%")
                }
            }
            output.close(); input.close(); conn.disconnect()
            android.util.Log.i(TAG, "Download complete: ${dest.length()} bytes")
            true
        } catch (e: Exception) {
            dest.delete()
            android.util.Log.e(TAG, "Download failed", e)
            false
        }
    }

    private fun startServer(paths: RuntimePaths): Boolean {
        val startScript = File(paths.scriptsDir, "start-server.sh")
        if (!paths.nodeBin.exists() || !startScript.exists()) return false
        val logFile = File(paths.logsDir, "server.log")
        logFile.parentFile?.mkdirs()
        try {
            val pb = ProcessBuilder("/system/bin/sh", startScript.absolutePath)
            pb.directory(paths.serverDir)
            pb.redirectErrorStream(true)
            pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logFile))
            val env = pb.environment()
            env["TARVEN_HOME"] = paths.tarvenHome.absolutePath
            env["TARVEN_BOOTSTRAP"] = paths.bootstrapDir.absolutePath
            env["TARVEN_SERVER_DIR"] = paths.serverDir.absolutePath
            env["TARVEN_USR"] = paths.usrDir.absolutePath
            env["TARVEN_TMP"] = paths.tmpDir.absolutePath
            env["TARVEN_NATIVE_LIB_DIR"] = paths.nativeLibDir.absolutePath
            env["TARVEN_NODE"] = paths.nodeBin.absolutePath
            env["HOST"] = "127.0.0.1"
            env["PORT"] = "8000"
            pb.start()
            return true
        } catch (_: Exception) { return false }
    }

    private fun pollUntilReady(paths: RuntimePaths) {
        var attempts = 0
        while (attempts < 120) {
            if (tryConnect(TAVERN_URL)) {
                serverReady = true
                setStatus("Ready ¡ª tap START")
                post { startButton.text = "ENTER TAVERN" }
                return
            }
            attempts++
            try { Thread.sleep(1000) } catch (_: Exception) { break }
        }
        setStatus("Server did not respond")
    }

    private fun tryConnect(url: String): Boolean {
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 3000
            conn.readTimeout = 3000
            conn.responseCode in 200..499
        } catch (_: Exception) { false }
    }

    // ©¤©¤ Helpers ©¤©¤
    private fun setStatus(text: String) { post { statusText.text = text } }
    private fun post(r: Runnable) { mainHandler.post(r) }
    private fun postDelayed(r: Runnable, ms: Long) { mainHandler.postDelayed(r, ms) }
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun fadeIn(): Animation = AlphaAnimation(0f, 1f).apply { duration = 200; fillAfter = true }
    private fun fadeOut(): Animation = AlphaAnimation(1f, 0f).apply { duration = 150; fillAfter = true }

    override fun onBackPressed() {
        if (fullscreenView != null) {
            exitFullscreen()
        } else if (controlPanelVisible) {
            hideControlPanel()
        } else if (isWebViewVisible) {
            if (webView.canGoBack()) webView.goBack() else exitTavern()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (serverReady) runner.stop()
        webView.destroy()
        super.onDestroy()
    }
}