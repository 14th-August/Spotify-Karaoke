import { useSpotifyAuth } from '../hooks/useSpotifyAuth';

export default function Login() {
    const { login } = useSpotifyAuth();
    return (
        <div style={{ padding: '50px' }}>
            <h1>Karaoke App</h1>
            <button type="button" onClick={login}>Login with Spotify</button>
        </div>
    );
}