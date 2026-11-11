import { NextResponse } from "next/server";

/**
 * Deployment health probe.
 *
 * A health check must only assert what is true for an anonymous request. Two wrong versions came
 * before this one: the first queried the tenant view with the anon key, the second the PostgREST root
 * document. Both are refused for anonymous callers on a correctly locked-down project, so both
 * reported "unreachable" on a healthy deployment.
 *
 * PostgREST answering 401 to an anon key is the system working, not a fault. Reachability is therefore
 * "the request got an HTTP response below 500", and the auth service is checked separately.
 */
export const dynamic = "force-dynamic";

async function status(url: string, key: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    return res.status;
  } catch {
    return null;
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        missing: [
          ...(url ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
          ...(anon ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
        ],
        hint: "Set these in Vercel -> Settings -> Environment Variables, then redeploy.",
      },
      { status: 503 },
    );
  }

  const [rest, auth] = await Promise.all([
    status(`${url}/rest/v1/`, anon),
    status(`${url}/auth/v1/health`, anon),
  ]);

  const postgrest = rest !== null && rest < 500 ? "up" : "down";
  const authService = auth !== null && auth < 500 ? "up" : "down";
  const ok = postgrest === "up" && authService === "up";

  // The project ref is part of every request URL anyway; reporting it turns "the app is talking to the
  // wrong database" from a guess into a one-line answer.
  let projectRef: string | null = null;
  try {
    projectRef = new URL(url).hostname.split(".")[0];
  } catch {
    projectRef = null;
  }

  return NextResponse.json(
    {
      ok,
      configured: true,
      projectRef,
      postgrest,
      auth: authService,
      // Surfacing the codes makes the next false negative diagnosable in one look.
      codes: { postgrest: rest, auth },
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { status: ok ? 200 : 503 },
  );
}
