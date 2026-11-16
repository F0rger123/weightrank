# Owner setup: what only you can do

Everything else is built. These switch on the parts that need your accounts. Nothing here costs money.

| # | What | Why | Status |
|---|---|---|---|
| 1 | **Install the APK** from [Releases](https://github.com/F0rger123/weightrank/releases/latest) on your Pixel. From 0.3.0 on, the app updates itself: it downloads new versions on launch and asks you to tap Install | Test the camera tracking for real | ⬜ |
| 2 | **Free Supabase project** for online play (or say which existing project to use) | Real-player matchmaking and live friend rooms | ⬜ |
| 3 | Web hosting | iPhone version + https invite links | ✅ live at https://f0rger123.github.io/weightrank/ |
| 4 | Optional: free Expo account (expo.dev/signup) | Would make small updates install with no tap at all | optional |

## 2. Supabase (online matchmaking)

Online duels use Supabase Realtime only: presence + broadcast. No tables, no stored video, no paid features.

1. Create a free project at supabase.com (or tell Claude which existing project to use).
2. Project Settings → API: copy the **Project URL** and the **publishable (anon) key**. This key is meant to be public; never share the service-role key.
3. Give both to Claude, or put them in `app.json` → `expo.extra.supabaseUrl` and `supabaseAnonKey`.
4. Rebuild the APK. The Duel tab then says "Online: real players first".

## 3. Web hosting (iPhone + links)

The web build is `npx expo export --platform web` → `dist/`. Any static host works. When it's live, set
`expo.extra.webUrl` in `app.json` to the address so challenge and room links use https.
iPhone users then open the link in Safari → Share → Add to Home Screen.

## 4. Expo account (silent updates)

After `npx eas-cli login`, Claude runs `eas update:configure` and switches `updates.enabled` on.
That needs one more APK install; after that, code changes arrive by themselves.
