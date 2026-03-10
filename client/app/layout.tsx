import { AuthProvider } from "./Providers"; // Adjust path if you put it in /components

export const metadata = {
  title: "My Spotify App",
  description: "Authenticating with NextAuth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Wrap your entire application in the new client-side provider */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}