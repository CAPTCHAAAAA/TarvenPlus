package com.sillyclient.ui

import android.app.Activity
import android.graphics.Color
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject

/**
 * 混合 UI 宿主：持有 web 模块——
 *  · webView：启动页（仪表盘），主内容。
 *
 * 注：控制台（顶部下拉面板）已移除，转向 Capacitor 框架接入；
 *     web/console 源码留作移植物料，本原生侧不再承载。
 *
 * 桥契约见 web/launch/src/bridge.ts：
 *  - JS→原生：window.TarvenN.invoke(action, payloadJson) → [JavascriptInterface] invoke()
 *  - 原生→JS：evaluateJavascript("window.__tarvenDispatch(event, payloadJson)")，派发到 webView。
 * 单入口、全 JSON 字符串传参。
 */
class HybridUiHost(private val activity: Activity) {

    interface Callback {
        fun onEnter()
        fun onExit()
        fun onDiagnose()
        fun onCopyLogs(text: String)
        fun onGoBack()
        fun onGoForward()
        fun onSetZoom(pct: Int)
        fun onSetDark(on: Boolean)
        fun onSetJs(on: Boolean)
        fun onSetCookies(on: Boolean)
        fun onSetUa(value: String)
        fun onRefreshLogs()
        fun onClearLogs()
        fun onExportLogs(text: String)
        fun onOpenExternal(url: String)
        fun onRequestState()
        fun onSetTheme(theme: String)
    }

    data class Status(val ready: Boolean, val subtitle: String = "")

    var callback: Callback? = null
    var onPageReady: (() -> Unit)? = null          // 启动页加载完成

    // ── webView ──
    val webView: WebView by lazy { makeWebView { dashReady = true; pushToDashboard("theme", themeJson()); onPageReady?.invoke() } }

    private var dashReady = false
    private var theme = "dark"               // 主题源

    // JS 调用入口（binder 线程，切回 UI）
    private val bridge = object {
        @JavascriptInterface
        fun invoke(action: String, payloadJson: String) {
            activity.runOnUiThread { handle(action, payloadJson) }
        }
    }

    private fun makeWebView(onPageFinished: () -> Unit): WebView = WebView(activity).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        setBackgroundColor(Color.TRANSPARENT)
        addJavascriptInterface(bridge, "TarvenN")
        WebView.setWebContentsDebuggingEnabled(true)
        webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                onPageFinished()
            }
        }
    }

    // ── 模式切换 ──
    fun loadDashboard() {
        dashReady = false
        webView.loadUrl("file:///android_asset/ui/launch/index.html")
    }

    // ── 原生 → JS 派发 ──
    /** 推到启动页 webView。后台线程安全（self-post）。 */
    fun dispatch(event: String, payloadJson: String = "") {
        pushToDashboard(event, payloadJson)
    }

    /** 推到启动页 webView（仅在 dashReady 时）。 */
    fun pushToDashboard(event: String, payloadJson: String = "") {
        if (!dashReady) return
        evalOn(webView, event, payloadJson)
    }

    private fun evalOn(target: WebView, event: String, payloadJson: String) {
        val p = if (payloadJson.isEmpty()) "null" else payloadJson
        val js = "try{window.__tarvenDispatch(${jsStr(event)},$p)}catch(e){console.error(e)}"
        target.post { target.evaluateJavascript(js, null) }
    }

    // ── 主题（启动页/控制台共享）──
    private fun themeJson() = JSONObject().put("theme", theme).toString()

    /** 设主题并广播给启动页。 */
    fun setTheme(t: String) {
        theme = if (t == "light") "light" else "dark"
        pushToDashboard("theme", themeJson())
    }

    fun pushLog(line: String) = dispatch("log", jsStr(line))
    fun pushProgress(pct: Float, text: String? = null) {
        val o = JSONObject().put("pct", pct.toInt())
        if (text != null) o.put("text", text)
        dispatch("progress", o.toString())
    }
    fun pushCanEnter(ready: Boolean) = dispatch("canEnter", ready.toString())
    fun pushMode(mode: String) = dispatch("mode", jsStr(mode))
    fun pushColor(hex: String) = dispatch("color", JSONObject().put("hex", hex).toString())
    fun pushStatus(node: Status, libs: Status, server: Status) {
        val o = JSONObject()
        o.put("node", statusJson(node)); o.put("libs", statusJson(libs)); o.put("server", statusJson(server))
        dispatch("status", o.toString())
    }
    private fun statusJson(s: Status) = JSONObject().put("ready", s.ready).put("subtitle", s.subtitle)

    private fun jsStr(s: String): String {
        val sb = StringBuilder("\"")
        for (c in s) when (c) {
            '\\' -> sb.append("\\\\")
            '"' -> sb.append("\\\"")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            '\t' -> sb.append("\\t")
            else -> if (c.code < 0x20) sb.append(String.format("\\u%04x", c.code)) else sb.append(c)
        }
        sb.append('"'); return sb.toString()
    }

    private fun handle(action: String, payloadJson: String) {
        val cb = callback ?: return
        try {
            when (action) {
                "enter" -> cb.onEnter()
                "exit" -> cb.onExit()
                "diagnose" -> cb.onDiagnose()
                "goBack" -> cb.onGoBack()
                "goForward" -> cb.onGoForward()
                "setZoom" -> cb.onSetZoom(objInt(payloadJson, "pct", 100))
                "setDark" -> cb.onSetDark(objBool(payloadJson, "on"))
                "setJs" -> cb.onSetJs(objBool(payloadJson, "on"))
                "setCookies" -> cb.onSetCookies(objBool(payloadJson, "on"))
                "setUa" -> cb.onSetUa(objStr(payloadJson, "value", "default"))
                "refreshLogs" -> cb.onRefreshLogs()
                "clearLogs" -> cb.onClearLogs()
                "exportLogs" -> cb.onExportLogs(objStr(payloadJson, "text", ""))
                "openExternal" -> cb.onOpenExternal(objStr(payloadJson, "url", ""))
                "copyLogs" -> cb.onCopyLogs(objStr(payloadJson, "text", ""))
                "requestState" -> cb.onRequestState()
                "setTheme" -> cb.onSetTheme(objStr(payloadJson, "theme", "dark"))
                else -> Log.w(TAG, "unknown action: $action")
            }
        } catch (e: Exception) {
            Log.e(TAG, "action $action failed", e)
        }
    }

    private fun obj(json: String): JSONObject? =
        if (json.isEmpty() || json == "null") null else JSONObject(json)
    private fun objInt(json: String, key: String, def: Int): Int = obj(json)?.optInt(key, def) ?: def
    private fun objStr(json: String, key: String, def: String): String = obj(json)?.optString(key, def) ?: def
    private fun objBool(json: String, key: String): Boolean = obj(json)?.optBoolean(key, false) ?: false

    private fun dp(v: Int) = (v * activity.resources.displayMetrics.density).toInt()

    companion object {
        private const val TAG = "HybridUiHost"
    }
}
