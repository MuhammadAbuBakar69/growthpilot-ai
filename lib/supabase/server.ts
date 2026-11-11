import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieItem = { name: string; value: string; options?: CookieOptions };

/**
 * Request-scoped Supabase client that carries the user's JWT.
 *
 * Every query through this client is subject to row-level security: the tenant boundary is enforced
 * by Postgres against the caller's identity, not by anything this file decides.
 */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items: CookieItem[]) => {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render, where cookies are read-only. Middleware owns
            // the refresh in that case, so swallowing here is correct rather than lazy.
          }
        },
      },
    },
  );
}
