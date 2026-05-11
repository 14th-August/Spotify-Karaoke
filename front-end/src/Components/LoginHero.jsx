/**
 * Components/LoginHero.jsx
 * Asymmetric two-column login. Left column stacks the welcome heading,
 * subtitle, and login button; right column holds the Spotify mark on a
 * slowly-spinning ring of real album covers (fetched from iTunes' free
 * search API on first load, cached in localStorage thereafter).
 *
 * Theme-aware: text and background follow the active light/dark palette,
 * only the Spotify-green hover stays constant.
 *
 * On mobile (<900px) the layout collapses to a single centered column.
 *
 * Auth flow unchanged: useSpotifyAuth.login() kicks off PKCE; the
 * redirect-back is handled by Pages/Callback.jsx.
 */

import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

const SPOTIFY_GREEN = '#1DB954';
const COVER_CACHE_KEY = 'album_covers_v1';

// Iconic albums whose covers populate the wheel before the user logs in.
// Once authenticated, the wheel could be re-populated with the user's
// own recently-played / top albums via the Spotify API (future work).
const POPULAR_ALBUMS = [
    'Random Access Memories Daft Punk',
    'Dark Side of the Moon Pink Floyd',
    'Nevermind Nirvana',
    'Thriller Michael Jackson',
    'Abbey Road Beatles',
    'After Hours The Weeknd',
    'Blonde Frank Ocean',
    'Currents Tame Impala',
    'Lemonade Beyonce',
    'OK Computer Radiohead',
];

// Fallback shown while the iTunes lookup is in flight (or if it fails
// outright). Stable Picsum seeds so first paint isn't empty.
const FALLBACK_COVERS = POPULAR_ALBUMS.map(
    (_, i) => `https://picsum.photos/seed/spotlight-${i}/300/300`
);

// Hit the free iTunes Search API for each album title, return the
// 300×300 cover URLs (upscaled from the 100×100 default by string swap).
// Returns null in any per-item slot that errors so the caller can
// decide whether to keep the partial result or fall back wholesale.
async function fetchAlbumCovers() {
    return Promise.all(
        POPULAR_ALBUMS.map(async (term) => {
            try {
                const r = await fetch(
                    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=album&limit=1`,
                );
                if (!r.ok) return null;
                const data = await r.json();
                const art = data.results?.[0]?.artworkUrl100;
                // Bump 100x100bb.jpg → 300x300bb.jpg by URL substitution.
                return art ? art.replace('100x100bb', '300x300bb') : null;
            } catch {
                return null;
            }
        }),
    );
}

// Hook: returns the current set of album cover URLs. Synchronous on
// repeat visits (reads localStorage cache); async on first visit.
function useAlbumCovers() {
    const initial = useMemo(() => {
        try {
            const cached = JSON.parse(localStorage.getItem(COVER_CACHE_KEY) || 'null');
            if (Array.isArray(cached) && cached.length === POPULAR_ALBUMS.length) {
                return cached;
            }
        } catch {
            // ignore parse errors and fall through
        }
        return FALLBACK_COVERS;
    }, []);

    const [covers, setCovers] = useState(initial);

    useEffect(() => {
        // Skip the API call if we already have a complete cache.
        if (localStorage.getItem(COVER_CACHE_KEY)) return;
        let cancelled = false;
        fetchAlbumCovers().then((urls) => {
            if (cancelled) return;
            if (urls.every(Boolean)) {
                localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(urls));
                setCovers(urls);
            }
            // Otherwise leave the fallbacks in place — iTunes is missing
            // at least one and we don't want a half-real, half-Picsum mix.
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return covers;
}

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

// Rotating ring of cover tiles. Each tile is placed on a circle of
// radius `size/2` using the standard "rotate-translate-counter-rotate"
// transform pattern. The whole ring spins via @keyframes on the wrapper.
// Skip the spin entirely under prefers-reduced-motion.
function AlbumWheel({ covers, size = 340, tileSize = 56 }) {
    const radius = size / 2;
    const count = covers.length;
    const tiles = covers.map((imageUrl, i) => ({
        angle: (i / count) * 360,
        imageUrl,
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

// Theme-aware: resting color follows text.primary so it inverts cleanly
// between light and dark modes; hover always shifts to Spotify green.
const HOVER_TO_GREEN = {
    color: 'text.primary',
    transition: 'color 200ms ease',
    '& svg': { fill: 'currentColor' },
    '&:hover': { color: SPOTIFY_GREEN },
};

export default function LoginHero() {
    const { login } = useSpotifyAuth();
    const covers = useAlbumCovers();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
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
                        sx={(theme) => ({
                            fontSize: { xs: '2.5rem', md: '4.5rem' },
                            color: 'text.primary',
                            transition: 'color 200ms ease',
                            '&:hover': { color: SPOTIFY_GREEN },
                            // Layered ghost-echo behind the heading. Inverts
                            // between modes so it's always faint-but-visible
                            // against the page background.
                            textShadow:
                                theme.palette.mode === 'dark'
                                    ? '6px 6px 0 rgba(255, 255, 255, 0.10), 14px 14px 0 rgba(255, 255, 255, 0.05)'
                                    : '6px 6px 0 rgba(0, 0, 0, 0.10), 14px 14px 0 rgba(0, 0, 0, 0.05)',
                        })}
                    >
                        Welcome to Spotlight!
                    </Typography>

                    <Typography variant="h6" sx={HOVER_TO_GREEN}>
                        Sing your favorite spotify songs like it's Karaoke night!
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
                    <AlbumWheel covers={covers} size={340} tileSize={56} />
                    <Box sx={{ ...HOVER_TO_GREEN, position: 'relative', zIndex: 1 }}>
                        <SpotifyLogo size={140} />
                    </Box>
                </Box>
            </Stack>
        </Box>
    );
}
