/**
 * App.jsx
 * Top-level router (without React Router). On every render we look at the
 * URL and the stored access token, then pick exactly one page to show:
 *   - /auth/callback?... → Callback (handle Spotify's redirect back to us)
 *   - has a stored token → Profile (logged-in landing)
 *   - otherwise          → Login
 */

import Login from './Pages/Login';
import Callback from './Pages/Callback';
import Profile from './Pages/Profile';
import { getToken } from './Authorization/tokenStorage';

function App() {
  const path = window.location.pathname;
  const hasToken = getToken();

  // 1. The Spotify redirect always lands on /auth/callback — handle it first
  //    regardless of token state (the page itself sets the token).
  if (path.includes('/auth/callback')) {
    return <Callback />;
  }

  // 2. Logged in → show the profile card.
  if (hasToken) {
    return <Profile />;
  }

  // 3. No token → show the login screen.
  return <Login />;
}

export default App;