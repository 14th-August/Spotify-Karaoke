/**
 * App.jsx
 * Main entry point of the React application. Determines which page to render based on authentication state and URL path.
 * If we have the toke, we load the profile. If not we load the login button page.
 * Will be loaded as soon as you open the app, and will decide which page to show based on the URL and whether you have a token stored.
 */

import Login from './Pages/Login';
import Callback from './Pages/Callback';
import Profile from './Pages/Profile';
import { getToken } from './Authorization/tokenStorage';

function App() {
  const path = window.location.pathname;
  const hasToken = getToken();

  if (path.includes('/auth/callback')) {
    return <Callback />;
  }

  if (hasToken) {
    return <Profile />;
  }

  return <Login />;
}

export default App;