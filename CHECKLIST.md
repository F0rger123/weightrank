# WeightRank checklist

## Done (code written, not yet run on a phone)
- [x] Expo SDK 58 + TypeScript project, Expo Router tabs: Train, Duel, Adventure, Progress
- [x] Rep counter (pure, unit-tested): lockout-to-full-depth rule, hysteresis, One Euro smoothing,
      bottom estimation across dropped frames, half-rep and knee push-up rejection, sagging-hip rejection
- [x] Exercises: push-ups, squats, dips, pull-ups (chin-over-hands check), plank timer (good form only)
- [x] Live range-of-motion gauge, skeleton overlay, form tips, voice count, haptics
- [x] 60-second ranked duels vs bots, Elo (start 1000, K 40/32/24), 6 ranks Bronze to Diamond
- [x] Fair bots: ~1000 rating = 7-15 push-ups, hard per-rank caps, stamina curve (tested over 2000 seeds)
- [x] XP and levels, streaks, 3 daily quests, 13 achievements, 14-day chart
- [x] Adventure mode: reps deal damage, perfect reps crit, bosses every 5 stages
- [x] Native Android module `modules/pose-camera`: CameraX + MediaPipe Pose Landmarker (on-device, GPU with CPU fallback)

## Not done yet
- [ ] First APK build (`npx expo prebuild` + Gradle); the native module has never been compiled
- [ ] Test on the Pixel: tracking accuracy and thresholds need tuning against real bodies
- [ ] Auto-updates: needs a free Expo account (EAS Update), then one APK reinstall
- [ ] App icon and branding art (default Expo icons still in place)
- [ ] Supabase accounts and online leaderboards (ask before creating anything)
- [ ] Friend challenges, guilds and raids, real-player 1v1
- [ ] README, AGENTS.md AI guide, llms.txt, GitHub repo
