/**
 * Pages/Login.jsx
 * Anonymous landing route. The actual layout lives in Components/LoginHero.jsx;
 * this file just routes the unauthenticated user to it.
 */

import LoginHero from '../Components/LoginHero';

export default function Login() {
    return <LoginHero />;
}
