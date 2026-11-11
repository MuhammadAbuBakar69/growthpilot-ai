import { NextResponse } from "next/server";

/**
 * Deployment health probe.
 *
 * Answers the two questions a fresh deploy raises: is this build configured, and can it reach the
 * database. It reports booleans and a status only - never a key, a host with credentials, or an error
 * string that could leak internals.
 */
export const dynamic = "force-dynamic";

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

  let database: "reachable" | "unreachable" = "unreachable";
  try {
    const res = await fetch(`${url}/rest/v1/my_workspaces?select=org_id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    database = res.ok ? "reachable" : "unreachable";
  } catch {
    database = "unreachable";
  }

  const ok = database === "reachable";
  return NextResponse.json(
    { ok, configured: true, database, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { status: ok ? 200 : 503 },
  );
}
