/**
 * theme.js
 * Spotify-flavored MUI theme with Apple-style typography. Wired up in
 * main.jsx via <ThemeProvider>, so any component can pull from this
 * palette using:
 *   - the `sx` prop:    sx={{ color: 'primary.main' }}
 *   - or the hook:      const theme = useTheme()
 *
 * Typography choices follow Apple's marketing-site house style:
 *   - San Francisco font stack with cross-platform fallbacks.
 *   - Negative letter-spacing on headings (Apple's signature tracking).
 *   - Tight line-heights on big headings, comfortable on body.
 *   - Buttons keep their original casing (no automatic uppercase).
 *
 * Keeping the theme in one file means a redesign is a single-file change
 * rather than touching every component.
 */

import { createTheme } from '@mui/material/styles';

// Apple's San Francisco when available; high-quality fallbacks elsewhere.
const APPLE_FONT_STACK =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Segoe UI", Helvetica, Arial, sans-serif';

const theme = createTheme({
    palette: {
        mode: 'dark',
        // Spotify brand green — used for the primary CTA, avatar borders, etc.
        primary: { main: '#1DB954' },
        background: {
            default: '#121212',  // page background
            paper: '#181818',    // cards / surfaces
        },
    },
    shape: { borderRadius: 12 },
    typography: {
        fontFamily: APPLE_FONT_STACK,
        h1: { fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.07 },
        h2: { fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.1 },
        h3: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 },
        h4: { fontWeight: 600, letterSpacing: '-0.015em' },
        h5: { fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontWeight: 500, letterSpacing: '-0.005em' },
        body1: { letterSpacing: '-0.003em' },
        body2: { letterSpacing: '-0.003em' },
        button: {
            fontWeight: 500,
            letterSpacing: '-0.005em',
            textTransform: 'none',  // Apple-style: keep button labels in their original case
        },
    },
});

export default theme;
