/**
 * useSpotifyAuth.js
 * The PKCE login flow as a React hook.
 *
 * PKCE (Proof Key for Code Exchange) lets a public client — a browser app
 * with no secrets it can keep — do OAuth securely. The trick:
 *   1. We invent a long random "verifier" and stash it in localStorage.
 *   2. We hash it (SHA-256) into a "challenge" and send the challenge to
 *      Spotify when starting login.
 *   3. Spotify redirects back with an auth code. In Callback.jsx we trade
 *      the code + the original verifier for an access token. Because only
 *      we know the verifier, an attacker who steals the auth code in
 *      transit can't trade it.
 *
 * `state` is a separate random nonce sent on the way out and echoed back
 * on the way in. It protects against CSRF: if the value coming back
 * doesn't match what we stored, we refuse the token exchange.
 */

export const useSpotifyAuth = () => {

    // Hash a string with SHA-256 (the "Math" Spotify wants for the challenge).
    const sha256 = async (plain) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    };

    // Convert the SHA-256 byte array into URL-safe base64 (no padding, +/ → -_).
    const base64encode = (input) => {
        return btoa(String.fromCharCode(...new Uint8Array(input)))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };

    // Cryptographically-random alphanumeric string of `length` chars.
    // Used for both the PKCE verifier (64) and the CSRF state nonce (32).
    const generateRandomString = (length) => {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], "");
    };

    // Kick off login. Generates verifier + state, stashes them, hashes the
    // verifier into the S256 challenge, then redirects to Spotify's authorize
    // page. The continuation lives in Callback.jsx.
    const login = async () => {
        // Create a SECURE 64-character secret word
        const verifier = generateRandomString(64);

        // Save it to the "pocket" immediately
        localStorage.setItem('code_verifier', verifier);

        // CSRF state: random nonce echoed back by Spotify and validated in Callback.jsx
        const state = generateRandomString(32);
        localStorage.setItem('oauth_state', state);

        // Hash it for S256
        const hashed = await sha256(verifier);
        const codeChallenge = base64encode(hashed);

        const params = new URLSearchParams({
            client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
            state: state,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            // streaming + playback-state scopes are required for the Web
            // Playback SDK (full-track playback in the browser). After this
            // line changes, users must log out + log back in for Spotify
            // to re-prompt and grant the new permissions.
            scope: 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state'
        });

        // Redirect to Spotify
        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    return { login };
};
