/**
 * main.jsx
 * Entry point. Mounts <AppShell /> into #root. AppShell owns the
 * theme state and provider tree; this file is intentionally thin so
 * Vite's react-refresh stays happy (fast refresh works best when
 * entry files don't define their own components).
 */

import ReactDOM from 'react-dom/client';
import AppShell from './AppShell';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<AppShell />);
