/**
 * theme.js
 * Spotify-flavored MUI theme. Wired up in main.jsx via <ThemeProvider>,
 * so any component can pull from this palette using:
 *   - the `sx` prop:    sx={{ color: 'primary.main' }}
 *   - or the hook:      const theme = useTheme()
 *
 * Keeping the theme in one file means a redesign is a single-file change
 * rather than touching every component.
 */

import { createTheme } from '@mui/material/styles';

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
    shape: { borderRadius: 8 },
    typography: {
        fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
        h3: { fontWeight: 700 },
        h5: { fontWeight: 600 },
    },
});

export default theme;
