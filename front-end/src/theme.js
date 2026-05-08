/**
 * theme.js
 * Spotify-flavored MUI theme with a dialed.gg-inspired typography (Inter,
 * weight 500, tight tracking). Exports a `makeTheme(mode)` factory so the
 * app can switch between dark and light at runtime; `default` export is
 * the dark theme for back-compat in case anything imports it.
 *
 * Single font everywhere — same approach as dialed.gg, who use Suisse Intl
 * for everything (with Inter as fallback). We use Inter as primary since
 * Suisse Intl is paid commercial.
 *
 * Wired up in main.jsx via <ThemeProvider>; consumers reach the palette
 * via the `sx` prop or the `useTheme()` hook.
 */

import { createTheme } from '@mui/material/styles';

const FONT_STACK =
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';

export const makeTheme = (mode = 'dark') => createTheme({
    palette: {
        mode,
        // Spotify brand green — used for the primary CTA, hover accents, etc.
        primary: { main: '#1DB954' },
        ...(mode === 'dark'
            ? {
                  background: { default: '#121212', paper: '#181818' },
                  text: { primary: '#ffffff', secondary: '#b3b3b3' },
              }
            : {
                  background: { default: '#ffffff', paper: '#f5f5f7' },
                  text: { primary: '#000000', secondary: '#6e6e73' },
              }),
    },
    shape: { borderRadius: 12 },
    typography: {
        fontFamily: FONT_STACK,
        // Inter at 600 reads as a confident heading without feeling
        // shouty. Slight negative tracking (Apple/dialed/Linear-style)
        // pulls letters together for a tighter modern feel.
        h1: { fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.05 },
        h2: { fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.08 },
        h3: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 },
        h4: { fontWeight: 600, letterSpacing: '-0.015em' },
        h5: { fontWeight: 600, letterSpacing: '-0.01em' },
        h6: { fontWeight: 500, letterSpacing: '-0.005em' },
        body1: { fontWeight: 400, letterSpacing: '-0.005em' },
        body2: { fontWeight: 400, letterSpacing: '-0.005em' },
        button: {
            fontWeight: 500,
            letterSpacing: '-0.005em',
            textTransform: 'none',  // Apple/dialed-style: keep button labels in their original case
        },
    },
});

// Default export kept for back-compat. Prefer importing `makeTheme` and
// calling it with the active mode.
export default makeTheme('dark');
