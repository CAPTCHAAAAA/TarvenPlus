package com.sillyclient.ui

import android.animation.ValueAnimator
import android.app.Activity
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout

/**
 * 酒馆顶部自适应 scrim 条（顶框）——纯视觉，无控件。
 *
 * DO NOT CHANGE —— 已对齐 git 历史 0dfc1e0 / d09a756 的成熟设计，改动前请复盘历史取舍：
 *  · scrim：三段渐变（顶 45% / 中 80% / 底 100% 页面色），顶压暗藏系统图标残留，
 *           底满色无缝衔接 WebView。
 *  · gloss：顶部 30% 白色渐变；仅点击时白色光波扫过（2400ms 渐显/保持/渐隐），
 *           非呼吸灯、不随周期取色触发。
 *  · 色波：换色时新色自下而上扫过（2400ms DecelerateInterpolator 1.8f），
 *           三段 stop 各按 底→中→顶 相位过渡。
 * 取色由 MainActivity.sampleTopColor（PixelCopy）驱动，经 setColor() 喂入；
 * gloss 由点击经 sweepGloss() 触发。色数学生见 TopColor。
 */
class TopScrimBar(private val activity: Activity) {

    private val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
    private lateinit var scrim: View
    private lateinit var gloss: View
    private val scrimDrawable = GradientDrawable(
        GradientDrawable.Orientation.TOP_BOTTOM,
        intArrayOf(0xFF2A2A2A.toInt(), 0xFF1E1E1E.toInt(), 0xFF181818.toInt())
    )
    private var barBand = 0
    private var currentStops: IntArray = intArrayOf(
        0xFF2A2A2A.toInt(), 0xFF1E1E1E.toInt(), 0xFF181818.toInt()
    )
    private var waveAnimator: ValueAnimator? = null
    private var glossAnimator: ValueAnimator? = null

    /** Attach 到 root 顶部，[statusBarHeight] = 物理状态栏/刘海条带高。 */
    fun attach(root: FrameLayout, statusBarHeight: Int) {
        barBand = statusBarHeight
        scrim = View(activity).apply {
            background = scrimDrawable
            layoutParams = FrameLayout.LayoutParams(MATCH, barBand).apply { gravity = Gravity.TOP }
            isClickable = false
        }
        val gh = (barBand * 0.3f).toInt().coerceAtLeast(1)
        gloss = View(activity).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(0x18FFFFFF.toInt(), 0x00FFFFFF.toInt())
            )
            alpha = 0f
            layoutParams = FrameLayout.LayoutParams(MATCH, gh).apply { gravity = Gravity.TOP }
            isClickable = false
        }
        root.addView(scrim)
        root.addView(gloss)
    }

    /** 应用新取色：scrim 自下而上色波（仅色波；gloss 白色光波由点击触发，见 sweepGloss）。 */
    fun setColor(color: Int) {
        activity.runOnUiThread {
            if (!::scrim.isInitialized) return@runOnUiThread
            waveAnimator?.cancel()
            val from = currentStops.copyOf()
            val to = TopColor.scrimStops(color)
            waveAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 2400
                interpolator = DecelerateInterpolator(1.8f)
                addUpdateListener { va ->
                    val t = va.animatedValue as Float
                    // 自下而上：底先过渡 → 中 → 顶
                    val botMix: Float; val midMix: Float; val topMix: Float
                    when {
                        t < 0.33f -> { botMix = t / 0.33f; midMix = 0f; topMix = 0f }
                        t < 0.66f -> { botMix = 1f; midMix = (t - 0.33f) / 0.33f; topMix = 0f }
                        else      -> { botMix = 1f; midMix = 1f; topMix = (t - 0.66f) / 0.34f }
                    }
                    val top = TopColor.lerp(from[0], to[0], topMix)
                    val mid = TopColor.lerp(from[1], to[1], midMix)
                    val bot = TopColor.lerp(from[2], to[2], botMix)
                    currentStops = intArrayOf(top, mid, bot)
                    scrimDrawable.setColors(currentStops)
                }
                start()
            }
        }
    }

    /** 点击白色光波（2400ms 渐显/保持/渐隐），独立于色波。 */
    fun sweepGloss() {
        activity.runOnUiThread {
            if (!::gloss.isInitialized) return@runOnUiThread
            glossAnimator?.cancel()
            glossAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 2400
                interpolator = DecelerateInterpolator(2f)
                addUpdateListener { va ->
                    val t = va.animatedFraction
                    gloss.alpha = when {
                        t < 0.2f -> t / 0.2f * 0.55f          // 渐显
                        t < 0.7f -> 0.55f                      // 保持
                        else     -> (1f - t) / 0.3f * 0.55f    // 渐隐
                    }
                }
                start()
            }
        }
    }

    /** 复位到中性灰，取消动画（退出酒馆时调用）。 */
    fun reset() {
        activity.runOnUiThread {
            waveAnimator?.cancel()
            glossAnimator?.cancel()
            if (!::scrim.isInitialized) return@runOnUiThread
            currentStops = intArrayOf(0xFF2A2A2A.toInt(), 0xFF1E1E1E.toInt(), 0xFF181818.toInt())
            scrimDrawable.setColors(currentStops)
            if (::gloss.isInitialized) gloss.alpha = 0f
        }
    }
}
