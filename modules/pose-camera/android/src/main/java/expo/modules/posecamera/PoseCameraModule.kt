package expo.modules.posecamera

import android.Manifest
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoseCameraModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PoseCamera")

    AsyncFunction("requestCameraPermission") { promise: Promise ->
      Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.CAMERA)
    }

    AsyncFunction("getCameraPermission") { promise: Promise ->
      Permissions.getPermissionsWithPermissionsManager(appContext.permissions, promise, Manifest.permission.CAMERA)
    }

    View(PoseCameraView::class) {
      Events("onPose", "onStatus")

      Prop("facing") { view: PoseCameraView, facing: String ->
        view.setFacing(facing)
      }

      Prop("active") { view: PoseCameraView, active: Boolean ->
        view.setActive(active)
      }

      OnViewDestroys { view: PoseCameraView ->
        view.release()
      }
    }
  }
}
