/**
 * main.jsx
 * Mounts <App /> into #root and wraps everything in MUI's ThemeProvider
 * + CssBaseline. The provider makes the palette from theme.js available
 * to every descendant; CssBaseline normalizes browser defaults (margins,
 * font smoothing, dark background).
 */

import ReactDOM from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import theme from './theme';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
    </ThemeProvider>
);
