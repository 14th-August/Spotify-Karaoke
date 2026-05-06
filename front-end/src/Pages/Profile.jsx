/**
 * Pages/Profile.jsx
 * Logged-in landing view. Fetches the user's Spotify profile via
 * Api/spotify.js#getCurrentUser and renders an MUI card with their
 * avatar, name, and email.
 *
 * Failure modes:
 *   - 401 → token expired or revoked. Spotify access tokens last about
 *     an hour and we don't have a refresh flow yet, so we clear the
 *     stored token and bounce home. App.jsx then routes to Login and
 *     the user signs in fresh.
 *   - other errors → render an MUI Alert. We don't know the cause, but
 *     stuck-on-spinner-forever is a worse UX than a clear error.
 *   - missing token (shouldn't happen — App.jsx gates on it) → bounce
 *     home as belt-and-suspenders.
 */

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Avatar, Typography, CircularProgress, Stack, Alert, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { getCurrentUser } from '../Api/spotify';
import { getToken, clearToken } from '../Authorization/tokenStorage';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    // Wipe the token and bounce home — App.jsx will then route to Login.
    // Note: this only logs us out *locally*; the user stays signed in to
    // Spotify itself, so the next login skips Spotify's consent screen.
    const handleLogout = () => {
        clearToken();
        window.location.href = '/';
    };

    useEffect(() => {
        const token = getToken();
        if (!token) {
            // Belt-and-suspenders — App.jsx already gates on this, but if we got here without one, bounce home.
            window.location.href = '/';
            return;
        }

        getCurrentUser(token)
            .then(setUser)
            .catch(err => {
                if (err.status === 401) {
                    // Token expired or revoked — Spotify access tokens live ~1 hour and we don't refresh yet.
                    clearToken();
                    window.location.href = '/';
                    return;
                }
                console.error("Profile fetch failed:", err);
                setError(err.message || 'Failed to load profile.');
            });
    }, []);

    if (error) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Alert severity="error" sx={{ maxWidth: 400 }}>{error}</Alert>
            </Box>
        );
    }

    if (!user) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stack spacing={2} alignItems="center">
                    <CircularProgress />
                    <Typography>Loading your Spotify profile...</Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Card sx={{ maxWidth: 400, width: '100%' }}>
                <CardContent>
                    <Stack spacing={2} alignItems="center" textAlign="center">
                        <Avatar
                            src={user.images?.[0]?.url}
                            alt={user.display_name}
                            sx={{ width: 96, height: 96, border: 2, borderColor: 'primary.main' }}
                        />
                        <Typography variant="h5">Welcome, {user.display_name}!</Typography>
                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleLogout}
                            startIcon={<LogoutIcon />}
                            sx={{ mt: 1 }}
                        >
                            Log out
                        </Button>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
