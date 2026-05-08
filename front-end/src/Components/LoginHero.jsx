/**
 * Components/LoginHero.jsx
 * Minimal black-and-white login. White background, black text. Each
 * element — heading, subtitle, Spotify mark — shifts to Spotify green
 * on hover. The page reads as monochrome at rest and "blooms" only
 * when you reach for it.
 *
 * No cursor effects, no spotlight, no fade-on-default; just text and
 * a CTA on a clean white canvas.
 *
 * Auth flow unchanged: useSpotifyAuth.login() kicks off PKCE; the
 * redirect-back is handled by Pages/Callback.jsx.
 */

import { Box, Button, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

const SPOTIFY_GREEN = '#1DB954';

// Inline Spotify SVG. No fill attribute on the <svg> element — the
// wrapping Box controls the color via CSS (`fill: currentColor` on the
// child path) so the icon transitions alongside text on hover.
function SpotifyLogo({ size = 88 }) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            aria-label="Spotify logo"
            role="img"
        >
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    );
}

// Black at rest, Spotify green on hover. Used by both Typography elements
// and the Spotify mark. The SVG path inherits via fill: currentColor.
const HOVER_TO_GREEN = {
    color: '#000',
    transition: 'color 200ms ease',
    '& svg': { fill: 'currentColor' },
    '&:hover': { color: SPOTIFY_GREEN },
};

export default function LoginHero() {
    const { login } = useSpotifyAuth();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: 3,
            }}
        >
            <Stack
                spacing={3}
                sx={{
                    alignItems: 'center',
                    textAlign: 'center',
                    maxWidth: 640,
                }}
            >
                <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                        fontSize: { xs: '2.5rem', md: '4rem' },
                        ...HOVER_TO_GREEN,
                    }}
                >
                    Welcome to Spotlight!
                </Typography>

                <Typography variant="h6" sx={HOVER_TO_GREEN}>
                    A Karaoke Application Using Spotify API
                </Typography>

                {/* Hairline divider — black at low opacity on white. */}
                <Box
                    sx={{
                        width: '33%',
                        height: '1px',
                        backgroundColor: 'rgba(0, 0, 0, 0.15)',
                    }}
                />

                <Box sx={HOVER_TO_GREEN}>
                    <SpotifyLogo />
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    onClick={login}
                    sx={{
                        borderRadius: 999,
                        px: 5,
                        py: 1.5,
                        fontSize: '1rem',
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' },
                    }}
                >
                    Login with Spotify
                </Button>
            </Stack>
        </Box>
    );
}
