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
import Search from './Pages/Search';
import ThemeToggle from './Components/ThemeToggle';
import SideNav from './Components/SideNav';
import NowPlayingBar from './Components/NowPlayingBar';
import PlayerProvider from './Player/PlayerProvider';
import { getToken } from './Authorization/tokenStorage';

function App() {
  const path = window.location.pathname;
  const hasToken = getToken();

  // 1. The Spotify redirect always lands on /auth/callback — handle it first
  //    regardless of token state (the page itself sets the token). No nav.
  if (path.includes('/auth/callback')) {
    return (
      <>
        <ThemeToggle />
        <Callback />
      </>
    );
  }

  // 2. No token → login screen. Theme toggle stays in the corner since
  //    there's no sidebar to host it.
  if (!hasToken) {
    return (
      <>
        <ThemeToggle />
        <Login />
      </>
    );
  }

  // 3. Logged in → pick a page based on path, wrap it in SideNav. The
  //    sidebar provides the theme toggle + logout, so no fixed-corner
  //    ThemeToggle here.
  let page;
  if (path.startsWith('/search')) {
    page = <Search />;
  } else {
    page = <Profile />;
  }

  // PlayerProvider initializes the Spotify Web Playback SDK and exposes
  // playback state/controls via PlayerContext. Anonymous routes don't
  // wrap in it (no token to feed the SDK with). NowPlayingBar is a
  // sibling of SideNav so it persists across page navigations and is
  // self-hidden until a track plays.
  return (
    <PlayerProvider>
      <SideNav>{page}</SideNav>
      <NowPlayingBar />
    </PlayerProvider>
  );
}

export default App;