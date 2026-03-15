import Login from './pages/Login';
import Callback from './pages/Callback';
import Profile from './pages/Profile';

function App() {
  const path = window.location.pathname;
  const hasToken = localStorage.getItem('spotify_token');

  if (path.includes('/auth/callback')) {
    return <Callback />;
  }

  // If we have a token, show the Profile!
  if (hasToken) {
    return <Profile />;
  }

  return <Login />;
}

export default App;