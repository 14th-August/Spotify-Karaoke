/**
 * Components/LyricsPanel.jsx
 * Scrolling lyrics display synced to playback position. The active line
 * is highlighted in primary color and scaled up slightly; past lines fade
 * out; upcoming lines stay dimmed. The panel auto-scrolls so the active
 * line stays centered.
 *
 * Props:
 *   lines      — Array<{ time_ms, text }> from parseLRC, or null if no sync
 *   positionMs — current playback position in milliseconds
 *   plainText  — fallback plain-text string when synced lines aren't available
 */

import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';

export default function LyricsPanel({ lines, positionMs, plainText }) {
    const containerRef = useRef(null);
    const activeRef = useRef(null);

    // Binary search would be faster, but with ≤500 lines a linear backward
    // scan is negligible and simpler to read.
    let activeIdx = -1;
    if (lines) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (positionMs >= lines[i].time_ms) {
                activeIdx = i;
                break;
            }
        }
    }

    // Scroll the active line to vertical center of the panel on each change.
    useEffect(() => {
        const el = activeRef.current;
        const container = containerRef.current;
        if (!el || !container) return;
        const target = el.offsetTop + el.offsetHeight / 2 - container.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }, [activeIdx]);

    // No lyrics at all.
    if (!lines && !plainText) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography sx={{ color: 'text.secondary' }}>
                    No lyrics found for this track.
                </Typography>
            </Box>
        );
    }

    // Plain text only — show statically, no time-sync highlighting.
    if (!lines && plainText) {
        return (
            <Box
                ref={containerRef}
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

    return (
        <Box
            ref={containerRef}
            sx={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                px: 3,
                py: 2,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
            }}
        >
            {/* Top spacer so the first line can scroll to center */}
            <Box sx={{ height: '40%' }} />

            {lines.map((line, i) => {
                const isActive = i === activeIdx;
                const isPast = i < activeIdx;
                return (
                    <Box
                        key={i}
                        ref={isActive ? activeRef : null}
                        sx={{
                            py: 0.75,
                            textAlign: 'center',
                            transition: 'opacity 300ms ease, transform 250ms ease',
                            opacity: isActive ? 1 : isPast ? 0.3 : 0.5,
                            transform: isActive ? 'scale(1.06)' : 'scale(1)',
                            transformOrigin: 'center center',
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: isActive ? 700 : 400,
                                fontSize: isActive ? '1.25rem' : '1rem',
                                color: isActive ? 'primary.main' : 'text.primary',
                                lineHeight: 1.6,
                                transition: 'color 300ms ease, font-size 200ms ease, font-weight 200ms ease',
                                // Use a music note for blank rest lines so the
                                // panel doesn't visually collapse on gaps.
                                '&:empty::after': { content: '"♪"' },
                            }}
                        >
                            {line.text || '♪'}
                        </Typography>
                    </Box>
                );
            })}

            {/* Bottom spacer so the last line can scroll to center */}
            <Box sx={{ height: '40%' }} />
        </Box>
    );
}
