/**
 * theme.js
 * Spotify-flavored MUI theme. Wired up in main.jsx via <ThemeProvider>,
 * so any component can pull from this palette using:
 *   - the `sx` prop:    sx={{ color: 'primary.main' }}
 *   - or the hook:      const theme = useTheme()
 *
 * Typography goes for a music-poster feel:
 *   - Bebas Neue (condensed all-caps display) on h1/h2/h3 — concert-poster
 *     energy, the kind of type you see on album covers and venue marquees.
 *   - Outfit (modern geometric sans) for body, buttons, smaller headings —
 *     clean, contemporary, complements Bebas's condensed feel.
 *   - Buttons keep their original casing (no automatic uppercase).
 *
 * Fonts are loaded via Google Fonts in index.css.
 */

import { createTheme } from '@mui/material/styles';

const DISPLAY_FONT_STACK =
    '"Fredoka", "Nunito", "Quicksand", -apple-system, BlinkMacSystemFont, sans-serif';
const BODY_FONT_STACK =
    '"Outfit", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

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
        // Default for everything (body, buttons, h5, h6).
        fontFamily: BODY_FONT_STACK,
        // Display headings — Fredoka has multiple weights; use 700 for
        // strong display presence. Slight negative tracking pulls the
        // rounded glyphs together for a tighter heading feel.
        h1: { fontFamily: DISPLAY_FONT_STACK, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.05 },
        h2: { fontFamily: DISPLAY_FONT_STACK, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.08 },
        h3: { fontFamily: DISPLAY_FONT_STACK, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1 },
        h4: { fontWeight: 600, letterSpacing: '-0.015em' },
        h5: { fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontWeight: 500, letterSpacing: '-0.005em' },
        body1: { letterSpacing: '-0.003em' },
        body2: { letterSpacing: '-0.003em' },
        button: {
            fontWeight: 600,
            letterSpacing: '0.01em',
            textTransform: 'none',  // keep button labels in their original case
        },
    },
});

export default theme;
