#!/usr/bin/env bash
# Guard against the update loop: the APK's versionCode must match latest.json and app.json.
set -euo pipefail
apk="$1"; json="${2:-release/latest.json}"
aapt2="${AAPT2:-$LOCALAPPDATA/Android/Sdk/build-tools/36.1.0/aapt2.exe}"
apk_code=$("$aapt2" dump badging "$apk" | grep -o "versionCode='[0-9]*'" | grep -o "[0-9]*")
feed_code=$(node -p "require('./$json').versionCode")
app_code=$(node -p "require('./app.json').expo.android.versionCode")
echo "apk=$apk_code feed=$feed_code app.json=$app_code"
[ "$apk_code" = "$feed_code" ] && [ "$apk_code" = "$app_code" ] || { echo "MISMATCH: run npx expo prebuild before building"; exit 1; }
