import { createTheme } from '@mui/material/styles';

// Spotify-flavored dark theme. Primary green is Spotify's brand color.
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#1DB954' },
        background: {
            default: '#121212',
            paper: '#181818',
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
