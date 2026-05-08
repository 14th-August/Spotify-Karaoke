/**
 * Components/SideNav.jsx
 * Hover-to-expand sidebar for logged-in routes. At rest it's a 64px
 * icon rail; on hover (or focus) it slides out to 240px to reveal
 * labels and group headings. On mobile (<900px) the rail hides and
 * a hamburger icon top-left opens an MUI Drawer with the same content.
 *
 * The whole thing is a single component that wraps page content:
 *   <SideNav><Profile /></SideNav>
 *
 * Placeholder UX for unbuilt features: clicking any nav item shows a
 * "Coming soon" Snackbar at the bottom. Logout actually clears the
 * token and bounces home; the theme toggle flips light/dark via the
 * existing ThemeModeContext.
 */

import { useContext, useEffect, useState } from 'react';
import {
    Avatar,
    Box,
    Divider,
    Drawer,
    IconButton,
    Snackbar,
    Stack,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AlbumIcon from '@mui/icons-material/Album';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import MicIcon from '@mui/icons-material/Mic';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MenuIcon from '@mui/icons-material/Menu';

import { ThemeModeContext } from '../themeMode';
import { getToken, clearToken } from '../Authorization/tokenStorage';
import { getCurrentUser } from '../Api/spotify';

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 240;

// Three groups: LIBRARY (search/browse), COMPETE (social/score),
// TUNE (audio setup). Group labels show only when the sidebar is
// expanded (or always, in the mobile drawer). Items with a `route`
// navigate; items without one show a "Coming soon" Snackbar.
const NAV_GROUPS = [
    {
        label: 'LIBRARY',
        items: [
            { id: 'search', label: 'Search Song', icon: <SearchIcon fontSize="small" />, route: '/search' },
            { id: 'albums', label: 'Select Album', icon: <AlbumIcon fontSize="small" /> },
        ],
    },
    {
        label: 'COMPETE',
        items: [
            { id: 'leaderboard', label: 'Leaderboard', icon: <EmojiEventsIcon fontSize="small" /> },
            { id: 'versus', label: 'Versus a Friend', icon: <SportsKabaddiIcon fontSize="small" /> },
        ],
    },
    {
        label: 'TUNE',
        items: [
            { id: 'mic-test', label: 'Test Mic', icon: <MicIcon fontSize="small" /> },
        ],
    },
];

// Single nav row. Icon stays anchored to the left at the rail's edge;
// label sits to its right and is clipped by the parent's overflow when
// the sidebar is collapsed. data-nav-label coordinates label opacity
// via the parent's hover state (set on the desktop sidebar Box).
function NavItem({ icon, label, onClick }) {
    return (
        <Box
            component="button"
            type="button"
            onClick={onClick}
            sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: 2,
                px: 2.25,
                py: 1.25,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'text.primary',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                fontWeight: 500,
                textAlign: 'left',
                transition: 'background 150ms ease, color 150ms ease',
                '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                },
                '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                },
            }}
        >
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {icon}
            </Box>
            <Box
                component="span"
                data-nav-label
                sx={{ whiteSpace: 'nowrap' }}
            >
                {label}
            </Box>
        </Box>
    );
}

// Small uppercase group heading. Hidden when collapsed (parent rule
// matches data-nav-label and fades these in on hover too).
function GroupLabel({ children }) {
    return (
        <Typography
            data-nav-label
            sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                px: 2.25,
                pt: 2,
                pb: 0.5,
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </Typography>
    );
}

export default function SideNav({ children }) {
    const { mode, toggle: toggleMode } = useContext(ThemeModeContext);
    const [toastMsg, setToastMsg] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [user, setUser] = useState(null);

    // Fetch the linked Spotify profile for the brand avatar. Same /me
    // endpoint Profile.jsx hits — browsers usually serve the duplicate
    // request from cache. On any failure (including 401) we silently
    // keep the sparkle fallback; Profile.jsx will catch a real auth
    // problem and bounce home.
    useEffect(() => {
        const token = getToken();
        if (!token) return;
        let cancelled = false;
        getCurrentUser(token)
            .then((data) => {
                if (!cancelled) setUser(data);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    const handleNavClick = (item) => {
        setDrawerOpen(false);
        if (item.route) {
            window.location.assign(item.route);
            return;
        }
        setToastMsg(`${item.label} — coming soon`);
    };

    const handleLogout = () => {
        clearToken();
        window.location.assign('/');
    };

    const isDark = mode === 'dark';
    const avatarUrl = user?.images?.[0]?.url;

    // The shared nav body — same JSX in the desktop rail and the mobile drawer.
    const navContent = (
        <Stack sx={{ height: '100%', overflow: 'hidden' }}>
            {/* Brand row — Spotify avatar (or sparkle fallback) + display
                name (with the SPOTLIGHT brand as a small secondary line). */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    px: 2.25,
                    height: 64,
                    flexShrink: 0,
                }}
            >
                {avatarUrl ? (
                    <Avatar
                        src={avatarUrl}
                        alt={user?.display_name || 'Spotify avatar'}
                        sx={{
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            border: '2px solid',
                            borderColor: 'primary.main',
                        }}
                    />
                ) : (
                    <Box
                        aria-hidden
                        sx={{
                            flexShrink: 0,
                            color: 'primary.main',
                            fontSize: 22,
                            lineHeight: 1,
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ✦
                    </Box>
                )}
                <Box data-nav-label sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {user?.display_name || 'Welcome'}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: 'text.secondary',
                            letterSpacing: '0.08em',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        SPOTLIGHT
                    </Typography>
                </Box>
            </Box>

            <Divider />

            {/* Nav groups */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}>
                {NAV_GROUPS.map((group) => (
                    <Box key={group.label} sx={{ mb: 1 }}>
                        <GroupLabel>{group.label}</GroupLabel>
                        {group.items.map((item) => (
                            <NavItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                onClick={() => handleNavClick(item)}
                            />
                        ))}
                    </Box>
                ))}
            </Box>

            <Divider />

            {/* Theme toggle */}
            <NavItem
                icon={isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                label={isDark ? 'Light Mode' : 'Dark Mode'}
                onClick={toggleMode}
            />

            <Divider />

            {/* Account / Logout */}
            <NavItem
                icon={<LogoutIcon fontSize="small" />}
                label="Log Out"
                onClick={handleLogout}
            />
        </Stack>
    );

    return (
        <>
            {/* Mobile hamburger button (md down) */}
            <IconButton
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                sx={{
                    display: { xs: 'inline-flex', md: 'none' },
                    position: 'fixed',
                    top: 12,
                    left: 12,
                    zIndex: 1200,
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.10)',
                    '&:hover': { bgcolor: 'background.paper' },
                }}
            >
                <MenuIcon />
            </IconButton>

            {/* Mobile drawer (md down). Always-expanded width when open. */}
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{ display: { xs: 'block', md: 'none' } }}
                PaperProps={{ sx: { width: EXPANDED_WIDTH, bgcolor: 'background.paper' } }}
            >
                {navContent}
            </Drawer>

            {/* Desktop sidebar (md up). Hover-to-expand. */}
            <Box
                aria-label="Sidebar navigation"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: COLLAPSED_WIDTH,
                    bgcolor: 'background.paper',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    overflow: 'hidden',
                    transition: 'width 220ms ease',
                    zIndex: 100,
                    '&:hover, &:focus-within': { width: EXPANDED_WIDTH },
                    // Coordinate label opacity with the rail's expansion. The
                    // 60ms delay-on-fade-in feels nicer than synchronous —
                    // labels only "arrive" once the rail is most of the way out.
                    '& [data-nav-label]': {
                        opacity: 0,
                        transition: 'opacity 180ms ease 60ms',
                    },
                    '&:hover [data-nav-label], &:focus-within [data-nav-label]': {
                        opacity: 1,
                    },
                }}
            >
                {navContent}
            </Box>

            {/* Main page content. Shifts over by the rail's collapsed width
                on desktop so the sidebar's expansion overlays content rather
                than reflowing it. The 96px bottom padding ensures that the
                fixed NowPlayingBar (80px tall) doesn't cover the last row
                of any scrolling page. */}
            <Box
                sx={{
                    ml: { xs: 0, md: `${COLLAPSED_WIDTH}px` },
                    minHeight: '100vh',
                    pb: '96px',
                }}
            >
                {children}
            </Box>

            {/* Coming-soon toast for unbuilt features */}
            <Snackbar
                open={!!toastMsg}
                autoHideDuration={2200}
                onClose={() => setToastMsg(null)}
                message={toastMsg}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </>
    );
}
