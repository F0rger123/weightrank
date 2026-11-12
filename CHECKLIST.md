# WeightRank checklist

## Done
- [x] Rep counter (unit-tested): full range only, hysteresis, smoothing, bottom estimation across dropped frames, half-rep / knee push-up / sagging-hip rejection
- [x] Five exercises: push-ups, squats, dips, pull-ups (chin check), plank (good-form seconds only)
- [x] Native Android pose camera (CameraX + MediaPipe, on-device, GPU with CPU fallback)
- [x] Browser pose camera (MediaPipe in the page) so iPhone users can use the web app
- [x] Installable web app shell (manifest, home-screen icon, iPhone meta tags) + in-app install guide
- [x] 60-second duels: Elo, 6 ranks, fair capped bots with stamina
- [x] Online matchmaking code (Supabase Realtime presence + broadcast), real players first, bot after 15 s
- [x] Live friend rooms (room link / code), synced countdown, live scores
- [x] Offline friend challenges: share link or 4-letter code with a score to beat
- [x] Stats, streaks, daily quests, 13 achievements, levels, adventure mode
- [x] Redesign: new icon, animated buttons/cards/counters, countdown and result animations, haptics on every tap, rep, countdown and result
- [x] Bottom bar sits above the phone's gesture bar
- [x] In-app "update available" banner (switch on with `extra.updateFeedUrl`)
- [x] README, AI guide, llms.txt, SETUP.md

## Waiting on the owner (see SETUP.md)
- [ ] Test the APK on the Pixel: camera tracking has never run on a real phone
- [ ] Supabase project for online play: code is ready, needs URL + publishable key
- [ ] Web hosting for the iPhone version and https invite links
- [ ] Expo account for silent over-the-air updates

## Not built yet
- [ ] Online leaderboards and accounts (needs Supabase)
- [ ] Guilds and raids
- [ ] Nutrition from a food photo (would need a paid vision API: ask first)
- [ ] Anti-cheat for online duels (scores are trusted from each phone)
- [ ] Native iPhone app (needs an Apple developer account, $99/yr: ask first)
