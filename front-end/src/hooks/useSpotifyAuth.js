// front-end/src/hooks/useSpotifyAuth.js

export const useSpotifyAuth = () => {
    
    // 1. Helper to hash the secret (The "Math" Spotify wants)
    const sha256 = async (plain) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    };

    const base64encode = (input) => {
        return btoa(String.fromCharCode(...new Uint8Array(input)))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    // 2. NEW: Secure Random String Generator
    const generateRandomString = (length) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };

    const login = async () => {
        // Create a SECURE 64-character secret word
        const verifier = generateRandomString(64);
        
        // Save it to the "pocket" immediately
        localStorage.setItem('code_verifier', verifier);

        // Hash it for S256
        const hashed = await sha256(verifier);
        const codeChallenge = base64encode(hashed);

        const params = new URLSearchParams({
            client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            scope: 'user-read-private user-read-email'
        });

        // Redirect to Spotify
        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    return { login };
};