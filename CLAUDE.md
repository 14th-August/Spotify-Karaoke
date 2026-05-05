# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spotlight is a Spotify-integrated karaoke web app. Currently implemented: Spotify OAuth login and user profile display. Frontend-only — the previous FastAPI backend was removed; if a server becomes necessary later (score validation, httpOnly-cookie sessions), the recommended path is a small Supabase Edge Function or Cloudflare Worker rather than a separate Python service.

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

**Source layout:** `front-end/src/` is split into four folders:
- `Components/` — reusable React components.
- `Api/` — single home for outbound HTTP. `spotify.js` wraps every Spotify endpoint; add `supabase.js` here when scores/leaderboard work begins (Supabase JS client is intentionally not yet installed).
- `Pages/` — route-level components (`Login`, `Callback`, `Profile`).
- `Authorization/` — `useSpotifyAuth.js` (PKCE login hook) and `tokenStorage.js` (the only place that touches `localStorage` for the access token; change this file if migrating off localStorage).

**Routing:** `App.jsx` does manual path-based routing by checking `window.location.pathname` and the token via `tokenStorage.getToken()`. No React Router. Three routes:
- `/auth/callback` → `Pages/Callback.jsx` (validates OAuth `state`, then exchanges the code for a token)
- Any path with a stored token → `Pages/Profile.jsx`
- Otherwise → `Pages/Login.jsx`

**OAuth:** Spotify PKCE flow, entirely client-side. `Authorization/useSpotifyAuth.js` generates the verifier + S256 challenge and a CSRF `state` nonce, then redirects to Spotify. `Pages/Callback.jsx` validates the returned state, then calls `Api/spotify.js#exchangeCodeForToken` to swap the code for an access token, which it stores via `tokenStorage.setToken`.

**State:** No global state library. Access token persists via `Authorization/tokenStorage.js`. Profile and other Spotify data are fetched fresh through `Api/spotify.js` on each render.

## Environment Variables

`front-end/.env` holds:
- `VITE_SPOTIFY_CLIENT_ID` — Spotify app client ID
- `VITE_SPOTIFY_REDIRECT_URI` — Must match exactly what's registered in the Spotify developer dashboard (currently `http://127.0.0.1:3001/auth/callback`). The Vite dev server is pinned to host `127.0.0.1` and port `3001` in `vite.config.js` precisely so the running app matches this redirect.

When changing the redirect URI, update the `.env` file, `vite.config.js`, and the Spotify app settings at developer.spotify.com.
