# Full-track playback — implementation plan

## Context

Today we play 30-second `preview_url` clips via a plain HTML `<audio>` element. To play **full tracks** in the browser, Spotify's only supported path is the **Web Playback SDK** — there's no REST endpoint that returns a streamable MP3 for a full song. This document describes the plumbing, UI changes, and rollout to add full-track playback to the karaoke app.

## Prerequisites

| Requirement | Status / Action |
|---|---|
| Spotify **Premium** account on the linked user | ✅ Confirmed |
| OAuth scopes: `streaming`, `user-read-playback-state`, `user-modify-playback-state` | Add to `useSpotifyAuth.js` (one-line change) |
| Web Playback SDK script | Load via `<script src="https://sdk.scdn.co/spotify-player.js">` in `front-end/index.html` |
| User must **re-login** after the scope change | Document in commit message; logout + login flow already wired |

## API endpoints used

All from the [Spotify Web API Player reference](https://developer.spotify.com/documentation/web-api/reference/get-information-about-the-users-current-playback). Body shapes match Spotify docs verbatim.

| Method | Path | Purpose |
|---|---|---|
| `PUT` | `/me/player` | Transfer playback to a specific device. Body: `{ device_ids: [deviceId], play: false }` |
| `PUT` | `/me/player/play?device_id=…` | Start playback. Body: `{ uris: ['spotify:track:…'], position_ms: 0 }` |
| `PUT` | `/me/player/pause?device_id=…` | Pause playback |
| `PUT` | `/me/player/next?device_id=…` | Skip to next track |
| `PUT` | `/me/player/previous?device_id=…` | Skip to previous track |
| `GET` | `/me/player` | (optional) Read current playback state — only needed if we don't trust the SDK's `player_state_changed` event |

## File-by-file changes

### New files

- **`front-end/src/Player/PlayerContext.js`** — exports `PlayerContext` (createContext) so any descendant can read player state + dispatch playback actions without prop-drilling. Mirrors the `themeMode.js` pattern.
- **`front-end/src/Player/PlayerProvider.jsx`** — owns the SDK lifecycle. Inside, a `useEffect` that:
  1. Defines `window.onSpotifyWebPlaybackSDKReady`.
  2. Constructs `new window.Spotify.Player({ name: 'Spotlight Karaoke', getOAuthToken: cb => cb(getToken()), volume: 0.5 })`.
  3. Adds listeners: `ready`, `not_ready`, `player_state_changed`, `initialization_error`, `authentication_error`, `account_error`, `playback_error`.
  4. On `ready` — stores `device_id`, calls `transferPlayback(token, device_id)` so audio routes to this tab.
  5. On `account_error` — sets a flag indicating the linked account isn't Premium; UI falls back to preview-only.
  6. Cleanup: `player.disconnect()` on unmount.
  - Exposes via context: `{ deviceId, state, isReady, isPremium, error, playUri(uri), togglePlay(), nextTrack(), previousTrack(), seek(ms) }`.
- **`front-end/src/Components/NowPlayingBar.jsx`** — sticky bottom bar inside the logged-in layout. Layout left → right:
  - Album cover (56px square, rounded).
  - Track name + artist (truncated, two-line stack).
  - Center: prev / play-pause / next icon buttons.
  - Right: progress text (`MM:SS / MM:SS`) and a thin progress bar.
  - Hidden entirely when `state` is null (nothing has been played yet); slides up when first track plays.

### Modified files

- **`front-end/index.html`** — add `<script src="https://sdk.scdn.co/spotify-player.js" async></script>` in `<head>`. The script defines `window.Spotify.Player` and calls `window.onSpotifyWebPlaybackSDKReady` once loaded.
- **`front-end/src/Authorization/useSpotifyAuth.js`** — append three scopes to the `scope` param: `streaming user-read-playback-state user-modify-playback-state` (in addition to the existing `user-read-private user-read-email`).
- **`front-end/src/Api/spotify.js`** — add a `put()` helper (mirroring `get()` but for `PUT` bodies and 204 responses), then export:
  ```js
  export const transferPlayback = (token, deviceId, play = false) =>
      put('/me/player', token, { device_ids: [deviceId], play });

  export const playTrack = (token, deviceId, trackUri, positionMs = 0) =>
      put(`/me/player/play?device_id=${deviceId}`, token, { uris: [trackUri], position_ms: positionMs });

  export const pausePlayback = (token, deviceId) =>
      put(`/me/player/pause?device_id=${deviceId}`, token);

  export const skipNext = (token, deviceId) =>
      put(`/me/player/next?device_id=${deviceId}`, token);

  export const skipPrevious = (token, deviceId) =>
      put(`/me/player/previous?device_id=${deviceId}`, token);
  ```
- **`front-end/src/AppShell.jsx`** — wrap the logged-in tree in `<PlayerProvider>`. Anonymous routes (Login / Callback) skip it — there's no token to feed the SDK with anyway.
- **`front-end/src/Pages/Search.jsx`** — read `playUri` and `isReady` / `isPremium` from `PlayerContext`. Per-row button:
  - If `isReady && isPremium` → play full track via `playUri('spotify:track:<id>')`. Currently-playing row shows pause icon; clicking again calls `togglePlay()`.
  - Else if `track.preview_url` → fall back to today's `<audio>` 30s preview.
  - Else → disabled `MusicOff` button (as today).
- **`front-end/src/Components/SideNav.jsx`** — add bottom padding to the children content area so the `NowPlayingBar` doesn't cover the last row of any page (`pb: { xs: '88px', md: '88px' }` when bar is visible).

## Phased rollout

Three commits, each independently reviewable:

### Commit 1 — Plumbing (no visible change)
- Scope update in `useSpotifyAuth.js`.
- SDK `<script>` in `index.html`.
- New `Player/PlayerContext.js`, `Player/PlayerProvider.jsx`.
- New playback API functions in `Api/spotify.js` (with the new `put()` helper).
- `AppShell.jsx` wraps logged-in tree in `<PlayerProvider>`.
- Behavior unchanged — Search still uses preview-only. The SDK initializes silently in the background and the player becomes "ready" but nothing visibly happens until commit 2.
- **User must log out + log back in** for the new scopes to take effect. Note this in the commit body.

### Commit 2 — Now Playing bar
- New `Components/NowPlayingBar.jsx`.
- Mounted inside `SideNav` (or directly inside the logged-in branch in `App.jsx`) so it persists across page navigations.
- Reads from `PlayerContext`. Buttons call `togglePlay()`, `nextTrack()`, `previousTrack()`.
- Hidden until something starts playing.
- Bottom padding adjustment in `SideNav` content area.

### Commit 3 — Search integration
- `Search.jsx` calls `playUri` from context as the primary play action.
- Preview-URL playback kept as a fallback for tracks where `playUri` fails or for non-Premium accounts (defensive — even though we've confirmed Premium, this protects against weird states).
- Disabled-button state covers tracks with no `preview_url` AND no SDK readiness.

## Edge cases / error handling

| Scenario | Behavior |
|---|---|
| User isn't Premium (`account_error`) | Set `isPremium: false` in context; Search button falls back to preview-URL automatically. Show a one-time `Alert` near the search bar explaining "Full-track playback requires Spotify Premium". |
| Access token expired during SDK use (`authentication_error`) | Same as the existing 401 pattern — `clearToken()` + `window.location.assign('/')`. SDK's `getOAuthToken` callback already gets a fresh read from `getToken()` each time, so token rotation works if we ever add refresh tokens. |
| `playback_error` while a track is playing | Show a toast Snackbar; the bar stays visible so user can manually retry. |
| User closes the tab | Cleanup unmount → `player.disconnect()` → device goes `not_ready` on Spotify's side. Audio stops. |
| User has another active Spotify device | The `transferPlayback` call on `ready` forces audio to this tab. If they want to push it back to their phone, they can do so from Spotify's own UI. |
| Multiple Spotlight tabs open | Each tab registers its own SDK device. Last one to call `transferPlayback` wins. Acceptable for now; document as "open one tab at a time". |

## Testing plan

End-to-end smoke (no automated tests in the repo):

1. Pull the new commit, restart dev server.
2. **Log out** of the existing Spotify session in the app.
3. Log in again — Spotify should re-prompt with the expanded scope list (streaming, playback control). Approve.
4. After landing on Profile, open DevTools → Console: confirm a `[player]` log entry shows the SDK ready and a device_id assigned.
5. Navigate to `/search`, type "daft punk one more time", wait for results.
6. Click the play button on the first row → full track audio should start playing in the browser.
7. Now Playing bar slides up at the bottom with track + controls. Verify play/pause/next/previous all respond.
8. Navigate back to Profile → Now Playing bar persists, audio keeps playing.
9. Click logout → token cleared, audio stops, bar hides.
10. Log in to a Free account (if available) → confirm `account_error` triggers the preview-only fallback gracefully.

## Out of scope (deferred)

- **Track queue / playlist playback** — just one track at a time. Adding `context_uri` to play full albums or playlists is a follow-up.
- **Lyrics overlay** — needed for the actual karaoke feature but separate from playback plumbing.
- **Karaoke scoring** — the original app pitch, separate from playback.
- **Volume slider** — SDK supports `setVolume(0..1)`; the bar can grow this later.
- **Shuffle / repeat** — SDK supports it via `setShuffle` / `setRepeatMode`; defer.
- **Lyrics-synced karaoke timing** — biggest deferred chunk; needs lyrics data + timing alignment, neither of which Spotify exposes.
- **Refresh token handling** — we still don't refresh tokens; full-track playback breaks after ~1 hour exactly the same way `/me` already does.

## Open questions before execution

None blocking — Premium confirmed, plan is concrete. If the existing logout + re-login flow surprises (e.g. Spotify cached the consent and skipped the new-scope prompt), the dev workaround is to revoke the app at `https://www.spotify.com/account/apps/` and log back in.
