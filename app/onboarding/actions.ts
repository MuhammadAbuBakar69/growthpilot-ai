"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

/**
 * Creates the tenant in one database call.
 *
 * The SQL function create_workspace() writes the organization, the owner membership and the business
 * profile inside one transaction. Doing it from the client would need three round trips with a window
 * where a user can end up owning nothing.
 */
export async function createWorkspace(_prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const businessName = String(form.get("business_name") ?? "").trim();
  if (businessName.length < 2) return { error: "Tell us the business name so the analysis has a subject." };

  const challenges = String(form.get("challenges") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase.rpc("create_workspace", {
    p_business_name: businessName,
    p_website_url: String(form.get("website_url") ?? ""),
    p_industry: String(form.get("industry") ?? ""),
    p_description: String(form.get("description") ?? ""),
    p_target_audience: String(form.get("target_audience") ?? ""),
    p_challenges: challenges,
    p_org_name: String(form.get("org_name") ?? ""),
  });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
