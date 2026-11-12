# MediaPipe reads its protobuf option classes by reflection (e.g. field "platform_").
# Release builds shrink and rename them unless they're kept.
-keep class com.google.mediapipe.** { *; }
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.mediapipe.**
-dontwarn com.google.protobuf.**
-keep class com.google.common.flogger.** { *; }
-dontwarn com.google.common.flogger.**
