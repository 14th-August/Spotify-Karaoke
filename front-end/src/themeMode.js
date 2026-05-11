/**
 * themeMode.js
 * Context for the active light/dark mode + a toggle. Lives in its own
 * file so main.jsx can stay component-only 
 */

import { createContext } from 'react';

export const ThemeModeContext = createContext({
    mode: 'dark',
    toggle: () => {},
});
