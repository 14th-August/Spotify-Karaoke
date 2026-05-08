/**
 * Components/LoginHero.jsx
 * Asymmetric two-column login. Left column stacks the welcome heading,
 * subtitle, and login button; right column holds the Spotify mark
 * vertically centered, sitting on a slowly-spinning ring of album-cover
 * tiles. White canvas, monochrome at rest, Spotify-green on hover for
 * the text and icon.
 *
 * On mobile (<900px) the layout collapses to a single centered column.
 *
 * Auth flow unchanged: useSpotifyAuth.login() kicks off PKCE; the
 * redirect-back is handled by Pages/Callback.jsx.
 */

import { Box, Button, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

const SPOTIFY_GREEN = '#1DB954';

// Stable Lorem Picsum URLs — each `seed` maps to a fixed photo, so the
// wheel shows the same 10 images across reloads. Drop-in replacements for
// when real album art lands via the Spotify API later.
const ALBUM_IMAGE_URL = (seed) => `https://picsum.photos/seed/${seed}/200/200`;
const ALBUM_SEEDS = [
    'spotlight-1', 'spotlight-2', 'spotlight-3', 'spotlight-4', 'spotlight-5',
    'spotlight-6', 'spotlight-7', 'spotlight-8', 'spotlight-9', 'spotlight-10',
];

// Inline Spotify SVG. No fill attribute on the <svg> — the wrapping
// Box controls the color via CSS (`fill: currentColor` on the path)
// so the icon transitions alongside text on hover.
function SpotifyLogo({ size = 140 }) {
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

// Rotating ring of gradient tiles. Each tile is placed on a circle of
// radius `size/2` using the standard "rotate-translate-counter-rotate"
// transform pattern. The whole ring spins via @keyframes on the wrapper.
// Skip the spin entirely under prefers-reduced-motion.
function AlbumWheel({ size = 340, tileSize = 56, count = ALBUM_SEEDS.length }) {
    const radius = size / 2;
    const tiles = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * 360,
        imageUrl: ALBUM_IMAGE_URL(ALBUM_SEEDS[i % ALBUM_SEEDS.length]),
    }));

    return (
        <Box
            aria-hidden
            sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: size,
                height: size,
                mt: `-${size / 2}px`,
                ml: `-${size / 2}px`,
                pointerEvents: 'none',
                animation: 'albumWheelSpin 40s linear infinite',
                '@keyframes albumWheelSpin': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                },
                '@media (prefers-reduced-motion: reduce)': {
                    animation: 'none',
                },
            }}
        >
            {tiles.map((tile, i) => (
                <Box
                    key={i}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: tileSize,
                        height: tileSize,
                        mt: `-${tileSize / 2}px`,
                        ml: `-${tileSize / 2}px`,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        opacity: 0.85,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                        // Place on the circle: rotate around center, push out
                        // by `radius`, counter-rotate so the tile starts upright.
                        transform: `rotate(${tile.angle}deg) translateY(-${radius}px) rotate(-${tile.angle}deg)`,
                    }}
                >
                    <img
                        src={tile.imageUrl}
                        alt=""
                        loading="lazy"
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'cover',
                        }}
                    />
                </Box>
            ))}
        </Box>
    );
}

// Black at rest, Spotify green on hover. Used on Typography and the
// SpotifyLogo wrapper. The SVG path inherits via fill: currentColor.
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
                px: { xs: 3, md: 8 },
                py: 4,
            }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={{ xs: 4, md: 8 }}
                sx={{
                    alignItems: 'center',
                    maxWidth: 1100,
                    width: '100%',
                }}
            >
                {/* Left column: heading + subtitle + login button. */}
                <Stack
                    spacing={3}
                    sx={{
                        flex: 1,
                        alignItems: { xs: 'center', md: 'flex-start' },
                        textAlign: { xs: 'center', md: 'left' },
                    }}
                >
                    <Typography
                        variant="h1"
                        component="h1"
                        sx={{
                            fontSize: { xs: '2.5rem', md: '4.5rem' },
                            // Layered grey "ghost echo" behind the heading —
                            // reads like a printed music poster.
                            textShadow:
                                '6px 6px 0 rgba(0, 0, 0, 0.10), 14px 14px 0 rgba(0, 0, 0, 0.05)',
                            ...HOVER_TO_GREEN,
                        }}
                    >
                        Welcome to Spotlight!
                    </Typography>

                    <Typography variant="h6" sx={HOVER_TO_GREEN}>
                        A Karaoke Application Using Spotify API
                    </Typography>

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
                            mt: 1,
                            '&:hover': { boxShadow: 'none' },
                        }}
                    >
                        Login with Spotify
                    </Button>
                </Stack>

                {/* Right column: Spotify mark on a rotating album wheel. */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',  // anchor for the absolutely-positioned wheel
                        minHeight: 380,         // give the wheel room
                    }}
                >
                    <AlbumWheel size={340} tileSize={56} count={10} />
                    <Box sx={{ ...HOVER_TO_GREEN, position: 'relative', zIndex: 1 }}>
                        <SpotifyLogo size={140} />
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}
