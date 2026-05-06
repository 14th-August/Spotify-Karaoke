/**
 * tokenStorage.js
 * Tiny wrapper around the Spotify access token in localStorage. Every
 * other file calls these helpers instead of touching localStorage directly,
 * so if we ever migrate off localStorage (e.g. httpOnly cookies via an
 * edge function), this is the only file that needs to change.
 */

const KEY = 'spotify_token';

// Read the stored token. Returns null if the user isn't logged in.
export const getToken = () => localStorage.getItem(KEY);

// Save the access token after a successful Callback exchange.
export const setToken = (token) => localStorage.setItem(KEY, token);

// Wipe the token (on 401, on logout, when the user revokes access, etc.).
export const clearToken = () => localStorage.removeItem(KEY);
