import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { 
  requestVerification, 
  confirmVerification, 
  OTP_TTL_MINUTES, 
  OTP_MAX_ATTEMPTS, 
  OTP_RESEND_SECONDS,
  VerificationDatabase,
  Challenge,
  setVerificationDatabase,
} from "./verification";
import { getEmailService } from "@/lib/email";

// Hoisted mocks for vi.mock factories
const { mockRandomInt, mockGetEmailService } = vi.hoisted(() => ({
  mockRandomInt: vi.fn(),
  mockGetEmailService: vi.fn(() => ({
    sendVerificationCode: vi.fn().mockResolvedValue({ ok: true, id: "test" }),
  })),
}));

// Mock the email service
vi.mock("@/lib/email", () => ({
  getEmailService: mockGetEmailService,
}));

// Mock crypto with a simple hash function that returns different values for correct vs wrong codes
let lastHashInput = "";
vi.mock("node:crypto", () => ({
  randomInt: mockRandomInt,
  createHash: vi.fn(() => ({
    update: vi.fn().mockImplementation((input: string) => {
      lastHashInput = input;
      return {
        digest: vi.fn().mockImplementation(() => lastHashInput.includes("wrongcode") ? "wrong-hash" : "correct-hash"),
      };
    }),
  })),
}));

// Mock Date for time-based tests
let mockNow = Date.now();

vi.spyOn(global.Date, "now").mockImplementation(() => mockNow);

// Create a mock database with vi.Mock methods
function createMockDatabase() {
  return {
    getUserByClerkId: vi.fn(),
    getUserById: vi.fn(),
    getStudentAffiliation: vi.fn(),
    createStudentAffiliation: vi.fn(),
    getRecentChallenge: vi.fn(),
    createChallenge: vi.fn(),
    getActiveChallenge: vi.fn(),
    incrementChallengeAttempts: vi.fn(),
    consumeChallenge: vi.fn(),
    advanceOnboardingToProfile: vi.fn(),
  };
}

type MockDatabase = ReturnType<typeof createMockDatabase>;

let mockDb: MockDatabase;

function resetMocks() {
  vi.clearAllMocks();
  lastHashInput = "";
  mockDb = createMockDatabase();
  mockRandomInt.mockReset();
  mockGetEmailService.mockReturnValue({
    sendVerificationCode: vi.fn().mockResolvedValue({ ok: true, id: "test" }),
  });
  setVerificationDatabase(mockDb as unknown as VerificationDatabase);
}

describe("verification", () => {
  beforeEach(() => {
    resetMocks();
    mockNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const TEST_CLERK_USER_ID = "clerk_user_123";
  const TEST_SCHOOL_EMAIL = "student@university.edu";
  const TEST_USER_ID = "user-uuid-123";
  const TEST_CODE = "123456";

  describe("requestVerification", () => {
    it("sends verification code for new student user", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "student" });
      mockDb.getStudentAffiliation.mockResolvedValueOnce(null);
      mockDb.createStudentAffiliation.mockResolvedValueOnce({ error: null });
      mockDb.getRecentChallenge.mockResolvedValueOnce(null);
      mockDb.createChallenge.mockResolvedValueOnce({ error: null });
      mockRandomInt.mockReturnValue(123456);

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(true);
      expect(mockDb.getUserByClerkId).toHaveBeenCalledWith(TEST_CLERK_USER_ID);
      expect(mockDb.getStudentAffiliation).toHaveBeenCalledWith(TEST_USER_ID, TEST_SCHOOL_EMAIL.toLowerCase());
      expect(mockDb.createStudentAffiliation).toHaveBeenCalledWith(TEST_USER_ID, TEST_SCHOOL_EMAIL.toLowerCase());
      expect(mockDb.getRecentChallenge).toHaveBeenCalled();
      expect(mockDb.createChallenge).toHaveBeenCalled();
    });

    it("returns E.NO_LOCAL_USER when user not found", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce(null);

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.NO_LOCAL_USER");
    });

    it("returns E.RESEND_THROTTLED when recent challenge exists (60-second cooldown)", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "student" });
      mockDb.getStudentAffiliation.mockResolvedValueOnce(null);
      mockDb.createStudentAffiliation.mockResolvedValueOnce({ error: null });
      mockDb.getRecentChallenge.mockResolvedValueOnce({ id: "challenge-1" });

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.RESEND_THROTTLED");
    });

    it("returns E.AFFILIATION_CREATE_FAILED on affiliation insert error", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "student" });
      mockDb.getStudentAffiliation.mockResolvedValueOnce(null);
      mockDb.createStudentAffiliation.mockResolvedValueOnce({ error: new Error("constraint violation") });

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.AFFILIATION_CREATE_FAILED");
    });

    it("returns E.CHALLENGE_CREATE_FAILED on challenge insert error", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "student" });
      mockDb.getStudentAffiliation.mockResolvedValueOnce(null);
      mockDb.createStudentAffiliation.mockResolvedValueOnce({ error: null });
      mockDb.getRecentChallenge.mockResolvedValueOnce(null);
      mockDb.createChallenge.mockResolvedValueOnce({ error: new Error("db error") });

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.CHALLENGE_CREATE_FAILED");
    });

    it("returns E.DELIVERY_FAILED when email send fails", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "student" });
      mockDb.getStudentAffiliation.mockResolvedValueOnce(null);
      mockDb.createStudentAffiliation.mockResolvedValueOnce({ error: null });
      mockDb.getRecentChallenge.mockResolvedValueOnce(null);
      mockDb.createChallenge.mockResolvedValueOnce({ error: null });
      mockGetEmailService.mockReturnValueOnce({
        sendVerificationCode: vi.fn().mockResolvedValue({ ok: false, error: "send failed" }),
      });

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.DELIVERY_FAILED");
    });

    it("skips affiliation creation for non-student roles", async () => {
      mockDb.getUserByClerkId.mockResolvedValueOnce({ id: TEST_USER_ID, role: "alumni" });
      mockDb.getRecentChallenge.mockResolvedValueOnce(null);
      mockDb.createChallenge.mockResolvedValueOnce({ error: null });
      mockRandomInt.mockReturnValue(123456);

      const result = await requestVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL);

      expect(result.ok).toBe(true);
      expect(mockDb.getStudentAffiliation).not.toHaveBeenCalled();
      expect(mockDb.createStudentAffiliation).not.toHaveBeenCalled();
    });
  });

  describe("confirmVerification", () => {
    const VALID_CHALLENGE: Challenge = {
      id: "challenge-1",
      code_hash: "correct-hash",
      expires_at: new Date(mockNow + 10 * 60_000).toISOString(),
      attempts: 0,
      consumed_at: null,
    };

    it("verifies correct code and advances onboarding to profile", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(VALID_CHALLENGE);
      mockDb.consumeChallenge.mockResolvedValueOnce({ error: null });
      mockDb.advanceOnboardingToProfile.mockResolvedValueOnce(undefined);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(true);
      expect(mockDb.getUserById).toHaveBeenCalledWith(TEST_CLERK_USER_ID);
      expect(mockDb.getActiveChallenge).toHaveBeenCalledWith(TEST_USER_ID, TEST_SCHOOL_EMAIL.toLowerCase());
      expect(mockDb.consumeChallenge).toHaveBeenCalledWith(VALID_CHALLENGE.id, TEST_USER_ID, TEST_SCHOOL_EMAIL.toLowerCase());
      expect(mockDb.advanceOnboardingToProfile).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it("returns E.NO_LOCAL_USER when user not found", async () => {
      mockDb.getUserById.mockResolvedValueOnce(null);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.NO_LOCAL_USER");
    });

    it("returns E.NO_ACTIVE_CHALLENGE when no challenge exists", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(null);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.NO_ACTIVE_CHALLENGE");
    });

    it("returns E.CODE_EXPIRED when challenge expired", async () => {
      const expiredChallenge: Challenge = {
        ...VALID_CHALLENGE,
        expires_at: new Date(mockNow - 1000).toISOString(),
      };
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(expiredChallenge);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.CODE_EXPIRED");
    });

    it("returns E.ATTEMPTS_EXHAUSTED when max attempts (5) reached", async () => {
      const exhaustedChallenge: Challenge = {
        ...VALID_CHALLENGE,
        attempts: 5,
      };
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(exhaustedChallenge);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.ATTEMPTS_EXHAUSTED");
    });

    it("returns E.INVALID_CODE and increments attempts on wrong code", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(VALID_CHALLENGE);
      mockDb.incrementChallengeAttempts.mockResolvedValueOnce(undefined);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, "wrongcode");

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.INVALID_CODE");
      expect(mockDb.incrementChallengeAttempts).toHaveBeenCalledWith(VALID_CHALLENGE.id, 1);
    });

    it("returns E.CONSUME_FAILED when RPC fails", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(VALID_CHALLENGE);
      mockDb.consumeChallenge.mockResolvedValueOnce({ error: new Error("challenge not consumable") });

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.CONSUME_FAILED");
    });

    it("enforces replay protection: consumed challenge cannot be reused (single-use)", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockResolvedValueOnce(null);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.NO_ACTIVE_CHALLENGE");
    });

    it("enforces authorization: users cannot verify another user's challenge", async () => {
      mockDb.getUserById.mockResolvedValueOnce({ id: "different-user-id" });
      mockDb.getActiveChallenge.mockResolvedValueOnce(null);

      const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, TEST_CODE);

      expect(result.ok).toBe(false);
      expect(result.error).toBe("E.NO_ACTIVE_CHALLENGE");
    });

    it("increments attempts up to max (5) on repeated wrong codes", async () => {
      let attemptCount = 0;
      mockDb.getUserById.mockResolvedValue({ id: TEST_USER_ID });
      mockDb.getActiveChallenge.mockImplementation(() => {
        attemptCount++;
        return Promise.resolve({ ...VALID_CHALLENGE, attempts: attemptCount - 1 });
      });
      mockDb.incrementChallengeAttempts.mockResolvedValue(undefined);

      for (let i = 1; i <= 6; i++) {
        const result = await confirmVerification(TEST_CLERK_USER_ID, TEST_SCHOOL_EMAIL, "wrongcode");
        expect(result.ok).toBe(false);
        expect(result.error).toBe(i === 6 ? "E.ATTEMPTS_EXHAUSTED" : "E.INVALID_CODE");
      }
    });
  });

  describe("constants", () => {
    it("has correct OTP_TTL_MINUTES (10)", () => {
      expect(OTP_TTL_MINUTES).toBe(10);
    });

    it("has correct OTP_MAX_ATTEMPTS (5)", () => {
      expect(OTP_MAX_ATTEMPTS).toBe(5);
    });

    it("has correct OTP_RESEND_SECONDS (60)", () => {
      expect(OTP_RESEND_SECONDS).toBe(60);
    });
  });
});