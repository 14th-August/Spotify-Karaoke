import { useEffect, useState } from 'react';
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
