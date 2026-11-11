"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = {};

function AuthForm() {
  const params = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const next = params.get("next") ?? "/dashboard";
  const [state, action, pending] = useActionState(mode === "signup" ? signUp : signIn, initial);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet to-electric" />
        <Link href="/" className="font-semibold tracking-tight">GrowthPilot AI</Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "signup" ? "Create your workspace" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {mode === "signup"
          ? "One account, one workspace, your business data isolated by row-level security."
          : "Your dashboard, business profile and roadmap are waiting."}
      </p>

      <form action={action} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "signup" && (
          <label className="block">
            <span className="label">Full name</span>
            <input name="full_name" className="mt-2" placeholder="Muhammad Abu-Bakar" autoComplete="name" />
          </label>
        )}
        <label className="block">
          <span className="label">Work email</span>
          <input name="email" type="email" required className="mt-2" placeholder="you@company.com" autoComplete="email" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="mt-2"
            placeholder={mode === "signup" ? "at least 8 characters" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>

        {state.error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
          {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {mode === "signup" ? (
          <>Already have an account? <Link href="/login" className="text-ink underline decoration-line underline-offset-4">Sign in</Link></>
        ) : (
          <>No account yet? <Link href="/login?mode=signup" className="text-ink underline decoration-line underline-offset-4">Create one</Link></>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
