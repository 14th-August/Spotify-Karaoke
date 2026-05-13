/**
 * Components/KaraokeCountdown.jsx
 * The 3-2-1-SING! flash before playback begins. A huge centered number
 * pulses in over a darker, more-blurred version of the album backdrop.
 * On the final tick we swap the number for "SING!" with a louder pulse
 * just before the parent flips to the playing phase.
 *
 * Props:
 *   value — 3, 2, 1, or 0 (0 renders "SING!")
 *   cover — album cover URL used as the blurred backdrop
 *
 * The `key={value}` on the inner Box forces React to remount the number
 * each tick, which re-runs the keyframe animation so each digit pops in
 * fresh rather than transitioning between values.
 */

import { Box, Stack, Typography } from '@mui/material';

export default function KaraokeCountdown({ value, cover }) {
    // value === 0 marks the "go" beat — show the action word instead of a digit.
    const isGo = value <= 0;
    const display = isGo ? 'SING!' : String(value);
    const subText = isGo ? '' : 'Get ready';

    return (
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {/* Heavier blur + dimmer overlay than the intro — focuses the
                eye on the number, not the cover. */}
            {cover && (
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${cover})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        filter: 'blur(90px) saturate(1.5)',
                        transform: 'scale(1.25)',
                        opacity: 0.4,
                    }}
                />
            )}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.72)',
                }}
            />

            <Stack
                sx={{
                    position: 'relative',
                    height: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                }}
            >
                <Box
                    key={value}
                    sx={{
                        // "SING!" is wider than a single digit — drop the font
                        // size so it fits comfortably on phones.
                        fontSize: isGo
                            ? { xs: '4.5rem', md: '7rem' }
                            : { xs: '10rem', md: '14rem' },
                        fontWeight: 900,
                        color: 'primary.main',
                        lineHeight: 1,
                        letterSpacing: isGo ? '0.05em' : '0',
                        textShadow: '0 0 60px rgba(29,185,84,0.55)',
                        // The "go" tick gets a brassier pop for that final beat.
                        animation: isGo
                            ? 'goPulse 500ms cubic-bezier(0.22, 1, 0.36, 1)'
                            : 'tickPulse 1s cubic-bezier(0.22, 1, 0.36, 1)',
                        '@keyframes tickPulse': {
                            '0%': { transform: 'scale(0.3)', opacity: 0 },
                            '40%': { transform: 'scale(1.18)', opacity: 1 },
                            '100%': { transform: 'scale(1)', opacity: 0.95 },
                        },
                        '@keyframes goPulse': {
                            '0%': { transform: 'scale(0.6)', opacity: 0 },
                            '50%': { transform: 'scale(1.25)', opacity: 1 },
                            '100%': { transform: 'scale(1.1)', opacity: 1 },
                        },
                    }}
                >
                    {display}
                </Box>

                {subText && (
                    <Typography
                        sx={{
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: { xs: '1.1rem', md: '1.5rem' },
                            letterSpacing: '0.2em',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            textShadow: '0 2px 10px rgba(0,0,0,0.55)',
                        }}
                    >
                        {subText}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}
