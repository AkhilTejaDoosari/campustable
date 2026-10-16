export const ONBOARDING_STATES = ["started", "affiliation", "profile", "complete"] as const;
export type OnboardingState = (typeof ONBOARDING_STATES)[number];

export type OnboardingStep = "role" | "affiliation" | "profile" | "done";

/** Maps stored state (+role) to the UI step the member must complete next. */
export function getOnboardingStep(state: string, _role: string): OnboardingStep {
  switch (state) {
    case "started":
      return "role";
    case "affiliation":
      return "affiliation";
    case "profile":
      return "profile";
    case "complete":
      return "done";
    default:
      return "role";
  }
}

/** States a role-selection action may legally advance from. */
export function canSetRole(state: string): boolean {
  return state === "started" || state === "affiliation";
}
