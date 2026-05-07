/**
 * Components/LoginHero.jsx
 * Sleek, Apple-flavored login layout. Two panels share a soft white
 * gradient and meet at a 1px black divider. Stacks vertically below
 * 900px (MUI's `md` breakpoint) and the panel divider re-orients
 * itself horizontally automatically because we pass it as Stack's
 * `divider` prop.
 *
 * The PKCE OAuth flow lives in useSpotifyAuth; the button here just
 * calls login() and the rest of the redirect-back happens in
 * Pages/Callback.jsx.
 */

import { Box, Button, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

// Inline Spotify SVG — the recognizable three-arc "S" mark in Spotify
// green. Kept inline because it's only used here for now; promote to
// its own Components/SpotifyLogo.jsx if a second caller appears.
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

// Apple's near-black + subdued grey, lifted from the apple.com style.
const APPLE_NEAR_BLACK = '#1d1d1f';
const APPLE_SUBTLE_GREY = '#6e6e73';

export default function LoginHero() {
    const { login } = useSpotifyAuth();

    return (
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            divider={
                // Short black line — 1/3 of the viewport on the cross-axis,
                // centered. Use vh/vw so the size resolves regardless of
                // parent height (min-height alone doesn't give percentages
                // a definite value to compute against — they collapse to 0).
                <Box
                    sx={{
                        alignSelf: 'center',
                        backgroundColor: APPLE_NEAR_BLACK,
                        width: { xs: '33vw', md: '1px' },
                        height: { xs: '1px', md: '33vh' },
                    }}
                />
            }
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f7 100%)',
            }}
        >
            {/* Left panel: welcome message. Content sits toward the
                divider with a tighter inner gap than the right panel,
                centered on mobile when the layout stacks vertically. */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'center', md: 'flex-end' },
                    py: { xs: 3, md: 4 },
                    pl: { xs: 3, md: 4 },
                    pr: { xs: 3, md: 2 },
                }}
            >
                <Stack spacing={2} sx={{ textAlign: 'center', maxWidth: 520 }}>
                    <Typography
                        variant="h1"
                        component="h1"
                        sx={{
                            color: APPLE_NEAR_BLACK,
                            fontSize: { xs: '2.5rem', md: '3.75rem' },
                        }}
                    >
                        Welcome to Spotlight!
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{ color: APPLE_SUBTLE_GREY }}
                    >
                        A Karaoke Application Using Spotify API
                    </Typography>
                </Stack>
            </Box>

            {/* Right panel: Spotify mark + CTA. Mirrors the left panel —
                content sits toward the divider on desktop, centered on mobile. */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: { xs: 'center', md: 'flex-start' },
                    py: { xs: 3, md: 4 },
                    pl: { xs: 3, md: 8 },
                    pr: { xs: 3, md: 2 },
                }}
            >
                <Stack spacing={3} sx={{ alignItems: 'center' }}>
                    <SpotifyLogo />
                    <Button
                        variant="contained"
                        size="large"
                        color="primary"
                        onClick={login}
                        sx={{
                            borderRadius: 999,             // Apple-style pill
                            px: 5,
                            py: 1.5,
                            fontSize: '1rem',
                            boxShadow: 'none',
                            transition: 'box-shadow 200ms ease, transform 200ms ease',
                            '&:hover': {
                                // Soft Spotify-green glow on hover, Apple-button feel.
                                boxShadow: '0 8px 24px rgba(29, 185, 84, 0.35)',
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
        </Stack>
    );
}
