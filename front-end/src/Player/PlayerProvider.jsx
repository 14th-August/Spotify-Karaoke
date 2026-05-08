/**
 * Player/PlayerProvider.jsx
 * Owns the Spotify Web Playback SDK lifecycle for the logged-in app.
 * Initializes a Player on mount, registers it as a Spotify "device",
 * auto-transfers playback to it, and exposes control methods + state
 * via PlayerContext.
 *
 * SDK load ordering:
 *   - index.html includes the SDK script with `async`.
 *   - Once the script loads, it calls `window.onSpotifyWebPlaybackSDKReady`.
 *   - We register that handler here. If the script loaded BEFORE this
 *     component mounted, `window.Spotify.Player` is already defined and
 *     we can initialize directly.
 *
 * Premium-only: on `account_error` (Spotify's signal for non-Premium),
 * we flip `isPremium` false so consumers (Search) can fall back to
 * preview-URL playback.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerContext } from './PlayerContext';
import { getToken } from '../Authorization/tokenStorage';
import { playTrack, transferPlayback } from '../Api/spotify';

const PLAYER_NAME = 'Spotlight Karaoke';
const DEFAULT_VOLUME = 0.5;

export default function PlayerProvider({ children }) {
    const [deviceId, setDeviceId] = useState(null);
    const [state, setState] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [isPremium, setIsPremium] = useState(true);
    const [error, setError] = useState(null);
    const playerRef = useRef(null);

    useEffect(() => {
        const init = () => {
            // Bail if SDK isn't actually loaded yet (e.g. fired ourselves
            // because a previous tab cached `window.Spotify`) or if the
            // user isn't logged in.
            if (!window.Spotify?.Player) return;
            if (!getToken()) return;

            const player = new window.Spotify.Player({
                name: PLAYER_NAME,
                // Re-read the token on each request so future refresh-token
                // logic plugs in without changing this code.
                getOAuthToken: (cb) => cb(getToken()),
                volume: DEFAULT_VOLUME,
            });

            player.addListener('ready', async ({ device_id }) => {
                console.log('[player] ready', device_id);
                setDeviceId(device_id);
                setIsReady(true);
                // Force audio to route to this tab. Without this, calls to
                // /me/player/play go to whichever device Spotify thinks is
                // active (often the user's phone).
                try {
                    await transferPlayback(getToken(), device_id);
                } catch (err) {
                    console.error('[player] transferPlayback failed', err);
                }
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('[player] not ready', device_id);
                setIsReady(false);
            });

            player.addListener('player_state_changed', (next) => {
                setState(next);
            });

            player.addListener('initialization_error', ({ message }) => {
                console.error('[player] initialization_error', message);
                setError(message);
            });

            player.addListener('authentication_error', ({ message }) => {
                console.error('[player] authentication_error', message);
                setError(`Auth: ${message}`);
            });

            player.addListener('account_error', ({ message }) => {
                console.error('[player] account_error', message);
                setIsPremium(false);
                setError('Full-track playback requires Spotify Premium.');
            });

            player.addListener('playback_error', ({ message }) => {
                console.error('[player] playback_error', message);
                setError(message);
            });

            player.connect();
            playerRef.current = player;
        };

        if (window.Spotify?.Player) {
            // Script already loaded — initialize directly.
            init();
        } else {
            // Script will call this once it's done loading.
            window.onSpotifyWebPlaybackSDKReady = init;
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.disconnect();
                playerRef.current = null;
            }
        };
    }, []);

    const playUri = useCallback(
        async (uri) => {
            const token = getToken();
            if (!token || !deviceId) return;
            try {
                await playTrack(token, deviceId, uri);
            } catch (err) {
                console.error('[player] playTrack failed', err);
                setError(err.message || 'Playback failed.');
            }
        },
        [deviceId],
    );

    // The SDK's own methods send the right API calls under the hood, so
    // we don't need to thread our /me/player/* helpers through here for
    // pause / next / previous / seek.
    const togglePlay = useCallback(() => playerRef.current?.togglePlay(), []);
    const nextTrack = useCallback(() => playerRef.current?.nextTrack(), []);
    const previousTrack = useCallback(() => playerRef.current?.previousTrack(), []);
    const seek = useCallback((ms) => playerRef.current?.seek(ms), []);

    const value = useMemo(
        () => ({
            deviceId,
            state,
            isReady,
            isPremium,
            error,
            playUri,
            togglePlay,
            nextTrack,
            previousTrack,
            seek,
        }),
        [deviceId, state, isReady, isPremium, error, playUri, togglePlay, nextTrack, previousTrack, seek],
    );

    return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
