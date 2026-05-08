/**
 * Player/PlayerContext.js
 * Context shared between the Web Playback SDK provider and any consumer
 * (Search, NowPlayingBar, etc.). Lives in its own file so the provider
 * (PlayerProvider.jsx) can be a component-only file and stay friendly
 * to Vite's react-refresh.
 *
 * Defaults are the "no SDK loaded yet" state — components can read from
 * the context safely even before the provider mounts.
 */

import { createContext } from 'react';

export const PlayerContext = createContext({
    deviceId: null,           // Set once the SDK reports `ready`
    state: null,              // Latest player_state_changed payload from the SDK
    isReady: false,           // True between the `ready` and `not_ready` events
    isPremium: true,          // Flips false on `account_error`
    error: null,              // Last user-visible error message, if any
    playUri: () => {},        // Start playback of a Spotify track URI
    togglePlay: () => {},     // Pause/resume the current track
    nextTrack: () => {},
    previousTrack: () => {},
    seek: () => {},           // (positionMs) — jump to a specific point in the current track
});
