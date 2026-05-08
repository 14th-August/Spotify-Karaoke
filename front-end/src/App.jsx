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
import ThemeToggle from './Components/ThemeToggle';
import { getToken } from './Authorization/tokenStorage';

function App() {
  const path = window.location.pathname;
  const hasToken = getToken();

  // Pick the page first, then render with the always-on ThemeToggle.
  let page;
  // 1. The Spotify redirect always lands on /auth/callback — handle it first
  //    regardless of token state (the page itself sets the token).
  if (path.includes('/auth/callback')) {
    page = <Callback />;
  }
  // 2. Logged in → show the profile card.
  else if (hasToken) {
    page = <Profile />;
  }
  // 3. No token → show the login screen.
  else {
    page = <Login />;
  }

  return (
    <>
      <ThemeToggle />
      {page}
    </>
  );
}

export default App;