import { describe, expect, it } from "vitest";
import { canSetRole, getOnboardingStep } from "./onboarding";

describe("onboarding step resolver", () => {
  it("starts every member at role selection", () => {
    expect(getOnboardingStep("started", "student")).toBe("role");
    expect(getOnboardingStep("", "student")).toBe("role");
  });
  it("advances linearly through affiliation and profile", () => {
    expect(getOnboardingStep("affiliation", "student")).toBe("affiliation");
    expect(getOnboardingStep("affiliation", "alumni")).toBe("affiliation");
    expect(getOnboardingStep("profile", "faculty")).toBe("profile");
    expect(getOnboardingStep("complete", "student")).toBe("done");
  });
  it("allows role changes only before profile step", () => {
    expect(canSetRole("started")).toBe(true);
    expect(canSetRole("affiliation")).toBe(true);
    expect(canSetRole("profile")).toBe(false);
    expect(canSetRole("complete")).toBe(false);
  });
});
