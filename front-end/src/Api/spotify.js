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

// Internal GET helper. Throws an Error with `.status` on non-2xx so callers
// can branch by HTTP code (e.g. 401 = expired token) without parsing strings.
const get = async (path, token) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeader(token) });
    if (!res.ok) {
        // Attach status so callers can branch on 401 (token expired) vs other failures
        const err = new Error(`Spotify ${path} failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return res.json();
};

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
export const searchTracks = (token, q, limit = 10) =>
    get(`/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`, token);

// GET /tracks/{id} — full metadata for a single track.
export const getTrack = (token, trackId) => get(`/tracks/${trackId}`, token);
