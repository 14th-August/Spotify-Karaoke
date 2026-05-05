import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Avatar, Typography, CircularProgress, Stack } from '@mui/material';
import { getCurrentUser } from '../Api/spotify';
import { getToken } from '../Authorization/tokenStorage';

export default function Profile() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = getToken();
        if (!token) return;

        getCurrentUser(token)
            .then(setUser)
            .catch(err => console.error("Profile fetch failed:", err));
    }, []);

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
