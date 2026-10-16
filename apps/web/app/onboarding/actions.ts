"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@campustable/auth";
import { getAdminClient } from "@campustable/db";
import { confirmVerification, requestVerification } from "@/lib/verification";

const RoleInput = z.object({ role: z.enum(["student", "alumni", "faculty"]) });

/** Persist role selection; moves started → affiliation. Idempotent. */
export async function setRole(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = RoleInput.safeParse({ role: formData.get("role") });
  if (!parsed.success) redirect("/onboarding?error=E.INVALID_ROLE");
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("users")
    .update({
      role: parsed.data.role,
      onboarding_state: "affiliation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .in("onboarding_state", ["started", "affiliation"]);
  if (error) redirect("/onboarding?error=E.ROLE_SAVE_FAILED");
  redirect("/onboarding");
}

const AffiliationInput = z.object({
  universityName: z.string().trim().min(2).max(120),
  program: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  graduationMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

/** Alumni/faculty self-report; moves affiliation → profile. Idempotent. */
export async function saveAffiliation(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role === "student") redirect("/onboarding?error=E.WRONG_STEP");
  const parsed = AffiliationInput.safeParse({
    universityName: formData.get("universityName") ?? "",
    program: formData.get("program") ?? undefined,
    department: formData.get("department") ?? undefined,
    title: formData.get("title") ?? undefined,
    graduationMonth: formData.get("graduationMonth") ?? undefined,
  });
  if (!parsed.success) redirect("/onboarding?error=E.INVALID_AFFILIATION");
  if (parsed.data.graduationMonth) {
    const grad = `${parsed.data.graduationMonth}-01`;
    if (user.role === "alumni" && grad > new Date().toISOString().slice(0, 10)) {
      redirect("/onboarding?error=E.FUTURE_GRADUATION");
    }
  }
  const supabase = getAdminClient();
  const { data: uni } = await supabase
    .from("universities")
    .select("id")
    .eq("name", parsed.data.universityName)
    .single();  let universityId: string | null = uni?.id ?? null;
  if (!universityId) {
    const { data: created, error: uniError } = await supabase
      .from("universities")
      .insert({ name: parsed.data.universityName, review_status: "pending" })
      .select("id")
      .single();
    if (uniError || !created) redirect("/onboarding?error=E.UNIVERSITY_SAVE_FAILED");
    universityId = created.id;
  }
  const { error } = await supabase.from("university_affiliations").insert({
    user_id: user.id,
    university_id: universityId,
    role: user.role,
    mailbox_status: "unverified",
    review_status: user.role === "faculty" ? "pending" : "self_reported",
    degree_program: parsed.data.program || null,
    department: parsed.data.department || null,
    expected_graduation_month: parsed.data.graduationMonth
      ? `${parsed.data.graduationMonth}-01`
      : null,
  });
  if (error) redirect("/onboarding?error=E.AFFILIATION_SAVE_FAILED");
  const { error: stateError } = await supabase
    .from("users")
    .update({ onboarding_state: "profile", updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("onboarding_state", "affiliation");
  if (stateError) redirect("/onboarding?error=E.STATE_ADVANCE_FAILED");
  redirect("/onboarding");
}

const CodeRequestInput = z.object({ schoolEmail: z.string().email().max(254) });

/** Student: request school-mail OTP. Creates the pending affiliation row. */
export async function requestSchoolCode(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = CodeRequestInput.safeParse({ schoolEmail: formData.get("schoolEmail") });
  if (!parsed.success) redirect("/onboarding?error=E.INVALID_EMAIL");
  const result = await requestVerification(user.clerkUserId, parsed.data.schoolEmail);
  if (!result.ok) redirect(`/onboarding?error=${result.error}`);
  redirect("/onboarding?sent=1");
}

const CodeConfirmInput = z.object({
  schoolEmail: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

/** Student: confirm OTP → affiliation verified → profile step. */
export async function confirmSchoolCode(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = CodeConfirmInput.safeParse({
    schoolEmail: formData.get("schoolEmail"),
    code: formData.get("code"),
  });
  if (!parsed.success) redirect("/onboarding?error=E.INVALID_CODE");
  const result = await confirmVerification(
    user.clerkUserId,
    parsed.data.schoolEmail,
    parsed.data.code,
  );
  if (!result.ok) redirect(`/onboarding?error=${result.error}&sent=1`);
  redirect("/onboarding");
}

const ProfileInput = z.object({
  displayName: z.string().trim().min(1).max(80),
  bio: z.string().trim().max(2000).optional(),
});

/** Minimal profile → complete. Redirects to dashboard. */
export async function saveProfile(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = ProfileInput.safeParse({
    displayName: formData.get("displayName") ?? "",
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) redirect("/onboarding?error=E.INVALID_PROFILE");
  const supabase = getAdminClient();
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ?? "",
      completion_state: "complete",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (profileError) redirect("/onboarding?error=E.PROFILE_SAVE_FAILED");
  const { error: stateError } = await supabase
    .from("users")
    .update({ onboarding_state: "complete", updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .eq("onboarding_state", "profile");
  if (stateError) redirect("/onboarding?error=E.STATE_ADVANCE_FAILED");
  redirect("/dashboard");
}
