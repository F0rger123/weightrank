package expo.modules.posecamera

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.SystemClock
import android.util.Log
import android.view.ViewGroup
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Camera preview plus on-device pose tracking.
 *
 * Frames go CameraX -> upright, mirrored-like-the-preview bitmap -> MediaPipe
 * PoseLandmarker (live stream mode) -> "onPose" event with 33 normalized
 * landmarks. Everything runs on the phone; nothing is uploaded.
 */
@SuppressLint("ViewConstructor")
class PoseCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onPose by EventDispatcher()
  private val onStatus by EventDispatcher()

  private val previewView = PreviewView(context).apply {
    layoutParams = LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    scaleType = PreviewView.ScaleType.FILL_CENTER
    // TextureView keeps the preview inside React Native's view hierarchy correctly.
    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
  }

  private var executor: ExecutorService? = null
  private var landmarker: PoseLandmarker? = null
  private var provider: ProcessCameraProvider? = null
  private var facing = "front"
  private var active = true
  private var bound = false
  private var frameW = 0
  private var frameH = 0
  private var lastFrameAt = 0L
  private var fps = 0.0

  // React Native never measures views added from native code, so without this the
  // camera preview stays 0x0 (a black screen). Let Android lay out our children.
  override val shouldUseAndroidLayout = true

  init {
    addView(previewView)
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    previewView.measure(MeasureSpec.makeMeasureSpec(w, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(h, MeasureSpec.EXACTLY))
    previewView.layout(0, 0, w, h)
  }

  fun setFacing(value: String) {
    if (value == facing) return
    facing = value
    if (bound) rebind()
  }

  fun setActive(value: Boolean) {
    if (value == active) return
    active = value
    if (active) start() else stop()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (active) start()
  }

  override fun onDetachedFromWindow() {
    stop()
    super.onDetachedFromWindow()
  }

  fun release() {
    stop()
    executor?.shutdown()
    executor = null
  }

  private fun start() {
    if (bound) return
    val exec = executor ?: Executors.newSingleThreadExecutor().also { executor = it }
    exec.execute {
      if (landmarker == null) landmarker = createLandmarker()
      post { rebind() }
    }
  }

  private fun stop() {
    try {
      provider?.unbindAll()
    } catch (e: Exception) {
      Log.w(TAG, "unbind failed", e)
    }
    bound = false
    executor?.execute {
      landmarker?.close()
      landmarker = null
    }
  }

  private fun createLandmarker(): PoseLandmarker? {
    for (delegate in listOf(Delegate.GPU, Delegate.CPU)) {
      try {
        val base = BaseOptions.builder()
          .setModelAssetPath(MODEL)
          .setDelegate(delegate)
          .build()
        val options = PoseLandmarker.PoseLandmarkerOptions.builder()
          .setBaseOptions(base)
          .setRunningMode(RunningMode.LIVE_STREAM)
          .setNumPoses(1)
          .setMinPoseDetectionConfidence(0.5f)
          .setMinPosePresenceConfidence(0.5f)
          .setMinTrackingConfidence(0.5f)
          .setResultListener { result: PoseLandmarkerResult, _ -> emitResult(result) }
          .setErrorListener { e -> emitStatus("error", e.message ?: "pose error") }
          .build()
        val lm = PoseLandmarker.createFromOptions(context, options)
        emitStatus("ready", delegate.name)
        return lm
      } catch (e: Exception) {
        Log.w(TAG, "PoseLandmarker with $delegate failed", e)
      }
    }
    emitStatus("error", "Pose model could not start on this phone")
    return null
  }

  private fun rebind() {
    val owner = appContext.currentActivity as? LifecycleOwner
    if (owner == null) {
      emitStatus("error", "No activity")
      return
    }
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      try {
        val p = future.get()
        provider = p
        p.unbindAll()
        val selector = ResolutionSelector.Builder()
          .setAspectRatioStrategy(AspectRatioStrategy.RATIO_4_3_FALLBACK_AUTO_STRATEGY)
          .build()
        val preview = Preview.Builder().setResolutionSelector(selector).build().also {
          it.surfaceProvider = previewView.surfaceProvider
        }
        val analysis = ImageAnalysis.Builder()
          .setResolutionSelector(selector)
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
          .build()
        val exec = executor ?: Executors.newSingleThreadExecutor().also { executor = it }
        analysis.setAnalyzer(exec) { image -> analyze(image) }
        val cam = if (facing == "back") CameraSelector.DEFAULT_BACK_CAMERA else CameraSelector.DEFAULT_FRONT_CAMERA
        p.bindToLifecycle(owner, cam, preview, analysis)
        bound = true
        emitStatus("camera", facing)
      } catch (e: Exception) {
        Log.e(TAG, "bind failed", e)
        emitStatus("error", e.message ?: "Camera failed to start")
      }
    }, ContextCompat.getMainExecutor(context))
  }

  private fun analyze(image: ImageProxy) {
    val lm = landmarker
    if (lm == null) {
      image.close()
      return
    }
    try {
      // toBitmap() handles row padding (rowStride > width * 4), which many phones add.
      val src = image.toBitmap()
      // Rotate upright and mirror the front camera, so landmarks line up with the preview.
      val m = Matrix().apply {
        postRotate(image.imageInfo.rotationDegrees.toFloat())
        if (facing != "back") postScale(-1f, 1f)
      }
      val upright = Bitmap.createBitmap(src, 0, 0, src.width, src.height, m, false)
      frameW = upright.width
      frameH = upright.height
      lm.detectAsync(BitmapImageBuilder(upright).build(), SystemClock.uptimeMillis())
    } catch (e: Exception) {
      Log.w(TAG, "frame failed", e)
    } finally {
      image.close()
    }
  }

  private fun emitResult(result: PoseLandmarkerResult) {
    val now = SystemClock.uptimeMillis()
    if (lastFrameAt > 0) {
      val inst = 1000.0 / (now - lastFrameAt).coerceAtLeast(1)
      fps = if (fps == 0.0) inst else fps * 0.9 + inst * 0.1
    }
    lastFrameAt = now
    val poses = result.landmarks()
    val flat = if (poses.isEmpty()) {
      emptyList<Double>()
    } else {
      val out = ArrayList<Double>(33 * 4)
      for (l in poses[0]) {
        out.add(l.x().toDouble())
        out.add(l.y().toDouble())
        out.add(l.z().toDouble())
        out.add(l.visibility().orElse(0f).toDouble())
      }
      out
    }
    val payload = mapOf(
      "t" to result.timestampMs().toDouble(),
      "landmarks" to flat,
      "width" to frameW,
      "height" to frameH,
      "fps" to fps,
    )
    post { onPose(payload) }
  }

  private fun emitStatus(state: String, detail: String) {
    post { onStatus(mapOf("state" to state, "detail" to detail)) }
  }

  companion object {
    private const val TAG = "PoseCamera"
    private const val MODEL = "pose_landmarker_full.task"
  }
}
