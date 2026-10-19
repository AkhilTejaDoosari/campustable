import { redirect } from "next/navigation";
import { getCurrentUser } from "@campustable/auth";
import { getOnboardingStep } from "@/lib/onboarding";
import {
  confirmSchoolCode,
  requestSchoolCode,
  saveAffiliation,
  saveProfile,
  setRole,
} from "./actions";

export const dynamic = "force-dynamic";

const ERROR_COPY: Record<string, string> = {
  "E.INVALID_ROLE": "Choose student, alumni, or faculty.",
  "E.ROLE_SAVE_FAILED": "Could not save your role. Try again.",
  "E.INVALID_AFFILIATION": "Check the affiliation fields and try again.",
  "E.FUTURE_GRADUATION": "Alumni graduation month cannot be in the future.",
  "E.UNIVERSITY_SAVE_FAILED": "Could not save the university. Try again.",
  "E.AFFILIATION_SAVE_FAILED": "Could not save your affiliation. Try again.",
  "E.STATE_ADVANCE_FAILED": "Could not advance onboarding. Try again.",
  "E.WRONG_STEP": "That step does not apply to your role.",
  "E.INVALID_EMAIL": "Enter a valid school email address.",
  "E.INVALID_CODE": "Enter the 6-digit code.",
  "E.INVALID_PROFILE": "Enter a display name (1–80 characters).",
  "E.PROFILE_SAVE_FAILED": "Could not save your profile. Try again.",
  "E.RESEND_THROTTLED": "Please wait 60 seconds before requesting another code.",
  "E.CODE_EXPIRED": "The code has expired. Request a new one.",
  "E.ATTEMPTS_EXHAUSTED": "Too many incorrect attempts. Request a new code.",
  "E.NO_ACTIVE_CHALLENGE": "No pending verification. Request a new code.",
  "E.DELIVERY_FAILED": "Could not send the code. Try again.",
  "E.CONSUME_FAILED": "Verification failed. Request a new code.",
};

function inputClass() {
  return "mt-1 w-full rounded border px-3 py-2";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  const step = getOnboardingStep(user.onboardingState, user.role);
  if (step === "done") redirect("/dashboard");
  const params = await searchParams;
  const errorCopy = params.error
    ? (ERROR_COPY[params.error] ?? "Something went wrong. Try again.")
    : null;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Join CampusTable</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Signed in as {user.primaryEmail}. Step:{" "}
        {step === "role"
          ? "1 of 3 — your role"
          : step === "affiliation"
            ? "2 of 3 — affiliation"
            : "3 of 3 — profile"}
      </p>
      {errorCopy ? (
        <p
          role="alert"
          className="mt-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorCopy}
        </p>
      ) : null}

      {step === "role" ? (
        <form action={setRole} className="mt-6 space-y-3">
          <fieldset>
            <legend className="text-sm font-medium">I am joining as</legend>
            {(["student", "alumni", "faculty"] as const).map((role) => (
              <label key={role} className="mt-2 flex items-center gap-2 text-sm">
                <input type="radio" name="role" value={role} defaultChecked={role === user.role} />
                {role === "student" ? "Student" : role === "alumni" ? "Alumni" : "Faculty"}
              </label>
            ))}
          </fieldset>
          <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
            Continue
          </button>
        </form>
      ) : null}

      {step === "affiliation" && user.role === "student" ? (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-neutral-600">
            Enter your school email. We send a 6-digit code that proves mailbox control only — not
            enrollment.
          </p>
          <form action={requestSchoolCode} className="space-y-3">
            <label className="block text-sm">
              School email
              <input className={inputClass()} type="email" name="schoolEmail" required />
            </label>
            <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
              Send code
            </button>
          </form>
          {params.sent ? (
            <form action={confirmSchoolCode} className="space-y-3">
              <label className="block text-sm">
                School email (same address)
                <input className={inputClass()} type="email" name="schoolEmail" required />
              </label>
              <label className="block text-sm">
                Code
                <input
                  className={inputClass()}
                  name="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  required
                />
              </label>
              <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
                Verify
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {step === "affiliation" && user.role !== "student" ? (
        <form action={saveAffiliation} className="mt-6 space-y-3">
          <p className="text-sm text-neutral-600">
            {user.role === "alumni"
              ? "Self-reported affiliation. No verified badge without review."
              : "Faculty roles require reviewer approval before publishing."}
          </p>
          <label className="block text-sm">
            University
            <input className={inputClass()} name="universityName" required minLength={2} />
          </label>
          {user.role === "alumni" ? (
            <>
              <label className="block text-sm">
                Program
                <input className={inputClass()} name="program" />
              </label>
              <label className="block text-sm">
                Graduation month
                <input className={inputClass()} type="month" name="graduationMonth" required />
              </label>
            </>
          ) : (
            <>
              <label className="block text-sm">
                Department
                <input className={inputClass()} name="department" required />
              </label>
              <label className="block text-sm">
                Title
                <input className={inputClass()} name="title" required />
              </label>
            </>
          )}
          <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
            Continue
          </button>
        </form>
      ) : null}

      {step === "profile" ? (
        <form action={saveProfile} className="mt-6 space-y-3">
          <label className="block text-sm">
            Display name
            <input className={inputClass()} name="displayName" required maxLength={80} />
          </label>
          <label className="block text-sm">
            Bio (optional)
            <textarea className={inputClass()} name="bio" rows={4} maxLength={2000} />
          </label>
          <button className="rounded bg-neutral-900 px-4 py-2 text-white" type="submit">
            Finish
          </button>
        </form>
      ) : null}
    </main>
  );
}
