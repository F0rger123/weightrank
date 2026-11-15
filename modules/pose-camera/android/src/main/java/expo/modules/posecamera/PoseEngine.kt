package expo.modules.posecamera

import android.content.Context
import android.util.Log
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import java.util.concurrent.Executors

/**
 * One pose model for the whole app. Loading it (and the GPU) takes a second or
 * two, so it's created once, warmed up when the app opens, and reused by every
 * camera screen instead of being rebuilt each time.
 */
object PoseEngine {
  private const val TAG = "PoseEngine"
  private const val MODEL = "pose_landmarker_full.task"
  private val exec = Executors.newSingleThreadExecutor()

  @Volatile private var landmarker: PoseLandmarker? = null
  @Volatile private var starting = false
  @Volatile private var lastTs = 0L
  @Volatile var delegate: String = ""
    private set

  /** The camera screen currently on display receives results here. */
  @Volatile var listener: ((PoseLandmarkerResult) -> Unit)? = null
  @Volatile var errorListener: ((String) -> Unit)? = null

  val ready: Boolean get() = landmarker != null

  fun warmup(context: Context) {
    synchronized(this) {
      if (landmarker != null || starting) return
      starting = true
    }
    val app = context.applicationContext
    exec.execute {
      landmarker = create(app)
      starting = false
    }
  }

  /** Feed one upright frame. Timestamps must strictly increase across all callers. */
  fun detect(image: MPImage, timestampMs: Long): Boolean {
    val lm = landmarker ?: return false
    val ts = if (timestampMs <= lastTs) lastTs + 1 else timestampMs
    lastTs = ts
    lm.detectAsync(image, ts)
    return true
  }

  private fun create(context: Context): PoseLandmarker? {
    for (d in listOf(Delegate.GPU, Delegate.CPU)) {
      try {
        val base = BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(d).build()
        val options = PoseLandmarker.PoseLandmarkerOptions.builder()
          .setBaseOptions(base)
          .setRunningMode(RunningMode.LIVE_STREAM)
          .setNumPoses(1)
          .setMinPoseDetectionConfidence(0.5f)
          .setMinPosePresenceConfidence(0.5f)
          .setMinTrackingConfidence(0.5f)
          .setResultListener { result: PoseLandmarkerResult, _ -> listener?.invoke(result) }
          .setErrorListener { e -> errorListener?.invoke(e.message ?: "pose error") }
          .build()
        val lm = PoseLandmarker.createFromOptions(context, options)
        delegate = d.name
        Log.i(TAG, "pose model ready on $d")
        return lm
      } catch (e: Exception) {
        Log.w(TAG, "PoseLandmarker with $d failed", e)
      }
    }
    errorListener?.invoke("Pose model could not start on this phone")
    return null
  }
}
