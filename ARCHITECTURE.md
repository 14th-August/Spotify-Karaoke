# Architecture

A walkthrough of the codebase: the user flow, folder responsibilities, and what each file does. Pair with [CLAUDE.md](CLAUDE.md), which has the build commands and high-level stack notes.

## The full user flow

1. **You open the app.** `App.jsx` checks the URL and `tokenStorage.getToken()`. No URL match for `/auth/callback`, no token → renders `<Login />`.
2. **You click "Login with Spotify".** `Login.jsx` calls `useSpotifyAuth().login()`, which:
   - Generates a 64-char random **verifier** and a 32-char **state** nonce.
   - Stashes both in localStorage.
   - SHA-256-hashes the verifier into a **challenge**.
   - Redirects the browser to `accounts.spotify.com/authorize?...` carrying the challenge + state.
3. **Spotify shows you the consent screen.** You approve. Spotify redirects to `http://127.0.0.1:3001/auth/callback?code=...&state=...`.
4. **App.jsx re-renders** — URL matches `/auth/callback` → renders `<Callback />`.
5. **Callback.jsx runs once** (a useRef lock prevents StrictMode's double-firing from double-spending the auth code):
   - If Spotify reported `error` → bail, clear one-shot values.
   - If returned `state` ≠ stored `state` → bail (CSRF guard).
   - Otherwise call `Api/spotify.js#exchangeCodeForToken(code, verifier)`, which POSTs to `accounts.spotify.com/api/token`.
   - On success, `tokenStorage.setToken(...)`, wipe the verifier + state, redirect to `/`.
6. **App.jsx re-renders again.** Token present → renders `<Profile />`.
7. **Profile.jsx** calls `Api/spotify.js#getCurrentUser(token)` → renders the MUI Card. If the call 401s (token expired), it auto-clears the token and bounces home.

## Folder map

```
front-end/src/
├── App.jsx          ← top-level "router"
├── main.jsx         ← React mount point + MUI ThemeProvider
├── theme.js         ← Spotify-flavored MUI palette
├── Components/      ← reusable UI (currently just a stub Header)
├── Api/             ← every outbound HTTP call
├── Authorization/   ← OAuth helpers + token storage
└── Pages/           ← route-level components
```

The folder names are the contract: anything talking to a remote service goes in `Api/`, anything related to identity/sessions goes in `Authorization/`, and full-screen views go in `Pages/`. New shared widgets land in `Components/`.

## File-by-file

### `theme.js`
Defines the MUI dark theme — primary `#1DB954` (Spotify green), `#121212` page bg, `#181818` cards, Inter typography, 8px radius. Exports a single `theme` object consumed by `<ThemeProvider>` in `main.jsx`. Components reference these via the `sx` prop (`color: 'primary.main'`) or the `useTheme()` hook.

### `main.jsx`
Mounts `<App />` into `#root` and wraps it in `<ThemeProvider theme={theme}>` + `<CssBaseline />`. The theme provider exposes the palette to every descendant; CssBaseline normalizes browser defaults so cross-browser quirks don't leak through.

### `App.jsx`
Top-level "router" without React Router. It's a single function that picks one of three pages based on the current URL and stored token state. The `/auth/callback` check has to come first because Spotify always redirects there, and that page is responsible for actually setting the token.

### `Authorization/useSpotifyAuth.js`
The PKCE login flow as a React hook. Three private helpers:
- `sha256(plain)` — wraps `crypto.subtle.digest('SHA-256', ...)`.
- `base64encode(bytes)` — URL-safe base64 (no `=` padding, `+/` → `-_`).
- `generateRandomString(length)` — cryptographically random alphanumeric.

Plus the public `login()` function that ties them together: generates the verifier + state nonce, stores both, hashes into the challenge, builds the authorize URL, and redirects.

### `Authorization/tokenStorage.js`
Three one-line wrappers around `localStorage` for the access token: `getToken()`, `setToken(t)`, `clearToken()`. The whole point is **isolation** — only this file mentions `localStorage.spotify_token`, so a future move to httpOnly cookies (via an edge function) is a one-file change.

### `Api/spotify.js`
The single home for outbound Spotify HTTP. Exports:

| Function | Endpoint | Purpose |
|---|---|---|
| `exchangeCodeForToken(code, verifier)` | `POST accounts.spotify.com/api/token` | Trade auth code for access token (one-shot, called by Callback) |
| `getCurrentUser(token)` | `GET /me` | Logged-in user's profile |
| `getRecentlyPlayed(token, limit=10)` | `GET /me/player/recently-played` | Listening history |
| `getSavedTracks(token, limit=50)` | `GET /me/tracks` | "Liked Songs" |
| `getPlaylists(token)` | `GET /me/playlists` | User's playlists |
| `searchTracks(token, q, limit=10)` | `GET /search?type=track` | Track search |
| `getTrack(token, trackId)` | `GET /tracks/{id}` | Single track metadata |

**Two error contracts:**
- `exchangeCodeForToken` returns the raw payload — you check `data.access_token` (Spotify can return error info inside a 200).
- All `get(...)` calls throw on non-2xx, and the thrown `Error` carries `.status`. That's why `Profile.jsx` can branch on `err.status === 401`.

`getCurrentUser` is the only one currently used; the rest are stubs ready for feature work (they mirror the deleted Python routes 1:1).

### `Pages/Login.jsx`
Anonymous landing. Container + Stack + Typography + a contained Button with `LibraryMusicIcon`. The button's only job is to call `useSpotifyAuth().login()`.

### `Pages/Callback.jsx`
The post-redirect handler. Uses a `useRef`-based lock (`fetchedRef`) so React's StrictMode double-effect can't double-spend the auth code. Inside the effect:
1. Read `code`, `state`, `error` from the URL; read `verifier` and `expectedState` from localStorage.
2. Define a `cleanup()` that wipes both one-shot values.
3. Three early-bail branches: Spotify error → CSRF mismatch → missing inputs.
4. Otherwise call `exchangeCodeForToken`, store the token, redirect home.

While that's happening, the user sees a centered MUI `CircularProgress` + "Checking your credentials...".

### `Pages/Profile.jsx`
Logged-in landing. Two state slots: `user` (the `/me` payload) and `error` (a string). On mount, fetches the user. Three render paths:
- **Error string** → MUI `Alert` (a real error, surfaced rather than swallowed).
- **No user yet** → centered `CircularProgress` + "Loading your Spotify profile...".
- **User loaded** → `<Card>` with `Avatar` (Spotify profile pic, Spotify-green border), display name, email.

The 401 handler is the important part: when the token expires we don't sit on a spinner — we `clearToken()` and `window.location.href = '/'`, which kicks back to Login. This is the "no refresh-token logic, but at least the failure mode is honest" choice.

### `Components/Header.jsx`
Stub. Not currently mounted. Reserved for the top-of-app nav bar once there's more than one page.

## What's deliberately NOT here

- **React Router.** Three routes don't justify the dependency yet.
- **Refresh-token handling.** Tokens expire after ~1 hour; the 401 handler bounces to Login instead.
- **httpOnly-cookie sessions.** localStorage tokens have XSS exposure; deferred until a real backend exists.
- **Supabase JS client.** No callers yet — install when scores/leaderboard work begins.
- **Server-side score validation.** When the leaderboard becomes real, do this in a Supabase Edge Function or Cloudflare Worker, *not* a revived Python server.
