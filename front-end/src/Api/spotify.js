// Single home for Spotify HTTP. Each function returns parsed JSON.
// Token-exchange returns the raw payload (callers branch on `access_token`);
// API calls throw on non-2xx so callers can `.catch` instead of inspecting status codes.

const ACCOUNTS_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const get = async (path, token) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeader(token) });
    if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status}`);
    return res.json();
};

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

export const getCurrentUser = (token) => get('/me', token);

export const getRecentlyPlayed = (token, limit = 10) =>
    get(`/me/player/recently-played?limit=${limit}`, token);

export const getSavedTracks = (token, limit = 50) =>
    get(`/me/tracks?limit=${limit}`, token);

export const getPlaylists = (token) => get('/me/playlists', token);

export const searchTracks = (token, q, limit = 10) =>
    get(`/search?q=${encodeURIComponent(q)}&type=track&limit=${limit}`, token);

export const getTrack = (token, trackId) => get(`/tracks/${trackId}`, token);
