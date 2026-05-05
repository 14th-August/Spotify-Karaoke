# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotlight is a Spotify-integrated karaoke web app. Currently implemented: Spotify OAuth login and user profile display. The frontend is the active application; the backend folder (`pythonServer(Not In Use)/`) is dormant.

## Commands

All frontend work happens inside `front-end/`:

```bash
cd front-end
npm run dev       # Start Vite dev server at http://127.0.0.1:3001
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Architecture

**Stack:** React 19 + Vite (frontend only). No TypeScript — pure JavaScript/JSX.

**Routing:** `App.jsx` does manual path-based routing by checking `window.location.pathname` and `localStorage.getItem('spotify_token')`. No React Router. Three routes:
- `/auth/callback` → `Callback.jsx` (handles OAuth code exchange)
- Any path with a token in localStorage → `Profile.jsx`
- Otherwise → `Login.jsx`

**OAuth:** Spotify PKCE flow, entirely client-side (no server needed for auth). The hook in `front-end/src/OAuth/useSpotifyAuth.js` generates the code verifier/challenge and redirects to Spotify. `Callback.jsx` handles the token exchange against `https://accounts.spotify.com/api/token` and stores the access token in `localStorage`.

**State:** No global state library. Token and code verifier persist via `localStorage`. Profile data is fetched fresh from `https://api.spotify.com/v1/me` on each Profile render.

## Environment Variables

`front-end/.env` holds:
- `VITE_SPOTIFY_CLIENT_ID` — Spotify app client ID
- `VITE_SPOTIFY_REDIRECT_URI` — Must match exactly what's registered in the Spotify developer dashboard (currently `http://127.0.0.1:3001/auth/callback`)

When changing the redirect URI, update both the `.env` file and the Spotify app settings at developer.spotify.com.

## Key Files

- [front-end/src/App.jsx](front-end/src/App.jsx) — routing logic
- [front-end/src/OAuth/useSpotifyAuth.js](front-end/src/OAuth/useSpotifyAuth.js) — PKCE OAuth hook
- [front-end/src/pages/Callback.jsx](front-end/src/pages/Callback.jsx) — token exchange
- [front-end/src/pages/Profile.jsx](front-end/src/pages/Profile.jsx) — Spotify user profile display
- [front-end/src/pages/Login.jsx](front-end/src/pages/Login.jsx) — login entry point
