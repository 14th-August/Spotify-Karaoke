// Single source of truth for the Spotify access token in localStorage.
// If we ever move off localStorage (e.g. httpOnly cookies via an edge function),
// only this file changes.

const KEY = 'spotify_token';

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token) => localStorage.setItem(KEY, token);
export const clearToken = () => localStorage.removeItem(KEY);
