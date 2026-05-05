import { useEffect, useRef } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { exchangeCodeForToken } from '../Api/spotify';
import { setToken } from '../Authorization/tokenStorage';

export default function Callback() {
    const fetchedRef = useRef(false); // Create a lockout switch

    useEffect(() => {
        // If we've already tried to fetch, don't do it again!
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        console.log("🏃 Callback logic started (Only once!)");

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const returnedState = urlParams.get('state');
        const oauthError = urlParams.get('error');
        const verifier = localStorage.getItem('code_verifier');
        const expectedState = localStorage.getItem('oauth_state');

        // One-shot values: clear on every terminal branch so a stale verifier/state can't be replayed.
        const cleanup = () => {
            localStorage.removeItem('code_verifier');
            localStorage.removeItem('oauth_state');
        };

        if (oauthError) {
            console.error("❌ Spotify auth error:", oauthError);
            cleanup();
            return;
        }

        if (!returnedState || returnedState !== expectedState) {
            console.error("❌ OAuth state mismatch — aborting token exchange.");
            cleanup();
            return;
        }

        if (!code || !verifier) {
            cleanup();
            return;
        }

        exchangeCodeForToken(code, verifier)
            .then(data => {
                if (data.access_token) {
                    setToken(data.access_token);
                    cleanup();
                    // Go home after success
                    window.location.href = '/';
                } else {
                    console.error("❌ Trade failed:", data);
                    cleanup();
                }
            })
            .catch(err => {
                console.error("📡 Network Error:", err);
                cleanup();
            });
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stack spacing={2} alignItems="center">
                <CircularProgress />
                <Typography>Checking your credentials...</Typography>
            </Stack>
        </Box>
    );
}
