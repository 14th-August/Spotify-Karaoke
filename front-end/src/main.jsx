/**
 * main.jsx
 * Mounts the React app into #root. Wraps everything in MUI's ThemeProvider
 * so any component can pull from the shared theme via the sx prop or hooks.
 * CssBaseline normalizes browser defaults (margins, font smoothing, dark bg).
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
