/**
 * Pages/Karaoke.jsx
 * The active karaoke view — mounted at /karaoke/:trackId.
 *
 * Three phases drive what's on screen:
 *   'intro'     → KaraokeIntro: album art splash + readiness badges + Start
 *   'countdown' → KaraokeCountdown: 3 → 2 → 1 → SING! pulse
 *   'playing'   → lyrics panel + mic meter + scoring display
 *
 * On load it:
 *   1. Fetches track metadata from Spotify (/tracks/{id}) for the title,
 *      artist, album cover, and duration.
 *   2. Fetches synced lyrics from LRClib (Api/lyrics.js).
 *   3. Requests mic permission (Audio/useMicrophone.js).
 *   4. Waits in 'intro' for the user to press Start.
 *   5. After the countdown lands on 'playing', calls playUri to start
 *      Spotify playback.
 *
 * During playback it:
 *   - Keeps a rolling VAD (voice-activity-detection) history at 10 Hz.
 *   - Evaluates each lyric line's singing window once playback passes it,
 *     marking the line correct if the mic was active during that window.
 *   - Feeds positionMs to LyricsPanel so lines highlight in sync.
 *
 * Scoring algorithm (rhythm-only, Phase 1):
 *   For each line i with timestamp T:
 *     window = [T - 500 ms, T + lineDuration + 500 ms]
 *     correct = VAD was active at any point during the window
 *   score = (correct lines / total lines evaluated) × 100
 *
 * Layout (playing phase):
 *   ┌─ header ─────────────────────────────────────────┐
 *   │  ← Back   Cover + Track name / Artist            │
 *   ├─────────────────────────────────┬────────────────┤
 *   │                                 │  MicMeter      │
 *   │         LyricsPanel             │  ScoringDisplay│
 *   │                                 │                │
 *   └─────────────────────────────────┴────────────────┘
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { getTrack } from '../Api/spotify';
import { getSyncedLyrics } from '../Api/lyrics';
import { getToken, clearToken } from '../Authorization/tokenStorage';
import { PlayerContext } from '../Player/PlayerContext';
import useMicrophone from '../Audio/useMicrophone';
import useVAD from '../Audio/useVAD';
import LyricsPanel from '../Components/LyricsPanel';
import MicMeter from '../Components/MicMeter';
import ScoringDisplay from '../Components/ScoringDisplay';
import KaraokeIntro from '../Components/KaraokeIntro';
import KaraokeCountdown from '../Components/KaraokeCountdown';

// How long after a line's timestamp we keep looking for the next line.
// If no next line exists, we give the last line this many ms of window.
const LAST_LINE_WINDOW_MS = 5000;
// Extra padding on each side of the singing window. Singer starts a beat
// early or finishes a beat late — we want to count those as on-time.
const WINDOW_PAD_MS = 500;
// Countdown timing: each digit (3, 2, 1) is visible this long, then the
// final "SING!" beat gets a shorter hold before audio kicks in.
const COUNTDOWN_TICK_MS = 1000;
const COUNTDOWN_GO_MS = 500;

export default function Karaoke({ trackId }) {
    const { state, isReady, isPremium, playUri } = useContext(PlayerContext);

    const [track, setTrack] = useState(null);
    const [trackError, setTrackError] = useState(null);
    // null = loading; object = loaded (may have lines: null if no sync found)
    const [lyrics, setLyrics] = useState(null);

    // Phase machine: 'intro' (splash + Start), 'countdown' (3-2-1-SING),
    // 'playing' (main karaoke layout + audio).
    const [phase, setPhase] = useState('intro');
    // null while not counting down; otherwise 3 → 2 → 1 → 0 ("SING!").
    const [countdown, setCountdown] = useState(null);

    const [lineResults, setLineResults] = useState([]);
    const [score, setScore] = useState(0);

    const { stream, error: micError } = useMicrophone();
    const { rms, isVoiceActive } = useVAD(stream);

    // Keep isVoiceActive in a ref so the scoring interval reads the latest
    // value without re-creating the interval on every VAD tick.
    const isVoiceActiveRef = useRef(false);
    useEffect(() => { isVoiceActiveRef.current = isVoiceActive; }, [isVoiceActive]);

    // Rolling history of { positionMs, active } samples, trimmed to last 10 s.
    const vadHistoryRef = useRef([]);
    // Set of line indices already evaluated so we don't double-score them.
    const evaluatedRef = useRef(new Set());
    // Accumulates scored line results without causing a render on every push.
    const lineResultsRef = useRef([]);
    // Guard so we only call playUri once per mount.
    const playStartedRef = useRef(false);

    // ── Playback position ──────────────────────────────────────────────────
    // Mirror NowPlayingBar's interpolation: extrapolate from the last SDK
    // state event so position feels live between events.
    const isPaused = state?.paused ?? true;
    const reportedPosition = state?.position ?? 0;
    const reportedAt = state?.timestamp ?? 0;
    const duration = state?.duration ?? 0;

    const getPositionMs = useCallback(() => {
        if (isPaused) return reportedPosition;
        return Math.min(reportedPosition + Math.max(0, Date.now() - reportedAt), duration || Infinity);
    }, [isPaused, reportedPosition, reportedAt, duration]);

    // positionMs drives LyricsPanel re-renders; updated by the scoring interval.
    const [positionMs, setPositionMs] = useState(0);

    // ── Fetch track metadata ───────────────────────────────────────────────
    useEffect(() => {
        const token = getToken();
        if (!token) { window.location.assign('/'); return; }
        getTrack(token, trackId)
            .then(setTrack)
            .catch((err) => {
                if (err.status === 401) { clearToken(); window.location.assign('/'); return; }
                setTrackError(err.message || 'Failed to load track.');
            });
    }, [trackId]);

    // ── Fetch lyrics once we have the track ───────────────────────────────
    useEffect(() => {
        if (!track) return;
        const artist = track.artists?.[0]?.name || '';
        getSyncedLyrics({
            artist,
            track: track.name,
            album: track.album?.name || '',
            duration: track.duration_ms,
        })
            .then((result) => setLyrics(result ?? { lines: null, plainText: null }))
            .catch(() => setLyrics({ lines: null, plainText: null }));
    }, [track]);

    // ── Start playback once we hit the playing phase ──────────────────────
    // Gated on phase so the song doesn't blast out during the intro/countdown.
    useEffect(() => {
        if (phase !== 'playing') return;
        if (!isReady || !isPremium || playStartedRef.current) return;
        // If the SDK is already playing this track (user clicked the karaoke
        // button from a track that was already queued), don't restart.
        const currentId = state?.track_window?.current_track?.id;
        playStartedRef.current = true;
        if (currentId !== trackId) {
            playUri(`spotify:track:${trackId}`);
        }
    }, [phase, isReady, isPremium, trackId, state, playUri]);

    // ── Countdown ticker ──────────────────────────────────────────────────
    // 3 → 2 → 1 each visible for 1 s, then "SING!" (countdown=0) for 500 ms
    // before flipping to the playing phase.
    useEffect(() => {
        if (phase !== 'countdown' || countdown === null) return;

        if (countdown <= 0) {
            const id = setTimeout(() => setPhase('playing'), COUNTDOWN_GO_MS);
            return () => clearTimeout(id);
        }

        const id = setTimeout(() => setCountdown((c) => c - 1), COUNTDOWN_TICK_MS);
        return () => clearTimeout(id);
    }, [phase, countdown]);

    // Trigger handler for the intro's Start button. Kicks off the countdown.
    const handleStart = useCallback(() => {
        setCountdown(3);
        setPhase('countdown');
    }, []);

    // ── VAD recording + scoring interval ──────────────────────────────────
    // Runs at 10 Hz while playing and lyrics are loaded. Each tick:
    //   • records a VAD sample keyed to the current position
    //   • evaluates any lines whose singing window has fully elapsed
    useEffect(() => {
        const lines = lyrics?.lines;
        if (!lines || isPaused) return;

        const id = setInterval(() => {
            const pos = getPositionMs();

            // Record sample.
            vadHistoryRef.current.push({ positionMs: pos, active: isVoiceActiveRef.current });
            // Trim entries older than 10 seconds — they'll never be needed again.
            const cutoff = pos - 10_000;
            vadHistoryRef.current = vadHistoryRef.current.filter((s) => s.positionMs >= cutoff);

            // Evaluate lines whose window has closed.
            let changed = false;
            for (let i = 0; i < lines.length; i++) {
                if (evaluatedRef.current.has(i)) continue;

                const lineDuration =
                    i + 1 < lines.length
                        ? lines[i + 1].time_ms - lines[i].time_ms
                        : LAST_LINE_WINDOW_MS;

                const windowEnd = lines[i].time_ms + lineDuration + WINDOW_PAD_MS;
                if (pos < windowEnd) continue; // window not closed yet

                const windowStart = lines[i].time_ms - WINDOW_PAD_MS;
                const wasActive = vadHistoryRef.current.some(
                    (s) => s.active && s.positionMs >= windowStart && s.positionMs <= windowEnd,
                );

                evaluatedRef.current.add(i);
                lineResultsRef.current.push({ correct: wasActive, text: lines[i].text });
                changed = true;
            }

            if (changed) {
                const results = lineResultsRef.current;
                const correct = results.filter((r) => r.correct).length;
                setLineResults([...results]);
                setScore(results.length > 0 ? Math.round((correct / results.length) * 100) : 0);
            }

            // Drive the lyrics panel update.
            setPositionMs(pos);
        }, 100);

        return () => clearInterval(id);
    }, [lyrics, isPaused, getPositionMs]);

    // Also tick position while paused so lyrics stay correct if the user
    // manually seeks via the NowPlayingBar.
    useEffect(() => {
        if (!isPaused) return;
        setPositionMs(reportedPosition);
    }, [isPaused, reportedPosition]);

    // ── Helpers ────────────────────────────────────────────────────────────
    const cover = track?.album?.images?.[0]?.url;
    const artistNames = (track?.artists || []).map((a) => a.name).join(', ');
    const hasFullPlayback = isReady && isPremium;

    // Lyrics readiness summary fed to the intro screen's status badges.
    let lyricsStatus;
    if (lyrics === null) lyricsStatus = 'loading';
    else if (lyrics.lines && lyrics.lines.length > 0) lyricsStatus = 'synced';
    else if (lyrics.plainText) lyricsStatus = 'plain';
    else lyricsStatus = 'missing';

    // ── Render ─────────────────────────────────────────────────────────────
    if (trackError) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{trackError}</Alert>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                // Fill the viewport minus the fixed NowPlayingBar (96px) and the
                // SideNav bottom padding already applied by SideNav's wrapper Box.
                height: 'calc(100vh - 96px)',
                overflow: 'hidden',
            }}
        >
            {/* Pre-track spinner. Once the /tracks/{id} fetch resolves, we
                fall through to one of the three phase-driven views below. */}
            {!track && (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '60vh',
                    }}
                >
                    <CircularProgress />
                </Box>
            )}

            {/* Intro splash — modern karaoke "loading" screen. The hooks
                higher up (mic, lyrics, SDK) are settling underneath; their
                status surfaces as badges in the intro itself. */}
            {track && phase === 'intro' && (
                <KaraokeIntro
                    track={track}
                    hasMicStream={!!stream}
                    micError={micError}
                    lyricsStatus={lyricsStatus}
                    isReady={isReady}
                    isPremium={isPremium}
                    onStart={handleStart}
                />
            )}

            {/* 3-2-1-SING! pulse before audio starts. */}
            {track && phase === 'countdown' && (
                <KaraokeCountdown value={countdown} cover={cover} />
            )}

            {/* Playing layout. Only rendered in the playing phase so the lyrics
                panel doesn't auto-scroll uselessly during the intro/countdown. */}
            {phase === 'playing' && track && (
            <>
            {/* ── Header ── */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: { xs: 2, md: 3 },
                    py: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                }}
            >
                <Tooltip title="Back to search" arrow>
                    <IconButton onClick={() => window.location.assign('/search')} aria-label="Back to search">
                        <ArrowBackIcon />
                    </IconButton>
                </Tooltip>

                <Avatar
                    src={cover}
                    alt={track.album?.name}
                    variant="rounded"
                    sx={{ width: 44, height: 44, flexShrink: 0 }}
                />

                <Stack sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {track.name}
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {artistNames}
                    </Typography>
                </Stack>

                {/* Non-Premium warning */}
                {!hasFullPlayback && (
                    <Typography variant="caption" sx={{ color: 'warning.main', flexShrink: 0 }}>
                        Spotify Premium required for full playback
                    </Typography>
                )}
            </Box>

            {/* ── Body ── */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Lyrics panel — main stage */}
                <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {lyrics === null ? (
                        // Still fetching lyrics.
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                gap: 1.5,
                            }}
                        >
                            <CircularProgress size={28} />
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                Loading lyrics…
                            </Typography>
                        </Box>
                    ) : (
                        <LyricsPanel
                            lines={lyrics.lines}
                            positionMs={positionMs}
                            plainText={lyrics.plainText}
                        />
                    )}
                </Box>

                {/* Right column — mic + score */}
                <Box
                    sx={{
                        width: { xs: 72, md: 120 },
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 3,
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                        px: 1,
                        py: 2,
                    }}
                >
                    <MicMeter rms={rms} hasStream={!!stream} error={micError} />
                    <ScoringDisplay score={score} lineResults={lineResults} />
                </Box>
            </Box>
            </>
            )}
        </Box>
    );
}
