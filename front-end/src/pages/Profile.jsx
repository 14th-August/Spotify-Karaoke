// front-end/src/components/Profile.jsx
import { useEffect, useState } from 'react';

export default function Profile() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('spotify_token');

        if (token) {
            fetch('https://api.spotify.com/v1/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            .then(res => res.json())
            .then(data => setUser(data))
            .catch(err => console.error("Profile fetch failed:", err));
        }
    }, []);

    if (!user) return <p>Loading your Spotify profile...</p>;

    return (
        <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #1DB954', borderRadius: '10px' }}>
            <h2>Welcome, {user.display_name}!</h2>
            {user.images?.[0] && (
                <img 
                    src={user.images[0].url} 
                    alt="Profile" 
                    style={{ borderRadius: '50%', width: '100px' }} 
                />
            )}
            <p>Email: {user.email}</p>
        </div>
    );
}