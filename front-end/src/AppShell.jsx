/**
 * AppShell.jsx
 * Owns the light/dark mode state + theme creation + provider tree.
 * Mounted as the root of the React tree from main.jsx. Mode persists in
 * localStorage so the user's choice survives page reloads.
 *
 * Components reach the toggle via ThemeModeContext (themeMode.js). The
 * ThemeToggle component (mounted in App.jsx) consumes it and flips
 * between modes when clicked.
 */

import { useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import { makeTheme } from './theme';
import { ThemeModeContext } from './themeMode';

const STORAGE_KEY = 'theme_mode';

export default function AppShell() {
    const [mode, setMode] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : 'dark';
    });

    // Recreate the theme only when mode changes — avoids re-creating the
    // cached MUI theme object on every render.
    const theme = useMemo(() => makeTheme(mode), [mode]);

    const ctx = useMemo(
        () => ({
            mode,
            toggle: () => {
                setMode((prev) => {
                    const next = prev === 'dark' ? 'light' : 'dark';
                    localStorage.setItem(STORAGE_KEY, next);
                    return next;
                });
            },
        }),
        [mode],
    );

    return (
        <ThemeModeContext.Provider value={ctx}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}
