#!/usr/bin/env bash
# One-command Vercel deploy. Requires VERCEL_TOKEN (vercel.com/account/tokens) in the environment.
# Creates or reuses the project, sets the two public Supabase variables for production and preview,
# deploys, and prints the production URL. Idempotent: safe to run again after a change.
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is not set}"
: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is not set}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?NEXT_PUBLIC_SUPABASE_ANON_KEY is not set}"

PROJECT="${VERCEL_PROJECT:-growthpilot-ai}"

npx --yes vercel@latest link --yes --project "$PROJECT" --token "$VERCEL_TOKEN" >/dev/null

for target in production preview; do
  printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | npx --yes vercel@latest env add NEXT_PUBLIC_SUPABASE_URL "$target" --token "$VERCEL_TOKEN" --force >/dev/null
  printf '%s' "$NEXT_PUBLIC_SUPABASE_ANON_KEY" | npx --yes vercel@latest env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$target" --token "$VERCEL_TOKEN" --force >/dev/null
done

URL=$(npx --yes vercel@latest deploy --prod --yes --token "$VERCEL_TOKEN" | tail -n 1)
echo "$URL"
curl -fsS --max-time 30 "$URL/api/health" && echo
