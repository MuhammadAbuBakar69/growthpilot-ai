import { NextResponse } from "next/server";

/**
 * Deployment health probe.
 *
 * It must only probe what an anonymous request is *supposed* to reach. The first version queried
 * my_workspaces with the anon key and reported the database unreachable, which was wrong: tenant views
 * are revoked from anon by design, so a permission error there is the system working. PostgREST's root
 * schema document and GoTrue's health endpoint answer honestly instead.
 */
export const dynamic = "force-dynamic";

type Probe = "reachable" | "unreachable";

async function probe(url: string, key: string): Promise<Probe> {
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? "reachable" : "unreachable";
  } catch {
    return "unreachable";
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
    probe(`${url}/rest/v1/`, anon),
    probe(`${url}/auth/v1/health`, anon),
  ]);
  const ok = rest === "reachable" && auth === "reachable";

  return NextResponse.json(
    {
      ok,
      configured: true,
      postgrest: rest,
      auth,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { status: ok ? 200 : 503 },
  );
}
