# Karaoke — implementation plan

## Context

Spotify's `/audio-analysis` and `/audio-features` endpoints are returning **403 Forbidden** for this dev app (Spotify restricted these endpoints for apps registered after Nov 2024 unless granted Extended Quota Mode). This means we **cannot use Spotify's pre-computed pitch / beat data** for karaoke scoring.

Additionally, the **Web Playback SDK plays audio inside an iframe that can't be tapped** by the Web Audio API — by design, for DRM. So we can't run pitch detection on the audio Spotify is playing.

This document plans a karaoke architecture that works around both constraints by:
- Using **YouTube's Topic-channel uploads** (auto-uploaded, identical-master copies of major-label tracks) as a separate analysis-only audio source.
- **ISRC matching** between Spotify and YouTube to verify both are the same recording, so a pitch contour computed from YouTube's audio aligns to Spotify's playback exactly.
- Running pitch extraction **once per song offline**, caching the result, and using it at runtime to score the user's mic input against expected pitch — while Spotify continues to handle playback normally.

Lyrics come from **LRClib** (free, open synced-lyrics API) with **Genius** as a plain-text fallback.

## Architecture

```
                         ┌──────────────────────────────────┐
                         │  Karaoke backend (one-time work) │
                         │  ───────────────────────────────  │
   Spotify track ID  ──► │  1. /tracks/{id} → ISRC          │
                         │  2. YouTube Music → Topic match  │
                         │     verified by ISRC + duration  │
                         │  3. yt-dlp → audio file          │
                         │  4. librosa.pyin / CREPE → pitch │
                         │  5. Store contour in Supabase    │
                         └────────────────┬─────────────────┘
                                          │ pitch_array
                                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Karaoke session (frontend, runtime)                                 │
│                                                                      │
│  Spotify SDK plays the actual song                                   │
│      │                                                               │
│      ▼                                                               │
│  state.position (ms) ──► expected_pitch[position]  (from contour)    │
│                                                                      │
│  navigator.getUserMedia ──► mic ──► pitchy ──► actual_pitch          │
│                                                                      │
│  compare ──► running_score                                           │
│                                                                      │
│  LRClib lyrics ──► LyricsPanel scrolls in sync with state.position   │
└──────────────────────────────────────────────────────────────────────┘
```

The runtime separation is the key win: **Spotify is the playback engine; YouTube was the analysis source weeks ago; the user's mic + scoring all happens client-side.**

## External services & dependencies

| Service | Purpose | Auth | Cost |
|---|---|---|---|
| **Spotify Web API + Playback SDK** | Search, track metadata, ISRC, playback | OAuth (existing) | Free |
| **LRClib** (`lrclib.net/api/get`) | Synced lyrics in LRC format | None | Free |
| **Genius API** | Plain-text lyrics fallback | API key (free tier) | Free |
| **YouTube Music** (search, internal API or `ytmusicapi`) | Find Topic-channel match for Spotify track | Anonymous | Free |
| **yt-dlp** | Extract audio from YouTube | None | Free (legal gray area; analysis-only use) |
| **librosa.pyin** or **CREPE** | Pitch detection on audio | None | Free, open source |
| **Supabase** | Postgres for pitch contours + lyrics cache; Auth not needed | API key | Free tier ample |
| **`pitchy`** (npm) | Client-side mic pitch detection | None | Free, ~15 KB |

## Backend deployment

A small **Python FastAPI service** for the audio-analysis pipeline (yt-dlp + librosa). Deployment options ranked by simplicity:

1. **Fly.io free tier** — single container, ~$0/month for low traffic, Python natively. **Recommended.**
2. **Render.com free tier** — same idea, slightly easier to set up; cold-starts after 15min idle.
3. **Supabase Edge Functions** — Deno only; would need to call out to an external Python service for librosa anyway.
4. **Local-only / GitHub Actions** — runs the analysis offline and pushes results to Supabase. Fine for personal-use, no public API.

The plan assumes Fly.io for the actual deploy; the frontend code path is the same regardless.

## Phased rollout

Four commits. Each is independently shippable; users get progressive value.

### Phase 1 — Lyrics karaoke (rhythm scoring only)

Ships first because it validates the full UX flow (mic permission, lyrics sync, scoring loop) without needing the backend.

**New files:**

- `front-end/src/Pages/Karaoke.jsx` — the active karaoke view. Mounts at `/karaoke/:trackId`. Reads track from Spotify (`getTrack`), pulls lyrics from LRClib, requests mic permission, plays via `playUri()`, scores rhythmically.
- `front-end/src/Components/LyricsPanel.jsx` — scrolls through synced LRC lines in time with `state.position`. Active line highlighted in primary color; previous/next lines dimmed.
- `front-end/src/Components/MicMeter.jsx` — visualizes mic input level (a vertical bar driven by RMS). Confirms to user that the mic is being captured.
- `front-end/src/Components/ScoringDisplay.jsx` — running score + per-line feedback (`✓ on time` / `✗ off`).
- `front-end/src/Audio/useMicrophone.js` — hook: requests `getUserMedia({ audio: true })`, returns `{ stream, error }`. Handles permission denied + no-mic-found gracefully.
- `front-end/src/Audio/useVAD.js` — voice-activity-detection hook. RMS over a 100ms window with a tunable threshold; returns `isVoiceActive` boolean reactively.
- `front-end/src/Api/lyrics.js` — LRClib client. `getSyncedLyrics({ artist, track, album, duration })` → returns `{ lines: Array<{ time_ms, text }> }` or null. Fallback to Genius for plain-text-only when LRClib misses.

**Modified files:**

- `front-end/src/App.jsx` — add `/karaoke/:trackId` route handling.
- `front-end/src/Pages/Search.jsx` — add a secondary action per row: "Karaoke" button that navigates to `/karaoke/${track.id}`.
- `front-end/src/Components/SideNav.jsx` — could later add a "Karaoke" entry to the COMPETE group, deferred for now.

**Scoring algorithm (rhythm only):**

For each lyrics line `(time_ms, text)`:
- Define an expected-singing window `[time_ms - 500, time_ms + duration + 500]` ms
- Was VAD active at any point during the window? If yes → +1 line
- Was the user singing during silent windows (between lines)? If yes → -0.5 (penalize spam-singing)
- Final score = (correct lines / total lines) × 100

Simple but produces meaningful feedback on the first iteration.

**Verification:**

- Pick a Spotify track that has good LRClib coverage (e.g., a major hit from 2010s).
- Click "Karaoke" → page loads with track info + lyrics.
- Grant mic permission → mic meter starts moving.
- Play track → lyrics highlight in sync with playback.
- Sing along (or mumble-test) → scoring updates per line.
- Logout while playing → cleanup runs (mic released, audio stops).

### Phase 2 — Backend pitch pipeline

Stand up the analysis service. No frontend changes required at this phase except a tiny configuration constant (the backend URL).

**New repo or folder:** `karaoke-backend/` (suggest a separate repo since it's a different language + deploy story).

```
karaoke-backend/
├── main.py            # FastAPI: POST /analyze { spotify_track_id }
├── matcher.py         # YouTube Topic search + ISRC verification
├── analyzer.py        # yt-dlp + librosa.pyin pipeline
├── storage.py         # Supabase client
├── requirements.txt
├── Dockerfile
└── fly.toml
```

**Endpoint contract:**

```
POST /analyze
  body: { "spotify_track_id": "5CMjjywI0eZMixPeqNd75R" }
  response: { "status": "cached" | "computed" | "no_match",
              "pitch_count": 24034,
              "duration_ms": 240133 }
  side effect: pitch contour stored in Supabase keyed by spotify_track_id
```

**Pipeline steps inside `/analyze`:**

1. Check Supabase for existing contour → return `cached`.
2. Hit Spotify Web API for `/v1/tracks/{id}` with a service-account token to get `external_ids.isrc`, `name`, `artists`, `duration_ms`.
3. Search YouTube Music (via `ytmusicapi`) for `{title} {artist}` filtered to "Topic" channels. Verify candidates by ISRC if exposed, else by duration tolerance (±1s).
4. If no match → store a `null` row (so we don't re-try every play) and return `no_match`.
5. Run `yt-dlp` to download just the audio (best audio-only stream).
6. Run `librosa.pyin(audio, fmin=75, fmax=600, frame_length=2048, hop_length=512)` → array of `(frequency_hz, voicing_confidence)` at ~100 fps.
7. Quantize to a compact 16-bit Float16Array, store in Supabase (a `pitch_contours` table with `track_id`, `pitch_array`, `created_at`).
8. Return `computed` + counts.

**Supabase schema (new table):**

```sql
create table pitch_contours (
    track_id text primary key,
    isrc text,
    duration_ms int,
    pitch_array bytea,       -- packed Float16, 2 bytes per sample, 100fps
    confidence_array bytea,  -- packed UInt8, 1 byte per sample, 100fps
    youtube_video_id text,
    created_at timestamptz default now()
);
```

**Verification:**

- Curl the endpoint with a known popular Spotify track ID (Bohemian Rhapsody, etc.).
- Confirm pitch_array length matches `~ duration_ms / 10`.
- Spot-check a few pitch values against an audio inspection tool.
- Re-call → should return immediately as `cached`.

### Phase 3 — Pitch scoring on the frontend

Wire the pitch contour into the karaoke page's scoring loop.

**New files:**

- `front-end/src/Audio/usePitchDetector.js` — wraps `pitchy` over a `MediaStreamAudioSourceNode`. Returns the latest pitch + confidence at requestAnimationFrame cadence.
- `front-end/src/Components/PitchOverlay.jsx` — visualizes the user's mic pitch line vs the expected pitch line, like SingStar's bar overlay. Both as horizontal scrolling lines anchored to `state.position`.
- `front-end/src/Api/karaoke.js` — `getPitchContour(trackId)` — fetches the contour from Supabase (Supabase JS client also needs to be installed at this phase).

**Modified files:**

- `front-end/src/Pages/Karaoke.jsx` — fetches contour on mount; if available, swaps to pitch+rhythm scoring; if not, stays on rhythm-only.
- `front-end/package.json` — add `pitchy` and `@supabase/supabase-js`.

**Pitch scoring algorithm:**

Per frame (~30 fps via rAF):
- `expected = pitch_contour[Math.floor(state.position / 10)]` (10ms per sample at 100 fps)
- `actual = micPitchDetector.current.pitch`
- If `expected` is null (silence in track) and `actual` is not detected → +0
- If `expected` is set and `actual` is detected → score += `cents_distance(actual, expected)` mapped through a forgiveness curve (within 50 cents = full marks; 50–200 cents = partial; >200 cents = no marks)
- Maintain a rolling 4-second window for "current line" feedback

Show pitch as a horizontal line + a moving cursor. When user is in pitch, the line glows green. Out of pitch, red.

**Verification:**

- Pick a song the backend has analyzed.
- Open `/karaoke/{id}` → loads contour from Supabase.
- Sing in the right key → score climbs, overlay glows green.
- Sing wildly wrong → score stays flat, overlay turns red.
- Sing ahead of/behind the beat → see misalignment in the overlay.

### Phase 4 — Coverage expansion + UX polish

Quality-of-life work that makes the system robust for songs the backend hasn't analyzed yet.

- **Cold-cache UX**: when a user opens a song the backend has never seen, show a "preparing pitch data… ~30s" spinner. Trigger `/analyze` from the frontend on first visit; poll for completion.
- **Cache warming**: a background job that picks the top 100 popular tracks from a curated list and pre-analyzes them so the cold-start delay never hits a real user for big songs.
- **Sync offset slider**: a small "+/- 0.5s" slider in the karaoke UI to manually correct any residual misalignment when ISRC verification falls back to duration heuristic.
- **Section recognition**: parse LRClib output to recognize verse/chorus boundaries (often denoted by blank lines or section markers in LRC) and visually distinguish them.
- **Score history**: persist final scores to Supabase keyed by user (Spotify ID) + track. Lays groundwork for the leaderboard feature in the side nav.
- **Better lyrics fallback**: if LRClib misses, try NetEase scrape (gray area, optional) before falling back to Genius plain text.

## Edge cases / failure modes

| Scenario | Behavior |
|---|---|
| Track has no ISRC match on YouTube Topic | Backend stores a `no_match` flag. Frontend gets `null`, falls back to rhythm-only karaoke. |
| LRClib has no synced lyrics for the track | Fall back to Genius plain text — show the words, but no time-anchored highlighting. Rhythm scoring degrades to "user-tappable line markers" or just disabled. |
| User denies mic permission | Show a gentle UI: "Karaoke needs your microphone — grant permission and refresh." Playback still works in passive mode. |
| Mic detected silence the whole time | Score = 0 with a "we couldn't hear you — check your mic" suggestion. |
| Spotify token expires mid-session | Existing 401 handling kicks in: clear token, redirect home. Karaoke session ends. |
| User pauses mid-song | Pause mic capture too (don't accumulate score during pause). |
| User skips to a different song mid-karaoke | Tear down current pitch contour fetch, mic stream, lyrics; mount fresh state for the new track. |
| Browser tab loses focus | Mic capture continues by default; user expects it to. Spotify SDK pauses if the OS does. |
| Backend analysis fails (yt-dlp blocked, network error) | Frontend gracefully falls back to rhythm-only with a small notice ("pitch scoring unavailable for this track"). |
| Two browser tabs open the same karaoke session | Only one mic stream at a time; the second tab gets a "mic in use" error. Document as "play in one tab". |

## Testing plan

No automated tests in the repo today — this stays a manual smoke test.

**Phase 1:**
- Mic permission grant + deny flows.
- Lyrics sync to playback (pause/seek behavior).
- Rhythm scoring on a known song.
- Logout cleanup (mic released, audio stops, lyrics teardown).

**Phase 2:**
- Curl the backend endpoint with 5 mainstream tracks; verify all return `computed` then `cached`.
- Curl with an obscure indie track; verify graceful `no_match` response.
- Manual yt-dlp + librosa run against one track to compare against the deployed pipeline's output (sanity check no transcoding artifacts).

**Phase 3:**
- Sing in pitch → score climbs.
- Sing out of pitch → score doesn't climb.
- Mute mic → score stays flat (no false positives).
- Pitch overlay matches lyrics line position.

**Phase 4:**
- Pick a song the backend hasn't seen → cold-start UX appears, contour delivered after analysis.
- Trigger ISRC fallback by picking a song without a Topic match → rhythm-only mode kicks in.
- Sync slider visibly shifts overlay alignment.

## Out of scope (deferred / future work)

- **Refresh-token handling** — still deferred from `PLAYBACK_PLAN.md`; karaoke sessions are also limited to ~1 hour before re-auth.
- **Multiplayer / verse-a-friend** — sidebar links to it but the feature itself needs a real-time backend (likely Supabase Realtime channels). Big enough to deserve its own plan.
- **Leaderboard** — depends on score history (Phase 4) + a UI surface. Defer.
- **Mic test page** — sidebar links to it but it's a small standalone task; quick win after this plan lands.
- **Vocal-only isolation (Demucs / Spleeter)** — would let us pitch-detect on the song's actual vocal track if we had backend access to the audio. Not needed for ISRC-matched contour approach but interesting if quality demands it later.
- **iOS Safari support** — `getUserMedia` and `pitchy` work on iOS but mic latency varies; karaoke timing on iPhone may need OS-specific calibration. Test late.
- **Album / playlist karaoke modes** — sing through a whole album's worth of songs back-to-back. Deferred until single-song flow is solid.
- **CREPE-based pitch detection** — switching from `pitchy` to `crepe-js` on the client would improve accuracy on non-monophonic singing. Costs ~30 MB model download. Defer unless quality complaints justify the bandwidth.

## Open questions to resolve before execution

1. **Backend hosting**: Fly.io vs Render.com vs separate Python service. Suggest Fly.io for the free tier + Python Docker familiarity.
2. **Lyrics licensing**: LRClib's terms allow free non-commercial use; for commercial deploy, need to revisit. Personal/portfolio use is fine.
3. **YouTube ToS**: yt-dlp is gray-area. For a personal project, low risk; for a public commercial product, you'd need licensed audio sources or rely solely on Spotify's Quota Extension (also a gamble).
4. **Score persistence**: Phase 4 introduces Supabase as a database. That's the right time to install `@supabase/supabase-js` (deferred from earlier plans). Adds the auth question — anonymous Supabase keys + RLS, or Spotify-token-as-identity (custom JWT)?

These are the seams worth thinking about before each phase lands; not blocking the plan from being executable.
