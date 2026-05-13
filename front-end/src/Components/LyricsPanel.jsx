/**
 * Components/LyricsPanel.jsx
 * Karaoke-style line display: only the current line + the next couple of
 * upcoming lines are shown. Past lines disappear once their window
 * closes, so the screen stays focused on what the singer is doing now.
 *
 * Layout (synced lyrics path):
 *   ┌─────────────────────────────────────┐
 *   │                                     │
 *   │       NEXT LINE (faded, small)      │
 *   │      ┌──────────────────────┐       │
 *   │      │  CURRENT LINE (big)  │       │
 *   │      └──────────────────────┘       │
 *   │        upcoming line +2 (faintest)  │
 *   │                                     │
 *   └─────────────────────────────────────┘
 *
 * Each <Typography> uses `key={line.time_ms}` so React mounts a fresh node
 * when the active line changes — that lets the CSS keyframe replay and the
 * new current line fades in from below.
 *
 * Fallbacks:
 *   - Plain text only → render the whole block statically, scrollable
 *   - Nothing found → gentle "sing freestyle" message
 *
 * Props:
 *   lines      — Array<{ time_ms, text }> or null
 *   positionMs — current playback position
 *   plainText  — fallback unsynced lyrics string
 */

import { Box, Stack, Typography } from '@mui/material';

// How many lines past the current to show as "upcoming preview".
const UPCOMING_COUNT = 2;

// Find the index of the line that's currently active (latest line whose
// timestamp has been passed). Linear scan backwards — with ≤500 lines per
// song it's faster than binary search would be in practice.
const findActiveIdx = (lines, positionMs) => {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (positionMs >= lines[i].time_ms) return i;
    }
    return -1;
};

export default function LyricsPanel({ lines, positionMs, plainText }) {
    // No synced lines AND no plain text — render the gentle empty state.
    if (!lines && !plainText) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                }}
            >
                <Typography sx={{ color: 'text.secondary' }}>
                    No lyrics found — sing freestyle!
                </Typography>
            </Box>
        );
    }

    // Plain text only: no time anchors, so we can't karaoke-display.
    // Show the whole thing in a scrollable column.
    if (!lines && plainText) {
        return (
            <Box
                sx={{
                    height: '100%',
                    overflowY: 'auto',
                    px: 3,
                    py: 2,
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mb: 1.5, textAlign: 'center' }}
                >
                    Plain lyrics — no time sync available
                </Typography>
                <Typography
                    sx={{
                        whiteSpace: 'pre-wrap',
                        color: 'text.secondary',
                        fontSize: '1rem',
                        lineHeight: 1.9,
                        textAlign: 'center',
                    }}
                >
                    {plainText}
                </Typography>
            </Box>
        );
    }

    // ── Synced path: show current + next few lines ────────────────────────
    const activeIdx = findActiveIdx(lines, positionMs);
    const currentLine = activeIdx >= 0 ? lines[activeIdx] : null;
    const upcoming = lines.slice(activeIdx + 1, activeIdx + 1 + UPCOMING_COUNT);

    // Before the first line lands, show the upcoming-1 as the "coming next"
    // preview so the screen isn't empty during the intro instrumental.
    const showPreLeadIn = activeIdx === -1 && lines.length > 0;

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                px: 3,
                py: 2,
                gap: 1.5,
                textAlign: 'center',
                overflow: 'hidden',
            }}
        >
            {/* Pre-roll: shown before any line has played. */}
            {showPreLeadIn && (
                <>
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', letterSpacing: '0.15em', textTransform: 'uppercase' }}
                    >
                        Up next
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: { xs: '1.4rem', md: '1.8rem' },
                            fontWeight: 600,
                            color: 'text.primary',
                            opacity: 0.7,
                        }}
                    >
                        {lines[0].text || '♪'}
                    </Typography>
                </>
            )}

            {/* Current line — biggest, brightest, animates in on change. */}
            {currentLine && (
                <Typography
                    key={`current-${activeIdx}`}
                    sx={{
                        fontSize: { xs: '1.8rem', md: '2.6rem' },
                        fontWeight: 800,
                        color: 'primary.main',
                        lineHeight: 1.25,
                        // Slide up + fade in each time a new line activates.
                        animation: 'lyricIn 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                        '@keyframes lyricIn': {
                            '0%': { opacity: 0, transform: 'translateY(24px)' },
                            '100%': { opacity: 1, transform: 'translateY(0)' },
                        },
                    }}
                >
                    {currentLine.text || '♪'}
                </Typography>
            )}

            {/* Upcoming preview — small, faded, no animation churn. */}
            {upcoming.map((line, i) => (
                <Typography
                    key={`up-${line.time_ms}-${i}`}
                    sx={{
                        fontSize: { xs: '1rem', md: '1.2rem' },
                        fontWeight: 500,
                        color: 'text.secondary',
                        // Each successive upcoming line is dimmer than the one above.
                        opacity: 0.55 - i * 0.2,
                    }}
                >
                    {line.text || '♪'}
                </Typography>
            ))}
        </Box>
    );
}
