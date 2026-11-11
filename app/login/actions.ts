"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string };

/** Sign in with email and password. Errors are surfaced verbatim but never leak whether an account exists. */
export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Those credentials did not work. Check the email and password." };

  const next = String(form.get("next") ?? "/dashboard");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

/** Create an account. Confirmation is disabled on this project, so the session is live immediately. */
export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const fullName = String(form.get("full_name") ?? "").trim();

  if (!email.includes("@")) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || null } },
  });
  if (error) return { error: error.message };

  redirect("/onboarding");
}
