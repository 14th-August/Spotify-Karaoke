/**
 * Components/NowPlayingBar.jsx
 * Sticky bottom bar showing the currently playing track + transport
 * controls. Reads everything from PlayerContext, hidden until the SDK
 * reports a track in the player state.
 *
 * Layout (left → right):
 *   [Cover]  [Track + Artist]  [Prev | Play/Pause | Next]  [Progress]
 *
 * The SDK's player_state_changed events carry an authoritative position
 * but only fire on state transitions (play/pause/seek/track-change).
 * We tick a local position +1s while playing and resync on each event,
 * so the progress bar feels live instead of stepping.
 */

import { useContext, useEffect, useState } from 'react';
import {
    Avatar,
    Box,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';

import { PlayerContext } from '../Player/PlayerContext';

// Keep aligned with SideNav's COLLAPSED_WIDTH so the bar starts at the
// rail's edge on desktop and full-width on mobile.
const COLLAPSED_RAIL_WIDTH = 64;
const BAR_HEIGHT = 80;

const formatTime = (ms) => {
    if (!ms || ms < 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

export default function NowPlayingBar() {
    const { state, togglePlay, nextTrack, previousTrack } = useContext(PlayerContext);

    const track = state?.track_window?.current_track;
    const isPaused = state?.paused ?? true;
    const reportedPosition = state?.position ?? 0;
    const reportedAt = state?.timestamp ?? 0;
    const duration = state?.duration ?? 0;

    // Tick a `now` timestamp every second while playing. We derive the
    // displayed position from (reportedPosition + (now - reportedAt))
    // instead of mirroring it in state — keeps the lint rule happy
    // (no synchronous setState in an effect body) and makes the math
    // continuously accurate without an explicit resync.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (isPaused || !duration) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [isPaused, duration, reportedAt]);

    // Hide entirely when nothing has played in this session yet.
    if (!track) return null;

    const sinceReport = isPaused ? 0 : Math.max(0, now - reportedAt);
    const position = Math.min(reportedPosition + sinceReport, duration);
    const cover = track.album?.images?.[0]?.url;
    const artistNames = (track.artists || []).map((a) => a.name).join(', ');
    const progressPct = duration ? Math.min(100, (position / duration) * 100) : 0;

    return (
        <Box
            role="region"
            aria-label="Now playing"
            sx={{
                position: 'fixed',
                bottom: 0,
                left: { xs: 0, md: `${COLLAPSED_RAIL_WIDTH}px` },
                right: 0,
                zIndex: 50,
                height: BAR_HEIGHT,
                bgcolor: 'background.paper',
                borderTop: '1px solid',
                borderColor: 'divider',
                px: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
            }}
        >
            {/* Track info */}
            <Avatar
                src={cover}
                alt={track.album?.name}
                variant="rounded"
                sx={{ width: 56, height: 56, flexShrink: 0 }}
            />
            <Stack sx={{ minWidth: 0, maxWidth: { xs: 120, sm: 220, md: 280 }, flexShrink: 1 }}>
                <Typography
                    sx={{
                        fontWeight: 500,
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

            {/* Transport controls */}
            <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: 'center', flexShrink: 0, ml: 'auto' }}
            >
                <Tooltip title="Previous" arrow>
                    <IconButton onClick={previousTrack} aria-label="Previous track">
                        <SkipPreviousIcon />
                    </IconButton>
                </Tooltip>
                <Tooltip title={isPaused ? 'Play' : 'Pause'} arrow>
                    <IconButton
                        onClick={togglePlay}
                        aria-label={isPaused ? 'Play' : 'Pause'}
                        sx={{ color: 'primary.main' }}
                    >
                        {isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                    </IconButton>
                </Tooltip>
                <Tooltip title="Next" arrow>
                    <IconButton onClick={nextTrack} aria-label="Next track">
                        <SkipNextIcon />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* Progress + time (hidden on the smallest screens — controls take priority) */}
            <Stack
                sx={{
                    flex: 1,
                    maxWidth: 320,
                    display: { xs: 'none', sm: 'flex' },
                    flexShrink: 1,
                    ml: 1,
                }}
            >
                <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{ height: 4, borderRadius: 2 }}
                />
                <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatTime(position)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {formatTime(duration)}
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    );
}
