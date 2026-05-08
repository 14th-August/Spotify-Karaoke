/**
 * Components/ThemeToggle.jsx
 * Fixed-position icon button in the top-right that flips light/dark mode.
 * Reads + writes the mode via the ThemeModeContext defined in main.jsx,
 * so the toggle is the single user-facing knob for theme switching.
 *
 * Mounted once in App.jsx so it's visible on every route (Login,
 * Callback, Profile).
 */

import { useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { ThemeModeContext } from '../themeMode';

export default function ThemeToggle() {
    const { mode, toggle } = useContext(ThemeModeContext);
    const isDark = mode === 'dark';
    const nextLabel = isDark ? 'light' : 'dark';

    return (
        <Tooltip title={`Switch to ${nextLabel} mode`} arrow>
            <IconButton
                onClick={toggle}
                aria-label={`Switch to ${nextLabel} mode`}
                sx={{
                    position: 'fixed',
                    top: 16,
                    right: 16,
                    zIndex: 1000,
                    color: 'text.primary',
                    backgroundColor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
                    '&:hover': {
                        backgroundColor: 'background.paper',
                        color: 'primary.main',
                    },
                }}
            >
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
}
