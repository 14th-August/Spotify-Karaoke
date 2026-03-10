import { handleLogin } from "./actions";

export default function Home() {
  return (
    <main className="container mt-5 text-center">
      <h1>Music Festival Viz</h1>
      <p className="mb-4">Connect your Spotify to begin.</p>
      
      <form action={handleLogin}>
        <button type="submit" className="btn btn-success btn-lg">
          Login with Spotify
        </button>
      </form>
    </main>
  );
}