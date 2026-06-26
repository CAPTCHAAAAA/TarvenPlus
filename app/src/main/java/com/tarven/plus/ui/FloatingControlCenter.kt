package com.tarven.plus.ui

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.app.Activity
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import kotlin.math.sqrt

/**
 * Unified Chameleon Controller — single-animator state machine for the adaptive scrim bar.
 *
 * - One ValueAnimator drives both the scrim background color AND the gloss alpha on a single timeline.
 * - On rapid re-trigger, reads the current interpolated color as the new start point (seamless interrupt).
 * - Gloss uses parabolic sin() breathing for natural feel; blend mode SCREEN for ambient glow.
 * - Color-distance threshold filters out sub-visible noise from scrolling or minor shifts.
 */
class FloatingControlCenter(private val activity: Activity) {

    private val MATCH = ViewGroup.LayoutParams.MATCH_PARENT

    private lateinit var scrim: View
    private lateinit var gloss: View

    private var root: FrameLayout? = null
    private var barBand = 0

    // Single-animator state
    private var animator: ValueAnimator? = null
    private var currentColor = 0xFF181818.toInt()
    private var targetColor = 0xFF181818.toInt()
    private val argbEvaluator = ArgbEvaluator()

    fun attach(root: FrameLayout, statusBarHeight: Int) {
        this.root = root
        this.barBand = statusBarHeight
        buildScrim()
        buildGloss()
        root.addView(scrim)
        root.addView(gloss)
        scrim.alpha = 0f; gloss.alpha = 0f
        scrim.animate().alpha(1f).setDuration(280).start()
    }

    private fun buildScrim() {
        scrim = View(activity).apply {
            setBackgroundColor(currentColor)
            layoutParams = FrameLayout.LayoutParams(MATCH, barBand).apply {
                gravity = Gravity.TOP or Gravity.START; topMargin = 0
            }
            isClickable = false
        }
    }

    private fun buildGloss() {
        val h = (barBand * 0.3f).toInt()
        gloss = View(activity).apply {
            setBackgroundColor(0xFFFFFFFF.toInt())
            alpha = 0f
            // SCREEN blend — ambient glow, not white wash
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                backgroundTintBlendMode = android.graphics.BlendMode.SCREEN
            } else {
                @Suppress("DEPRECATION")
                backgroundTintMode = PorterDuff.Mode.SCREEN
            }
            layoutParams = FrameLayout.LayoutParams(MATCH, h).apply {
                gravity = Gravity.TOP or Gravity.START; topMargin = 0
            }
            isClickable = false
        }
    }

    /**
     * Check whether two colors differ enough to warrant a visible animation.
     * Filters out micro-shifts from scrolling or sub-pixel sampling noise.
     */
    fun isSignificantChange(color1: Int, color2: Int): Boolean {
        val rDiff = Color.red(color1) - Color.red(color2)
        val gDiff = Color.green(color1) - Color.green(color2)
        val bDiff = Color.blue(color1) - Color.blue(color2)
        val distance = sqrt((rDiff * rDiff + gDiff * gDiff + bDiff * bDiff).toDouble())
        return distance > 15.0
    }

    fun getCurrentColor() = currentColor

    /**
     * Seamless-interrupt color transition.
     * If an animation is mid-flight, the current interpolated frame color
     * becomes the new starting point — no visual jump, no flash.
     */
    fun setScrimColor(newColor: Int) {
        activity.runOnUiThread {
            if (!::scrim.isInitialized) return@runOnUiThread

            // No-op if already at target
            if (newColor == targetColor) return@runOnUiThread

            // Seamless interrupt: use current rendered color as start
            val startColor = if (animator?.isRunning == true) {
                animator?.cancel()
                currentColor
            } else {
                currentColor
            }
            targetColor = newColor

            animator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 650
                interpolator = DecelerateInterpolator(1.5f)

                addUpdateListener { anim ->
                    val fraction = anim.animatedValue as Float

                    // 1. Scrim background — ArgbEvaluator blend
                    val c = argbEvaluator.evaluate(fraction, startColor, targetColor) as Int
                    currentColor = c
                    scrim.setBackgroundColor(c)

                    // 2. Gloss alpha — parabolic sin() 0→peak→0
                    gloss.alpha = (Math.sin(fraction * Math.PI) * 0.65).toFloat()
                }
                start()
            }
        }
    }

    fun show() { activity.runOnUiThread { scrim.animate().alpha(1f).setDuration(200).start() } }
    fun hide() { activity.runOnUiThread { scrim.animate().alpha(0f).setDuration(180).start() } }
}
