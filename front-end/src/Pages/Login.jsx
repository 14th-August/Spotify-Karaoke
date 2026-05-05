import { Container, Stack, Typography, Button } from '@mui/material';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import { useSpotifyAuth } from '../Authorization/useSpotifyAuth';

export default function Login() {
    const { login } = useSpotifyAuth();
    return (
        <Container
            maxWidth="sm"
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Stack spacing={4} alignItems="center" textAlign="center">
                <Typography variant="h3" component="h1">Karaoke App</Typography>
                <Typography variant="body1" color="text.secondary">
                    Sign in with Spotify to start singing.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    color="primary"
                    onClick={login}
                    startIcon={<LibraryMusicIcon />}
                >
                    Login with Spotify
                </Button>
            </Stack>
        </Container>
    );
}
