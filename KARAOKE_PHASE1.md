# Karaoke — Phase 1 implementation

Companion doc to [KARAOKE_PLAN.md](KARAOKE_PLAN.md). Summarizes what shipped
in Phase 1 — the lyrics-only karaoke flow with rhythm scoring — plus the
pre-song intro and 3-2-1 countdown screens that wrap the experience like a
modern karaoke machine.

## Status

- ✅ **Phase 1** — Lyrics karaoke (rhythm scoring only)
- ✅ **Bonus** — Pre-song intro splash + 3-2-1-SING countdown (added beyond the original plan)
- ⏳ Phase 2 — Backend pitch pipeline (not started)
- ⏳ Phase 3 — Pitch scoring on frontend (not started)
- ⏳ Phase 4 — Coverage expansion + UX polish (not started)

## User flow

1. Log in via Spotify OAuth (unchanged).
2. Navigate to **/search**, find a song.
3. Click the new mic icon on any result row.
4. Land on **/karaoke/:trackId** — three phases play out:
   - **Intro** — album-cover splash + readiness badges + Start button
   - **Countdown** — 3 → 2 → 1 → SING! pulse
   - **Playing** — synced lyrics + mic meter + running score

## Architecture

### Phase machine

The whole experience lives in a single component (`Pages/Karaoke.jsx`)
driven by a `phase` state:

```
'intro' ──[user clicks Start]──▶ 'countdown' ──[setTimeout chain]──▶ 'playing'
```

Hooks (`useMicrophone`, `getSyncedLyrics`, `getTrack`) all run regardless
of phase, so by the time the user finishes reading the intro splash, mic
permission is already settled and lyrics are usually loaded. Playback
(`playUri`) is gated on `phase === 'playing'` so audio cannot kick in early.

### Files added

| File | Role |
|---|---|
| `Api/lyrics.js` | LRClib client. Parses LRC `[mm:ss.xx]` timestamps into `{ time_ms, text }` lines. |
| `Audio/useMicrophone.js` | Hook around `getUserMedia({ audio: true })`. Releases the stream on unmount. |
| `Audio/useVAD.js` | Voice-activity detection. RMS over 100 ms windows from a Web Audio `AnalyserNode`. |
| `Components/LyricsPanel.jsx` | Auto-scrolling lyrics, active line highlighted + scaled. |
| `Components/MicMeter.jsx` | Vertical RMS bar + mic-state tooltip. |
| `Components/ScoringDisplay.jsx` | Score (0–100) + chip strip of last 8 line results. |
| `Components/KaraokeIntro.jsx` | Pre-song splash: cover, title, readiness badges, Start button. |
| `Components/KaraokeCountdown.jsx` | 3-2-1-SING animation. |
| `Pages/Karaoke.jsx` | The whole karaoke flow — phase machine, scoring loop, render branches. |

### Files modified

| File | Change |
|---|---|
| `App.jsx` | Added `/karaoke/:trackId` route. |
| `Pages/Search.jsx` | Added mic icon button per row → navigates to karaoke. |

## Intro screen

`Components/KaraokeIntro.jsx`

- Blurred album-cover backdrop (60 px blur, 1.4× saturate) + dark gradient overlay for legibility.
- Foreground: album cover (260 px, pops in with a cubic-bezier keyframe), title (2.4 rem bold), artist.
- Three readiness badges:
  - **Spotify** — `ok` (Premium + SDK ready) / `error` (no Premium) / `pending` (connecting)
  - **Mic** — `ok` / `warn` (denied or not found) / `pending` (requesting)
  - **Lyrics** — `ok` (synced) / `warn` (plain only or missing) / `pending` (loading)
- **START KARAOKE** button glows when ready, disabled with tooltip when something is missing.
- Premium is the only hard blocker. Mic-denied or lyrics-missing both fall through with downgraded behavior.

## Countdown screen

`Components/KaraokeCountdown.jsx`

- Same backdrop as intro, heavier blur (90 px) and dimmer overlay (72 % black).
- One huge number per beat, centered.
  - **3, 2, 1** — 14 rem, "Get ready" subtext, `tickPulse` keyframe (scale 0.3 → 1.18 → 1).
  - **SING!** — 7 rem, no subtext, `goPulse` keyframe (scale 0.6 → 1.25 → 1.1).
- Total duration: 3 × 1000 ms + 500 ms = **3.5 s**.
- `<Box key={value}>` forces a remount on each tick so the keyframe re-runs cleanly per digit.

## Scoring (Phase 1 — rhythm only)

For each lyric line at timestamp `T_i`:

- Window: `[T_i − 500 ms, T_i + lineDuration + 500 ms]`
  where `lineDuration = T_{i+1} − T_i`, or 5000 ms for the final line.
- Line counts as correct if VAD was active at any point during the window.
- Score = (correct lines / evaluated lines) × 100.

A 10 Hz interval inside `Karaoke.jsx`:

1. Reads the current `positionMs` (extrapolated from `state.position + (Date.now() − state.timestamp)`).
2. Pushes `{ positionMs, active }` into a rolling history (10 s window).
3. Evaluates any lines whose window has fully elapsed.
4. Updates `score` and `lineResults` state.

The interval is gated on `lyrics?.lines && !isPaused`, so it only runs
during actual playback.

## Lyrics — LRClib client

`Api/lyrics.js#getSyncedLyrics`

- Calls `GET https://lrclib.net/api/get?artist_name=…&track_name=…&album_name=…&duration=…`
- Open CORS, no API key required.
- Returns one of:
  - `{ lines: [{ time_ms, text }], plainText }` — synced (best case)
  - `{ lines: null, plainText }` — plain text only (no time anchors)
  - `{ lines: [], plainText: null, instrumental: true }` — track is instrumental
  - `null` — not found / network error

LRC timestamps are parsed via a single regex
(`^\[(\d+):(\d+)\.(\d+)\]\s*(.*)`). Sub-second digits are normalized to
3-digit ms.

Genius plain-text fallback is **deferred** — Genius blocks browser CORS, so
a server hop is needed. That belongs alongside the Phase 2 backend.

## Audio hooks

**`Audio/useMicrophone.js`** — single `useEffect` that calls
`navigator.mediaDevices.getUserMedia({ audio: true })`, stores the stream,
maps `DOMException.name` to stable error codes (`microphone_denied`,
`microphone_not_found`, `microphone_error`), and stops every track in
cleanup so the OS releases the mic indicator.

**`Audio/useVAD.js`** — given a stream, wires it into an `AudioContext` →
`MediaStreamAudioSource` → `AnalyserNode`. Polls `getFloatTimeDomainData`
every 100 ms, computes RMS, exposes `{ rms, isVoiceActive }` where
`isVoiceActive = rms > 0.01`. Tears down the context in cleanup.

## Routing

No React Router. `App.jsx` does manual path matching:

```js
if (path.startsWith('/search')) page = <Search />;
else if (path.startsWith('/karaoke/')) {
    const trackId = path.split('/karaoke/')[1];
    page = <Karaoke trackId={trackId} />;
}
else page = <Profile />;
```

The Karaoke page reads `trackId` as a prop instead of from the URL itself.

## Manual verification

1. `cd front-end && npm run dev`
2. Open http://127.0.0.1:3001, log in.
3. Go to `/search`, look up a popular song (Bohemian Rhapsody, Don't Stop Believing — anything with strong LRClib coverage).
4. Click the mic icon on a result row.
5. Confirm the intro splash shows with track info + status badges.
6. Wait for all three badges to settle (no `pending` left).
7. Click **START KARAOKE**.
8. Confirm 3 → 2 → 1 → SING! pulses through the screen.
9. Confirm the song starts playing and lyrics highlight in sync.
10. Sing along — score chips should appear (✓ green when on time).
11. Click the back arrow — return to search; song keeps playing in NowPlayingBar.

## Known limitations (deferred to later phases)

- **Pitch detection** — Phase 1 scores rhythm only. Phase 3 will add pitch
  overlay using the cached contours from Phase 2's backend.
- **Genius plain-text fallback** — needs a server hop (Genius blocks browser CORS).
- **Refresh-token handling** — sessions still cap at ~1 h before re-auth
  (carried over from PLAYBACK_PLAN.md).
- **Restart / replay** — no in-page "go again" affordance yet. User has to
  navigate back and click the mic icon again.
- **Cold-start UX** — not relevant until Phase 2 backend stands up.
