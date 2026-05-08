/**
 * Components/LoginHero.jsx
 * "Spotlight" cursor-reveal login — a literal play on the app name.
 *
 * The page is near-black. As the cursor moves, a soft warm-white beam
 * follows it, and the welcome heading + subtitle are revealed only
 * where the beam touches them (CSS mask using a radial-gradient at the
 * cursor position). The Spotify mark and login button stay faintly
 * visible (~40% opacity) at all times so the user always knows where
 * to click; they brighten to full on hover.
 *
 * The effect is driven by two CSS variables (--mouse-x, --mouse-y)
 * updated on mousemove. No animation library — setting CSS variables
 * doesn't trigger React re-renders, so the runtime cost is ~free.
 *
 * Falls back to a static, fully-visible layout on touch devices and
 * when prefers-reduced-motion: reduce is set.
 *
 * The PKCE OAuth flow lives in useSpotifyAuth; the button just calls
 * login() and the rest happens in Pages/Callback.jsx.
 */

import { useEffect, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

// Inline Spotify SVG — recognizable three-arc mark in Spotify green.
function SpotifyLogo({ size = 88 }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="#1DB954"
            aria-label="Spotify logo"
            role="img"
        >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    );
}

// Mask applied to the revealed text. The element renders at full color,
// but only the area around the cursor is shown (opaque mask). Off touch
// + prefers-reduced-motion, drop the mask so text is always visible —
// fully usable, just static.
const SPOTLIGHT_MASK = {
    WebkitMaskImage:
        'radial-gradient(circle 240px at var(--mouse-x) var(--mouse-y), black 0%, transparent 65%)',
    maskImage:
        'radial-gradient(circle 240px at var(--mouse-x) var(--mouse-y), black 0%, transparent 65%)',
    '@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)': {
        WebkitMaskImage: 'none',
        maskImage: 'none',
    },
};

// Faded-by-default, brightens-on-hover. Used by the Spotify mark + button
// so they're always discoverable but feel "in shadow" until reached for.
const FADED_INTERACTIVE = {
    opacity: 0.4,
    transition: 'opacity 200ms ease',
    '&:hover': { opacity: 1 },
};

export default function LoginHero() {
    const { login } = useSpotifyAuth();
    const containerRef = useRef(null);

    // Update CSS vars on mousemove. Direct DOM writes (no React state) so the
    // browser handles 60fps repaints without triggering re-renders.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
            el.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
        };
        el.addEventListener('mousemove', onMove);
        return () => el.removeEventListener('mousemove', onMove);
    }, []);

    return (
        <Box
            ref={containerRef}
            // Default values place the mask off-screen so masked text starts
            // fully hidden until the user moves the cursor for the first time.
            style={{ '--mouse-x': '-9999px', '--mouse-y': '-9999px' }}
            sx={{
                position: 'relative',
                minHeight: '100vh',
                backgroundColor: '#0a0a0a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                cursor: 'crosshair',  // theatrical: the cursor IS the spotlight aim
            }}
        >
            {/* Visible beam — soft warm-white cone tracking the cursor. */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    background:
                        'radial-gradient(circle 320px at var(--mouse-x) var(--mouse-y), rgba(255, 240, 220, 0.18), transparent 70%)',
                    '@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)': {
                        display: 'none',
                    },
                }}
            />

            {/* Foreground content, vertically + horizontally centered. */}
            <Stack
                spacing={3}
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    alignItems: 'center',
                    textAlign: 'center',
                    px: 3,
                    maxWidth: 640,
                }}
            >
                <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                        color: '#ffffff',
                        fontSize: { xs: '2.5rem', md: '4rem' },
                        ...SPOTLIGHT_MASK,
                    }}
                >
                    Welcome to Spotlight!
                </Typography>

                <Typography
                    variant="h6"
                    sx={{ color: '#b3b3b3', ...SPOTLIGHT_MASK }}
                >
                    A Karaoke Application Using Spotify API
                </Typography>

                {/* 1/3-width hairline — always faintly visible, separates text
                    from the interactive cluster below. */}
                <Box
                    sx={{
                        width: '33%',
                        height: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    }}
                />

                {/* Spotify mark — always faint, brightens on hover. */}
                <Box sx={FADED_INTERACTIVE}>
                    <SpotifyLogo />
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    onClick={login}
                    sx={{
                        borderRadius: 999,           // Apple-style pill
                        px: 5,
                        py: 1.5,
                        fontSize: '1rem',
                        opacity: 0.45,
                        boxShadow: 'none',
                        transition:
                            'opacity 200ms ease, box-shadow 200ms ease, transform 200ms ease',
                        '&:hover': {
                            opacity: 1,
                            boxShadow: '0 8px 24px rgba(29, 185, 84, 0.45)',
                            transform: 'translateY(-1px)',
                        },
                        '&:active': {
                            transform: 'translateY(0)',
                        },
                    }}
                >
                    Login with Spotify
                </Button>
            </Stack>
        </Box>
    );
}
