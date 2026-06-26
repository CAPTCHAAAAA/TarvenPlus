package com.tarven.plus.ui

import android.animation.ValueAnimator
import android.app.Activity
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout

/**
 * Pure adaptive scrim bar — blends into the WebView via color extraction.
 * No controls, no indicators, no menus. Just the background gradient + breathing gloss.
 */
class FloatingControlCenter(private val activity: Activity) {

    private val MATCH = ViewGroup.LayoutParams.MATCH_PARENT

    private lateinit var scrim: View
    private lateinit var gloss: View

    private var root: FrameLayout? = null
    private var barBand = 0
    private var glossAnim: ValueAnimator? = null
    private var colorAnim: ValueAnimator? = null

    fun attach(root: FrameLayout, statusBarHeight: Int) {
        this.root = root
        this.barBand = statusBarHeight
        buildScrim()
        buildGloss()
        root.addView(scrim)
        root.addView(gloss)
        scrim.alpha = 0f; gloss.alpha = 0f
        scrim.animate().alpha(1f).setDuration(280).start()
        gloss.animate().alpha(1f).setDuration(280).start()
    }

    private fun buildScrim() {
        val gradient = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(
                0xFF2A2A2A.toInt(),
                0xFF1E1E1E.toInt(),
                0xFF181818.toInt(),
            )
        )
        scrim = View(activity).apply {
            background = gradient
            layoutParams = FrameLayout.LayoutParams(MATCH, barBand).apply {
                gravity = Gravity.TOP or Gravity.START; topMargin = 0
            }
            isClickable = false
        }
    }

    private fun buildGloss() {
        val h = (barBand * 0.3f).toInt()
        val gradient = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(0x18FFFFFF.toInt(), 0x00FFFFFF.toInt())
        )
        gloss = View(activity).apply {
            background = gradient; alpha = 0f
            layoutParams = FrameLayout.LayoutParams(MATCH, h).apply {
                gravity = Gravity.TOP or Gravity.START; topMargin = 0
            }
            isClickable = false
        }
    }

    fun setScrimColor(baseColor: Int) {
        activity.runOnUiThread {
            if (!::scrim.isInitialized) return@runOnUiThread
            val currentDrawable = scrim.background as? GradientDrawable
            val currentBody = currentDrawable?.let { d ->
                val cs = d.colors; if (cs != null && cs.isNotEmpty()) cs.last() else baseColor
            } ?: baseColor

            val fromR = Color.red(currentBody); val fromG = Color.green(currentBody); val fromB = Color.blue(currentBody)
            val toR = Color.red(baseColor); val toG = Color.green(baseColor); val toB = Color.blue(baseColor)

            colorAnim?.cancel()
            colorAnim = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 2400
                interpolator = android.view.animation.DecelerateInterpolator(1.8f)
                addUpdateListener { va ->
                    val t = va.animatedValue as Float
                    fun lerp(a: Int, b: Int, f: Float) = (a + (b - a) * f).toInt()
                    val topMix = if (t < 0.33f) 0f else if (t < 0.66f) (t - 0.33f) / 0.33f else 1f
                    val midMix = if (t < 0.33f) 0f else if (t < 0.66f) (t - 0.33f) / 0.33f else 1f
                    val botMix = if (t < 0.33f) t / 0.33f else 1f
                    scrim.background = GradientDrawable(
                        GradientDrawable.Orientation.TOP_BOTTOM,
                        intArrayOf(
                            Color.rgb(lerp(fromR, toR, topMix), lerp(fromG, toG, topMix), lerp(fromB, toB, topMix)),
                            Color.rgb(lerp(fromR, toR, midMix), lerp(fromG, toG, midMix), lerp(fromB, toB, midMix)),
                            Color.rgb(lerp(fromR, toR, botMix), lerp(fromG, toG, botMix), lerp(fromB, toB, botMix))
                        )
                    )
                }
                start()
            }.also { colorAnim = it }
        }
    }

    fun sweepGlossOver() {
        if (!::gloss.isInitialized) return
        glossAnim?.cancel()
        glossAnim = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 2400
            interpolator = android.view.animation.DecelerateInterpolator(2f)
            addUpdateListener { va ->
                val t = va.animatedFraction
                gloss.alpha = when {
                    t < 0.2f -> t / 0.2f * 0.55f
                    t < 0.7f -> 0.55f
                    else     -> (1f - t) / 0.3f * 0.55f
                }
            }
            start()
        }
    }

    fun show() { activity.runOnUiThread { scrim.animate().alpha(1f).setDuration(200).start(); gloss.animate().alpha(1f).setDuration(200).start() } }
    fun hide() { activity.runOnUiThread { scrim.animate().alpha(0f).setDuration(180).start(); gloss.animate().alpha(0f).setDuration(180).start() } }
}
