# AI guide: walking someone through WeightRank

You're helping a person who pasted this repo's link. Read this first.

## What it is, in plain words

WeightRank is a free Android fitness game. The phone's camera watches you do push-ups (or squats, dips,
pull-ups, planks) and counts only proper, full reps. You can train freely, race a computer opponent for
60 seconds to climb a ranking ladder (Bronze to Diamond), or fight cartoon monsters where each rep is a hit.
All the camera work happens on the phone. No account, no payment.

## Ask the person first

1. Do you want to **use** the app (install it on your Android phone) or **work on** the code?
2. Which phone do you have? (Android gets the app. iPhone uses the home-screen web app: open https://f0rger123.github.io/weightrank/ in Safari → Share → Add to Home Screen.)
3. Is this a Windows, Mac or Linux computer?
4. Are you comfortable running commands in a terminal?

## Set it up

**Just use it:** get the APK file from the person who built it (or a GitHub release), open it on the phone,
allow "install unknown apps" for the browser or Files app when Android asks, then open WeightRank.
Check it worked: the Train screen shows five exercises; tapping Push-ups asks for the camera.

**Work on it:**

1. Install Node.js (22.19+, 24.11+ or 26+). Check: `node -v`.
2. `npm install` in this folder.
3. `npm test`. Check: all tests pass.
4. `npm run web` opens a preview with a simulated body (development only) so screens can be tried without a phone.
5. To build the phone app you also need Android Studio (for the Android SDK and its bundled Java). Then
   `npx expo prebuild --platform android` and `cd android && ./gradlew assembleRelease`.
   On Windows, copy the project to a short folder like `C:\wr` first: long folder paths break the C++ build.
6. Install on a plugged-in phone with USB debugging on: `adb install -r android/app/build/outputs/apk/release/app-release.apk`.

## How to use it

- **Train:** pick an exercise, prop the phone up side-on about 2 m away with your whole body in view, go.
- **Duel:** pick an exercise, tap Find opponent, hold the top position until the countdown, then most clean reps in 60 s wins.
- **Adventure:** each rep damages the creature; beat it before the timer.
- **Progress:** streaks, quests, achievements, settings (voice on/off, reset).

## Never do this

- Never print, paste or commit secrets (keystores, `.env` files, tokens).
- Never sign the person up for a paid service, add a subscription or paywall, or spend money.
- Never touch a production database or publish a release without the person's clear yes.
- Never send camera video or body data off the phone. Tracking stays on-device by design.
- Don't copy another app's code, images, text or branding.
