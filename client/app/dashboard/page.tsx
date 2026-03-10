import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  // Security: If no session, send them back to login
  if (!session) {
    redirect("/");
  }

  return (
    <main className="container mt-5">
      <div className="card p-4 shadow">
        <h1>Music Festival Dashboard</h1>
        <p className="text-muted">Logged in as: <strong>{session.user?.name}</strong></p>
        
        <hr />
        
        <div className="alert alert-info">
          <h5>Spotify Token Active</h5>
          <p className="small text-truncate">Token: {session.accessToken}</p>
        </div>

        {/* This is a placeholder for your festival visualization */}
        <div className="mt-4 p-5 bg-light border rounded text-center">
          <h3>Festival Visualization Coming Soon</h3>
          <p>This is where we will plot your top artists using Plotly.</p>
        </div>
      </div>
    </main>
  );
}