/**
 * Api/spotify.js
 * Single home for every outbound Spotify HTTP call. Each exported function
 * returns parsed JSON from one Spotify endpoint.
 *
 * Two error contracts:
 *   - exchangeCodeForToken returns the raw token payload — callers branch
 *     on `data.access_token` (Spotify can return an error object even with
 *     a 200 status when something's misconfigured).
 *   - Read calls (getCurrentUser, getTrack, etc.) throw on non-2xx, and
 *     the thrown Error carries a `.status` property. Callers can then
 *     branch by HTTP code (e.g. Profile.jsx redirects to login on 401
 *     instead of retrying).
 *
 * Function shapes mirror the deleted Python server's routes so future
 * features have a known landing spot here.
 */

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';

// Bearer-token header used by every authenticated call.
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// Generic request helper. Throws an Error with `.status` on non-2xx so
// callers can branch by HTTP code (e.g. 401 = expired token) without
// parsing strings. Spotify's error responses include
// `{ error: { status, message } }`, so we surface that `message` in
// both the thrown Error and a console.error for DevTools debuggability.
// Player endpoints often return 204 No Content; handled gracefully.
const request = async (path, { method = 'GET', token, body = null } = {}) => {
    const url = `${API_BASE}${path}`;
    const headers = { ...authHeader(token) };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) {
        let detail = '';
        try {
            const errBody = await res.json();
            if (errBody?.error?.message) detail = `: ${errBody.error.message}`;
        } catch {
            // Body wasn't JSON — fall back to bare status code.
        }
        const err = new Error(`Spotify ${path} failed (${res.status})${detail}`);
        err.status = res.status;
        console.error('[spotify]', { url, status: res.status, message: err.message });
        throw err;
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
};

const get = (path, token) => request(path, { method: 'GET', token });
const put = (path, token, body) => request(path, { method: 'PUT', token, body });
const post = (path, token, body) => request(path, { method: 'POST', token, body });

// Trade an authorization code + PKCE verifier for an access token.
// Called once from Callback.jsx after the user approves on Spotify.
// Returns the raw token payload — caller checks for `.access_token`.
export const exchangeCodeForToken = async (code, verifier) => {
    const res = await fetch(`${ACCOUNTS_BASE}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
            grant_type: 'authorization_code',
            code,
            redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
            code_verifier: verifier,
        }),
    });
    return res.json();
};

// GET /me — the logged-in user's profile (id, display_name, email, images).
export const getCurrentUser = (token) => get('/me', token);

// GET /me/player/recently-played — last N tracks the user listened to.
export const getRecentlyPlayed = (token, limit = 10) =>
    get(`/me/player/recently-played?limit=${limit}`, token);

// GET /me/tracks — the user's Liked Songs library (paginated; default 50/page).
export const getSavedTracks = (token, limit = 50) =>
    get(`/me/tracks?limit=${limit}`, token);

// GET /me/playlists — playlists the user owns or follows.
export const getPlaylists = (token) => get('/me/playlists', token);

// GET /search — track search by free-text query, sorted by Spotify relevance.
// Uses URLSearchParams so each param is encoded per
// application/x-www-form-urlencoded rules (more forgiving than manual
// string concatenation when the query has special chars).
export const searchTracks = (token, q, limit = 10) => {
    const params = new URLSearchParams({
        q,
        type: 'track',
        limit: String(limit),
    });
    return get(`/search?${params.toString()}`, token);
};

// GET /tracks/{id} — full metadata for a single track.
export const getTrack = (token, trackId) => get(`/tracks/${trackId}`, token);

// --- Player control ---
// All require the `streaming` + `user-modify-playback-state` scopes and
// a Spotify Premium account. Most return 204 No Content on success.

// PUT /me/player — transfer playback to a specific device. Used once on
// SDK `ready` to claim audio for this browser tab.
export const transferPlayback = (token, deviceId, play = false) =>
    put('/me/player', token, { device_ids: [deviceId], play });

// PUT /me/player/play — start playback of a Spotify URI on a device.
// `trackUri` is a `spotify:track:<id>` URI; for albums/playlists use
// `context_uri` instead (not exposed here yet).
export const playTrack = (token, deviceId, trackUri, positionMs = 0) =>
    put(`/me/player/play?device_id=${deviceId}`, token, {
        uris: [trackUri],
        position_ms: positionMs,
    });

// PUT /me/player/pause — pause whatever's playing on the device.
export const pausePlayback = (token, deviceId) =>
    put(`/me/player/pause?device_id=${deviceId}`, token);

// POST /me/player/next — skip to the next track in the current context.
export const skipNext = (token, deviceId) =>
    post(`/me/player/next?device_id=${deviceId}`, token);

// POST /me/player/previous — skip to the previous track.
export const skipPrevious = (token, deviceId) =>
    post(`/me/player/previous?device_id=${deviceId}`, token);

// GET /me/player — current playback state across all devices. Optional;
// the Web Playback SDK exposes its own state via player_state_changed.
export const getPlaybackState = (token) => get('/me/player', token);
