/**
 * themeMode.js
 * Context for the active light/dark mode + a toggle. Lives in its own
 * file so main.jsx can stay component-only (keeps Vite's react-refresh
 * fast-refresh happy).
 */

import { createContext } from 'react';

export const ThemeModeContext = createContext({
    mode: 'dark',
    toggle: () => {},
});
