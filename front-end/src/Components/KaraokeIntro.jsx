/**
 * Components/KaraokeIntro.jsx
 * Pre-song "stage" screen — the modern equivalent of a karaoke machine's
 * "Now playing… please stand by" splash. Shows the track that's about to
 * play with big album art, title, and artist over a blurred-cover backdrop.
 *
 * While the user is reading the title, the hooks higher up (useMicrophone,
 * getSyncedLyrics, Spotify SDK ready) are settling in the background. We
 * surface their status as small badges so the user knows what they're
 * getting before they hit Start.
 *
 * Props:
 *   track         — Spotify track object (with album.images[0].url, name, artists)
 *   hasMicStream  — true when useMicrophone has a live stream
 *   micError      — error code string from useMicrophone, or null
 *   lyricsStatus  — 'loading' | 'synced' | 'plain' | 'missing'
 *   isReady       — Spotify Web Playback SDK ready
 *   isPremium     — account is Premium
 *   onStart       — called when the user clicks Start; triggers the countdown
 */

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';

// Small inline badge — one line per readiness check.
function StatusBadge({ state, label }) {
    // state: 'ok' | 'warn' | 'error' | 'pending'
    let icon;
    let color = 'rgba(255,255,255,0.92)';

    if (state === 'ok') {
        icon = <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />;
    } else if (state === 'warn') {
        icon = <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} />;
    } else if (state === 'error') {
        icon = <ErrorOutlineIcon sx={{ fontSize: 18, color: 'error.main' }} />;
    } else {
        icon = <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.7)' }} />;
        color = 'rgba(255,255,255,0.7)';
    }

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            {icon}
            <Typography sx={{ color, fontSize: '0.92rem', fontWeight: 500 }}>
                {label}
            </Typography>
        </Stack>
    );
}

export default function KaraokeIntro({
    track,
    hasMicStream,
    micError,
    lyricsStatus,
    isReady,
    isPremium,
    onStart,
}) {
    const cover = track?.album?.images?.[0]?.url;
    const artistNames = (track?.artists || []).map((a) => a.name).join(', ');

    // ── Derive badge states for the three readiness checks ───────────────
    // Spotify: blocking. Without Premium + ready SDK there's no audio.
    let spotifyState, spotifyLabel;
    if (!isPremium) {
        spotifyState = 'error';
        spotifyLabel = 'Spotify Premium required';
    } else if (isReady) {
        spotifyState = 'ok';
        spotifyLabel = 'Connected to Spotify';
    } else {
        spotifyState = 'pending';
        spotifyLabel = 'Connecting to Spotify…';
    }

    // Mic: non-blocking. User can sing along without scoring.
    let micState, micLabel;
    if (micError === 'microphone_denied') {
        micState = 'warn';
        micLabel = 'Mic blocked — sing along anyway';
    } else if (micError === 'microphone_not_found') {
        micState = 'warn';
        micLabel = 'No microphone found';
    } else if (micError) {
        micState = 'warn';
        micLabel = 'Mic error — scoring disabled';
    } else if (hasMicStream) {
        micState = 'ok';
        micLabel = 'Microphone ready';
    } else {
        micState = 'pending';
        micLabel = 'Requesting microphone…';
    }

    // Lyrics: non-blocking. Plain/missing both downgrade gracefully.
    let lyricsState, lyricsLabel;
    if (lyricsStatus === 'loading') {
        lyricsState = 'pending';
        lyricsLabel = 'Finding lyrics…';
    } else if (lyricsStatus === 'synced') {
        lyricsState = 'ok';
        lyricsLabel = 'Synced lyrics ready';
    } else if (lyricsStatus === 'plain') {
        lyricsState = 'warn';
        lyricsLabel = 'Plain lyrics only (no time sync)';
    } else {
        lyricsState = 'warn';
        lyricsLabel = 'No lyrics found — sing freestyle';
    }

    // Start is enabled once the SDK is ready AND lyrics state is settled
    // (either way — we don't want to start before knowing if we have lyrics).
    const sdkReady = isReady && isPremium;
    const lyricsSettled = lyricsStatus !== 'loading';
    const canStart = !!track && sdkReady && lyricsSettled;

    let startTooltip = 'Start karaoke';
    if (!track) startTooltip = 'Loading track…';
    else if (!isPremium) startTooltip = 'Spotify Premium required';
    else if (!isReady) startTooltip = 'Waiting for Spotify…';
    else if (!lyricsSettled) startTooltip = 'Finding lyrics…';

    return (
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Blurred album cover backdrop — anchors the screen visually to
                this specific song before audio even kicks in. */}
            {cover && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(60px) saturate(1.4)',
                        // Scale up so the blur's softened edge stays off-screen.
                        transform: 'scale(1.2)',
                        opacity: 0.55,
                    }}
                />
            )}

            {/* Top-to-bottom dark gradient for legibility over the cover. */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                        'linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.78) 100%)',
                }}
            />

            {/* Foreground content */}
            <Stack
                sx={{
                    position: 'relative',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: { xs: 2.5, md: 3.5 },
                    px: 3,
                    py: 4,
                    textAlign: 'center',
                    overflowY: 'auto',
                }}
            >
                {/* Album cover — pops in on mount */}
                {cover && (
                    <Box
                        component="img"
                        src={cover}
                        alt={track?.album?.name || ''}
                        sx={{
                            width: { xs: 200, md: 260 },
                            height: { xs: 200, md: 260 },
                            borderRadius: 3,
                            objectFit: 'cover',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
                            animation: 'pop 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                            '@keyframes pop': {
                                '0%': { transform: 'scale(0.82)', opacity: 0 },
                                '100%': { transform: 'scale(1)', opacity: 1 },
                            },
                        }}
                    />
                )}

                <Stack sx={{ alignItems: 'center', gap: 0.5 }}>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: '1.6rem', md: '2.4rem' },
                            color: '#fff',
                            lineHeight: 1.2,
                            textShadow: '0 2px 14px rgba(0,0,0,0.6)',
                            maxWidth: 720,
                        }}
                    >
                        {track?.name || 'Loading…'}
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 500,
                            fontSize: { xs: '1rem', md: '1.25rem' },
                            color: 'rgba(255,255,255,0.85)',
                            textShadow: '0 2px 12px rgba(0,0,0,0.55)',
                        }}
                    >
                        {artistNames}
                    </Typography>
                </Stack>

                {/* Three readiness badges */}
                <Stack gap={0.85} sx={{ alignItems: 'flex-start', minWidth: 240 }}>
                    <StatusBadge state={spotifyState} label={spotifyLabel} />
                    <StatusBadge state={micState} label={micLabel} />
                    <StatusBadge state={lyricsState} label={lyricsLabel} />
                </Stack>

                {/* Hard blocker — surface Premium issue prominently. */}
                {!isPremium && (
                    <Alert
                        severity="error"
                        sx={{
                            maxWidth: 380,
                            bgcolor: 'rgba(211,47,47,0.18)',
                            color: '#fff',
                            border: '1px solid',
                            borderColor: 'error.main',
                            '& .MuiAlert-icon': { color: 'error.light' },
                        }}
                    >
                        Spotify Premium is required for full-track playback in karaoke mode.
                    </Alert>
                )}

                {/* Start button — pulses gently when ready to draw the eye. */}
                <Tooltip title={startTooltip} arrow>
                    {/* span wrapper so Tooltip works on disabled buttons */}
                    <span>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={onStart}
                            disabled={!canStart}
                            startIcon={<PlayCircleFilledIcon />}
                            sx={{
                                mt: 1,
                                px: 4.5,
                                py: 1.5,
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                borderRadius: '999px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                boxShadow: canStart
                                    ? '0 0 30px rgba(29,185,84,0.45)'
                                    : 'none',
                                animation: canStart ? 'glow 2.4s ease-in-out infinite' : 'none',
                                '@keyframes glow': {
                                    '0%, 100%': {
                                        boxShadow: '0 0 20px rgba(29,185,84,0.35)',
                                    },
                                    '50%': {
                                        boxShadow: '0 0 42px rgba(29,185,84,0.7)',
                                    },
                                },
                            }}
                        >
                            Start Karaoke
                        </Button>
                    </span>
                </Tooltip>
            </Stack>
        </Box>
    );
}
