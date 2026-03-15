import { useEffect, useRef } from 'react'; // Add useRef

export default function Callback() {
    const fetchedRef = useRef(false); // Create a lockout switch

    useEffect(() => {
        // If we've already tried to fetch, don't do it again!
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        console.log("🏃 Callback logic started (Only once!)");
        
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const verifier = localStorage.getItem('code_verifier');

        if (code && verifier) {
            fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
                    code_verifier: verifier,
                }),
            })
            .then(res => res.json())
            .then(data => {
                if (data.access_token) {
                    console.log("🎉 SUCCESS! Token:", data.access_token);
                    localStorage.setItem('spotify_token', data.access_token);
                    // Go home after success
                    window.location.href = '/';
                } else {
                    console.error("❌ Trade failed:", data);
                }
            })
            .catch(err => console.error("📡 Network Error:", err));
        }
    }, []);

    return <h1>Checking your credentials...</h1>;
}