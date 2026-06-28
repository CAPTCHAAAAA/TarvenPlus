package com.sillyclient.ui

/**
 * 顶框 scrim 取色算法（纯函数，无 Android 依赖）。
 *
 * 渐变三段（自上而下）：顶 45% / 中 80% / 底 100% 页面色 ——
 * 顶部压暗藏系统图标残留，底部满色无缝衔接 WebView。
 * 换色时由 TopScrimBar 做自下而上色波扫描（2400ms Decelerate 1.8f）。
 * 光泽：顶部 30% 白色渐变独立呼吸（2400ms）。
 * 设计详见 git 历史 0dfc1e0 / d09a756。
 */
object TopColor {
    private const val LUMA_THRESHOLD = 0.6f

    /** 按系数压暗（RGB *= factor，alpha 强制 255）。 */
    fun darken(argb: Int, factor: Float): Int {
        val r = (((argb ushr 16) and 0xFF) * factor).toInt().coerceIn(0, 255)
        val g = (((argb ushr 8) and 0xFF) * factor).toInt().coerceIn(0, 255)
        val b = ((argb and 0xFF) * factor).toInt().coerceIn(0, 255)
        return (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    }

    /** 两色线性插值（RGB，alpha 强制 255）。 */
    fun lerp(a: Int, b: Int, t: Float): Int {
        val ar = (a ushr 16) and 0xFF; val ag = (a ushr 8) and 0xFF; val ab = a and 0xFF
        val br = (b ushr 16) and 0xFF; val bg = (b ushr 8) and 0xFF; val bb = b and 0xFF
        val r = (ar + (br - ar) * t).toInt().coerceIn(0, 255)
        val g = (ag + (bg - ag) * t).toInt().coerceIn(0, 255)
        val bl = (ab + (bb - ab) * t).toInt().coerceIn(0, 255)
        return (0xFF shl 24) or (r shl 16) or (g shl 8) or bl
    }

    /** scrim 三段渐变 stops：[顶 45%, 中 80%, 底 100%]。 */
    fun scrimStops(color: Int): IntArray = intArrayOf(
        darken(color, 0.45f),
        darken(color, 0.80f),
        (0xFF shl 24) or (color and 0xFFFFFF)
    )

    /** 亮度判定（供将来条带叠加图标的明暗）。 */
    fun isDark(argb: Int): Boolean {
        val r = (argb ushr 16) and 0xFF
        val g = (argb ushr 8) and 0xFF
        val b = argb and 0xFF
        return (0.299f * r + 0.587f * g + 0.114f * b) / 255f < LUMA_THRESHOLD
    }
}
