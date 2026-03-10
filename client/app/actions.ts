"use server"

import { signIn } from "@/auth";

export async function handleLogin() {
  // We force the redirect to the IP address here
  await signIn("spotify", { redirectTo: "http://127.0.0.1:3000/dashboard" });
}