import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Avatar, Typography, CircularProgress, Stack, Alert } from '@mui/material';
import { getCurrentUser } from '../Api/spotify';
import { getToken, clearToken } from '../Authorization/tokenStorage';

export default function Profile() {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

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
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
