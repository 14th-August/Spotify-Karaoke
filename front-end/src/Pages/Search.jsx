/**
 * Pages/Search.jsx
 * Search the Spotify catalog by free-text query. Hits the /v1/search
 * endpoint via Api/spotify.js#searchTracks (Spotify Web API docs:
 * https://developer.spotify.com/documentation/web-api/reference/search).
 *
 * Each result row shows the album cover, track name, artists, album,
 * and a play/pause button. Two playback paths:
 *   - Web Playback SDK (Premium accounts) — full-track playback in the
 *     browser. Primary path; uses PlayerContext.playUri / togglePlay.
 *     The NowPlayingBar renders elsewhere with full transport controls.
 *   - preview_url (any account) — fallback 30-second MP3 from Spotify's
 *     CDN. Used when the SDK isn't ready or the account isn't Premium.
 *
 * Failure modes mirror Profile.jsx: 401 → clearToken + bounce home;
 * other errors → render an inline Alert.
 */

import { useContext, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MusicOffIcon from '@mui/icons-material/MusicOff';

import { searchTracks } from '../Api/spotify';
import { getToken, clearToken } from '../Authorization/tokenStorage';
import { PlayerContext } from '../Player/PlayerContext';

const DEBOUNCE_MS = 300;
// Spotify rejects larger values on this dev app with a misleading
// "Invalid limit" error; 10 is well under any tier's cap.
const RESULT_LIMIT = 10;
// Don't fire the search until the (sanitized) query is at least this
// many characters — Spotify rejects very short queries on some endpoints.
const MIN_QUERY_LENGTH = 2;

// Normalize Unicode (so visually-identical glyphs encode the same way)
// and trim outer whitespace. Anything that arrives via paste/IME/keyboard
// goes through here before hitting the API.
const sanitizeQuery = (raw) => raw.normalize('NFC').trim();

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Preview-URL playback state. Distinct from SDK playback, which is
    // owned by PlayerContext / NowPlayingBar.
    const [playingPreviewId, setPlayingPreviewId] = useState(null);
    const audioRef = useRef(null);

    const { state, isReady, isPremium, playUri, togglePlay } = useContext(PlayerContext);
    const sdkCurrentTrackId = state?.track_window?.current_track?.id;
    const sdkIsPlaying = !state?.paused;
    const hasFullPlayback = isReady && isPremium;

    // Debounced search-as-you-type. Cancels in-flight fetches via the
    // setTimeout cleanup on each keystroke.
    useEffect(() => {
        const sanitized = sanitizeQuery(query);
        if (sanitized.length < MIN_QUERY_LENGTH) return;

        const token = getToken();
        if (!token) {
            window.location.assign('/');
            return;
        }

        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            setError(null);
            searchTracks(token, sanitized, RESULT_LIMIT)
                .then((data) => {
                    if (cancelled) return;
                    setResults(data.tracks?.items || []);
                })
                .catch((err) => {
                    if (cancelled) return;
                    if (err.status === 401) {
                        clearToken();
                        window.location.assign('/');
                        return;
                    }
                    setError(err.message || 'Search failed.');
                    setResults([]);
                })
                .finally(() => {
                    setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    // Stop any in-flight preview audio when navigating away. SDK playback
    // persists across the navigation (it lives in PlayerProvider).
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlayToggle = async (track) => {
        // Web Playback SDK is the primary path when available.
        if (hasFullPlayback) {
            // Stop any preview that's currently playing — only one
            // playback source at a time.
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
                setPlayingPreviewId(null);
            }

            // If this track is already loaded in the SDK, just toggle.
            if (sdkCurrentTrackId === track.id) {
                togglePlay();
                return;
            }

            // Different track (or nothing playing) — start it from the top.
            await playUri(track.uri);
            return;
        }

        // Fallback: preview-URL playback (works without Premium).
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingPreviewId === track.id) {
            setPlayingPreviewId(null);
            return;
        }

        if (!track.preview_url) return;

        const audio = new Audio(track.preview_url);
        audio.addEventListener('ended', () => {
            setPlayingPreviewId((current) => (current === track.id ? null : current));
            audioRef.current = null;
        });
        audio.play().catch(() => {
            setPlayingPreviewId(null);
            audioRef.current = null;
        });
        audioRef.current = audio;
        setPlayingPreviewId(track.id);
    };

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 880, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Search
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                {hasFullPlayback
                    ? 'Find a track and play it in full — uses the Spotify Web Playback SDK.'
                    : 'Find a track and preview the first 30 seconds.'}
            </Typography>

            <TextField
                fullWidth
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Song, artist, album…"
                // MUI v9: input adornments live under slotProps.input
                // (replaces the deprecated InputProps prop).
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                        ),
                        endAdornment: loading ? (
                            <InputAdornment position="end">
                                <CircularProgress size={18} />
                            </InputAdornment>
                        ) : null,
                    },
                }}
                sx={{ mb: 3 }}
            />

            {/* Gate every results-related UI on `query.trim()` so stale
                `results` from a previous query don't show when the user
                clears the input. */}
            {query.trim() && error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {!loading && query.trim() && results.length === 0 && !error && (
                <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 6 }}>
                    No results for "{query.trim()}".
                </Typography>
            )}

            <List sx={{ p: 0 }}>
                {query.trim() && results.map((track) => {
                    const isSdkPlayingThis =
                        hasFullPlayback && sdkCurrentTrackId === track.id && sdkIsPlaying;
                    const isPreviewingThis = playingPreviewId === track.id;
                    const isPlaying = isSdkPlayingThis || isPreviewingThis;
                    const hasPreview = Boolean(track.preview_url);
                    const canPlay = hasFullPlayback || hasPreview;
                    const cover = track.album?.images?.[0]?.url;
                    const artistNames = (track.artists || []).map((a) => a.name).join(', ');

                    let tooltip;
                    if (!canPlay) {
                        tooltip = 'No preview available for this track';
                    } else if (isPlaying) {
                        tooltip = 'Pause';
                    } else if (hasFullPlayback) {
                        tooltip = 'Play full track';
                    } else {
                        tooltip = 'Play 30s preview';
                    }

                    return (
                        <ListItem
                            key={track.id}
                            disablePadding
                            sx={{
                                borderRadius: 1,
                                mb: 0.5,
                                px: 1.5,
                                py: 1,
                                gap: 2,
                                transition: 'background 150ms ease',
                                '&:hover': { bgcolor: 'action.hover' },
                            }}
                        >
                            <Avatar
                                src={cover}
                                alt={track.album?.name}
                                variant="rounded"
                                sx={{ width: 56, height: 56, flexShrink: 0 }}
                            />
                            <Stack sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    sx={{
                                        fontWeight: 500,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {track.name}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    sx={{
                                        color: 'text.secondary',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {artistNames} · {track.album?.name}
                                </Typography>
                            </Stack>
                            <Tooltip title={tooltip} arrow>
                                {/* Wrap disabled IconButton in a span so the
                                    Tooltip still fires on hover. */}
                                <span>
                                    <IconButton
                                        onClick={() => handlePlayToggle(track)}
                                        disabled={!canPlay}
                                        sx={{
                                            color: isPlaying ? 'primary.main' : 'text.primary',
                                        }}
                                        aria-label={
                                            isPlaying ? `Pause ${track.name}` : `Play ${track.name}`
                                        }
                                    >
                                        {!canPlay ? (
                                            <MusicOffIcon />
                                        ) : isPlaying ? (
                                            <PauseIcon />
                                        ) : (
                                            <PlayArrowIcon />
                                        )}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </ListItem>
                    );
                })}
            </List>
        </Box>
    );
}
