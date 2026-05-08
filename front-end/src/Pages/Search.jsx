/**
 * Pages/Search.jsx
 * Search the Spotify catalog by free-text query. Hits the /v1/search
 * endpoint via Api/spotify.js#searchTracks (Spotify Web API docs:
 * https://developer.spotify.com/documentation/web-api/reference/search).
 *
 * Each result row shows the album cover, track name, artists, album,
 * and a play/pause button. Playback uses each track's `preview_url` —
 * a free 30-second MP3 from Spotify's CDN that works for any user
 * (Free or Premium). For full-track playback we'd need the Web
 * Playback SDK + a Premium account; deferred for later.
 *
 * Failure modes mirror Profile.jsx: 401 → clearToken + bounce home;
 * other errors → render an inline Alert.
 */

import { useEffect, useRef, useState } from 'react';
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

const DEBOUNCE_MS = 300;
// Spotify's documented default; some newer dev apps reject other
// integers (we hit `Invalid limit` on 25). 20 is reliably accepted.
const RESULT_LIMIT = 20;

export default function Search() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Single-source-of-truth for the currently playing track. The audio
    // element itself lives in a ref so we can pause/replace without
    // triggering re-renders mid-playback.
    const [playingId, setPlayingId] = useState(null);
    const audioRef = useRef(null);

    // Debounced search-as-you-type. Cancels in-flight fetches via the
    // setTimeout cleanup on each keystroke. We deliberately do NOT call
    // setState synchronously in the effect body for the empty-query
    // case — the render below derives the empty state from `query`
    // directly, so stale `results` aren't shown.
    useEffect(() => {
        if (!query.trim()) return;

        const token = getToken();
        if (!token) {
            window.location.assign('/');
            return;
        }

        let cancelled = false;
        const timer = setTimeout(() => {
            setLoading(true);
            setError(null);
            searchTracks(token, query, RESULT_LIMIT)
                .then((data) => {
                    if (cancelled) return;
                    setResults(data.tracks?.items || []);
                })
                .catch((err) => {
                    if (cancelled) return;
                    if (err.status === 401) {
                        // Token expired or revoked — Profile.jsx pattern.
                        clearToken();
                        window.location.assign('/');
                        return;
                    }
                    setError(err.message || 'Search failed.');
                    setResults([]);
                })
                .finally(() => {
                    // Always reset loading, even if cancelled, so the
                    // spinner can't get stuck on after the user clears
                    // the input mid-flight.
                    setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    // Stop any in-flight playback when navigating away.
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlayToggle = (track) => {
        // Pause whatever is currently playing.
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // Click on the currently playing track = stop.
        if (playingId === track.id) {
            setPlayingId(null);
            return;
        }

        if (!track.preview_url) return;

        const audio = new Audio(track.preview_url);
        audio.addEventListener('ended', () => {
            setPlayingId((current) => (current === track.id ? null : current));
            audioRef.current = null;
        });
        audio.play().catch(() => {
            // Autoplay blocked or network error — bail quietly.
            setPlayingId(null);
            audioRef.current = null;
        });
        audioRef.current = audio;
        setPlayingId(track.id);
    };

    return (
        <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 880, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Search
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Find a track on Spotify and preview the first 30 seconds.
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
                    const isPlaying = playingId === track.id;
                    const hasPreview = Boolean(track.preview_url);
                    const cover = track.album?.images?.[0]?.url;
                    const artistNames = (track.artists || []).map((a) => a.name).join(', ');

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
                            <Tooltip
                                title={
                                    hasPreview
                                        ? isPlaying
                                            ? 'Pause preview'
                                            : 'Play 30s preview'
                                        : 'No preview available for this track'
                                }
                                arrow
                            >
                                {/* Wrap disabled IconButton in a span so the
                                    Tooltip still fires on hover. */}
                                <span>
                                    <IconButton
                                        onClick={() => handlePlayToggle(track)}
                                        disabled={!hasPreview}
                                        sx={{
                                            color: isPlaying ? 'primary.main' : 'text.primary',
                                        }}
                                        aria-label={
                                            isPlaying ? `Pause ${track.name}` : `Play ${track.name}`
                                        }
                                    >
                                        {!hasPreview ? (
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
