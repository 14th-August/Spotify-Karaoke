/**
 * Components/LoginHero.jsx
 * The split-hero login layout: a welcome panel on the left and a Spotify
 * login CTA on the right. Stacks vertically below 900px (MUI's `md`
 * breakpoint) and the divider re-orients itself horizontally automatically
 * because we pass it as Stack's `divider` prop — Stack always orients its
 * divider perpendicular to its own direction.
 *
 * The PKCE OAuth flow lives in useSpotifyAuth; the button here just calls
 * login() and the rest of the redirect-back happens in Pages/Callback.jsx.
 */

import { Box, Button, Divider, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

// Inline Spotify SVG — the recognizable three-arc "S" mark in Spotify
// green. Kept inline in this file because it's only used here for now;
// promote to its own Components/SpotifyLogo.jsx if a second caller appears.
function SpotifyLogo({ size = 96 }) {
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

export default function LoginHero() {
    const { login } = useSpotifyAuth();

    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            divider={<Divider flexItem />}
            sx={{ minHeight: '100vh' }}
        >
            {/* Left panel: welcome message over a Spotify-toned gradient. */}
            <Box
                sx={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #121212 0%, #0d6635 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                }}
            >
                <Stack spacing={2} sx={{ textAlign: 'center', maxWidth: 480 }}>
                    <Typography variant="h2" component="h1">
                        Welcome to Spotlight
                    </Typography>
                    <Typography variant="h6" sx={{ textDecoration: 'underline' }}>
                        A Karaoke Application Using Spotify API
                    </Typography>
                </Stack>
            </Box>

            {/* Right panel: Spotify mark + login CTA. */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                }}
            >
                <Stack spacing={4} sx={{ alignItems: 'center' }}>
                    <SpotifyLogo />
                    <Button
                        variant="contained"
                        size="large"
                        color="primary"
                        onClick={login}
                    >
                        Login with Spotify
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
}
