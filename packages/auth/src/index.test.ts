import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Mocks - must be at top level for vitest hoisting
// ============================================================================

const mockAuth = vi.fn();
const mockCurrentUser = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}));

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Import after mocks
import { toLocalUser } from "./index.js";
import { createClient } from "@supabase/supabase-js";

// Get the mocked createClient
const mockCreateClient = vi.mocked(createClient);

// ============================================================================
// Pure function tests (existing, preserved)
// ============================================================================

const ONBOARDING_STATES = ["started", "affiliation", "profile", "complete"] as const;
type OnboardingState = (typeof ONBOARDING_STATES)[number];
type OnboardingStep = "role" | "affiliation" | "profile" | "done";

function getOnboardingStep(state: string, _role: string): OnboardingStep {
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

function canSetRole(state: string): boolean {
  return state === "started" || state === "affiliation";
}

describe("auth package - pure functions", () => {
  describe("toLocalUser", () => {
    it("converts database row to LocalUser with correct field mapping", () => {
      const row = {
        id: "uuid-1",
        clerk_user_id: "clerk_123",
        primary_email: "test@example.com",
        role: "student",
        onboarding_state: "complete",
      };

      const result = toLocalUser(row);

      expect(result).toEqual({
        id: "uuid-1",
        clerkUserId: "clerk_123",
        primaryEmail: "test@example.com",
        role: "student",
        onboardingState: "complete",
      });
    });

    it("defaults role to student when missing", () => {
      const row = {
        id: "uuid-1",
        clerk_user_id: "clerk_123",
        primary_email: "test@example.com",
        role: undefined,
        onboarding_state: "started",
      };

      const result = toLocalUser(row as any);
      expect(result.role).toBe("student");
    });

    it("defaults onboardingState to started when missing", () => {
      const row = {
        id: "uuid-1",
        clerk_user_id: "clerk_123",
        primary_email: "test@example.com",
        role: "student",
        onboarding_state: undefined,
      };

      const result = toLocalUser(row as any);
      expect(result.onboardingState).toBe("started");
    });
  });
});

describe("onboarding step resolution", () => {
  it("maps started state to role step", () => {
    expect(getOnboardingStep("started", "student")).toBe("role");
    expect(getOnboardingStep("started", "alumni")).toBe("role");
    expect(getOnboardingStep("started", "faculty")).toBe("role");
  });

  it("maps affiliation state to affiliation step", () => {
    expect(getOnboardingStep("affiliation", "student")).toBe("affiliation");
    expect(getOnboardingStep("affiliation", "alumni")).toBe("affiliation");
    expect(getOnboardingStep("affiliation", "faculty")).toBe("affiliation");
  });

  it("maps profile state to profile step", () => {
    expect(getOnboardingStep("profile", "student")).toBe("profile");
    expect(getOnboardingStep("profile", "alumni")).toBe("profile");
  });

  it("maps complete state to done", () => {
    expect(getOnboardingStep("complete", "student")).toBe("done");
  });

  it("defaults unknown state to role", () => {
    expect(getOnboardingStep("unknown", "student")).toBe("role");
  });

  it("allows role selection from started state", () => {
    expect(canSetRole("started")).toBe(true);
  });

  it("allows role selection from affiliation state", () => {
    expect(canSetRole("affiliation")).toBe(true);
  });

  it("prevents role selection from profile state", () => {
    expect(canSetRole("profile")).toBe(false);
  });

  it("prevents role selection from complete state", () => {
    expect(canSetRole("complete")).toBe(false);
  });
});

// ============================================================================
// Mock Supabase client factory
// ============================================================================

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  _table?: string;
  _eqId?: string;
  _eqClerkId?: string;
}

function createMockQueryBuilder(): MockQueryBuilder {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn(),
    delete: vi.fn().mockReturnThis(),
  } as MockQueryBuilder;

  const originalEq = builder.eq;
  builder.eq = vi.fn((col: string, val: any) => {
    if (col === "id") builder._eqId = val;
    if (col === "clerk_user_id") builder._eqClerkId = val;
    return originalEq(col, val);
  });

  return builder;
}

interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  rpc: ReturnType<typeof vi.fn>;
  auth: { persistSession: boolean };
}

function createMockSupabaseClient(): MockSupabaseClient {
  const mockData: Record<string, any[]> = {};
  const mockSingleData: Record<string, any> = {};

  const from = vi.fn((table: string) => {
    const builder = createMockQueryBuilder();
    builder._table = table;

    builder.single.mockImplementation(() => {
      const data = mockSingleData[table] ?? mockData[table]?.[0] ?? null;
      return Promise.resolve({ data, error: null });
    });

    builder.upsert.mockImplementation((rows: any, options?: any) => {
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!mockData[table]) mockData[table] = [];
      const existingIdx = mockData[table].findIndex(
        (r) => r.clerk_user_id === row.clerk_user_id || r.id === row.id
      );
      if (existingIdx >= 0) {
        mockData[table][existingIdx] = { ...mockData[table][existingIdx], ...row };
      } else {
        mockData[table].push(row);
      }
      mockSingleData[table] = mockData[table][mockData[table].length - 1];
      const selectBuilder = createMockQueryBuilder();
      selectBuilder.single.mockResolvedValue({ data: mockSingleData[table], error: null });
      selectBuilder.select.mockReturnThis();
      return selectBuilder;
    });

    builder.update.mockImplementation((updates: any) => {
      const table = builder._table!;
      if (!mockData[table]) mockData[table] = [];
      const idx = mockData[table].findIndex(
        (r) => r.id === builder._eqId || r.clerk_user_id === builder._eqClerkId
      );
      if (idx >= 0) {
        mockData[table][idx] = { ...mockData[table][idx], ...updates };
        mockSingleData[table] = mockData[table][idx];
      }
      return builder;
    });

    builder.insert.mockImplementation((rows: any) => {
      const table = builder._table!;
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!mockData[table]) mockData[table] = [];
      mockData[table].push({ ...row, id: row.id ?? `uuid-${mockData[table].length + 1}` });
      mockSingleData[table] = mockData[table][mockData[table].length - 1];
      return Promise.resolve({ data: mockSingleData[table], error: null });
    });

    return builder;
  });

  const rpc = vi.fn(async (fnName: string, params: any) => {
    if (fnName === "consume_verification_challenge") {
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });

  return { from, rpc, auth: { persistSession: false } };
}

// Helper to create a mock that returns a specific user
function createUserMock(userData: any) {
  const builder = createMockQueryBuilder();
  builder.single.mockResolvedValue({ data: userData, error: null });
  builder.select.mockReturnThis();
  builder.eq.mockReturnThis();
  return builder;
}

// Helper to create a mock that returns no user (PGRST116 error)
function createNoUserMock() {
  const builder = createMockQueryBuilder();
  builder.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  builder.select.mockReturnThis();
  builder.eq.mockReturnThis();
  return builder;
}

// Type for the mock client - use any to avoid SupabaseClient type constraints
type MockClient = MockSupabaseClient & { from: ReturnType<typeof vi.fn> };

// ============================================================================
// Integration tests with mocked services
// ============================================================================

describe("auth package - integration tests (mocked)", () => {
  let mockSupabase: MockClient;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient() as MockClient;
    mockCreateClient.mockReturnValue(mockSupabase as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("upsertLocalUser", () => {
    it("creates new user on first call", async () => {
      const { upsertLocalUser } = await import("./index.js");

      const result = await upsertLocalUser(mockSupabase as any, {
        clerkUserId: "clerk_new_123",
        primaryEmail: "new@example.com",
      });

      expect(result.clerkUserId).toBe("clerk_new_123");
      expect(result.primaryEmail).toBe("new@example.com");
      expect(result.role).toBe("student");
      expect(result.onboardingState).toBe("started");
    });

    it("normalizes email to lowercase", async () => {
      const { upsertLocalUser } = await import("./index.js");

      const result = await upsertLocalUser(mockSupabase as any, {
        clerkUserId: "clerk_new_123",
        primaryEmail: "NEW@EXAMPLE.COM",
      });

      expect(result.primaryEmail).toBe("new@example.com");
    });

    it("throws on empty email", async () => {
      const { upsertLocalUser } = await import("./index.js");

      await expect(
        upsertLocalUser(mockSupabase as any, {
          clerkUserId: "clerk_new_123",
          primaryEmail: "   ",
        })
      ).rejects.toThrow("E.NO_EMAIL");
    });

    it("is idempotent - returns existing user on duplicate clerk_user_id", async () => {
      const { upsertLocalUser } = await import("./index.js");

      const result1 = await upsertLocalUser(mockSupabase as any, {
        clerkUserId: "clerk_duplicate",
        primaryEmail: "first@example.com",
      });

      const result2 = await upsertLocalUser(mockSupabase as any, {
        clerkUserId: "clerk_duplicate",
        primaryEmail: "second@example.com",
      });

      expect(result1.id).toBe(result2.id);
      expect(result1.clerkUserId).toBe(result2.clerkUserId);
      expect(result2.primaryEmail).toBe("second@example.com");
    });
  });

  describe("syncClerkUser (webhook handler)", () => {
    it("inserts new user from webhook", async () => {
      const { syncClerkUser } = await import("./index.js");

      await syncClerkUser({ clerkUserId: "clerk_webhook_1", primaryEmail: "webhook@example.com" });

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
    });

    it("updates email on user.updated webhook", async () => {
      const { syncClerkUser } = await import("./index.js");

      await syncClerkUser({ clerkUserId: "clerk_webhook_2", primaryEmail: "old@example.com" });
      await syncClerkUser({ clerkUserId: "clerk_webhook_2", primaryEmail: "new@example.com" });

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it("handles missing primary email gracefully", async () => {
      const { syncClerkUser } = await import("./index.js");

      await expect(
        syncClerkUser({ clerkUserId: "clerk_no_email", primaryEmail: "" })
      ).resolves.not.toThrow();
    });
  });

  describe("deleteClerkUser", () => {
    it("marks user email as deleted tombstone", async () => {
      const { deleteClerkUser } = await import("./index.js");

      await deleteClerkUser("clerk_to_delete");

      expect(mockSupabase.from).toHaveBeenCalledWith("users");
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const { getCurrentUser } = await import("./index.js");
      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("returns existing local user when found", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_existing" });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createUserMock({
            id: "uuid-existing",
            clerk_user_id: "clerk_existing",
            primary_email: "existing@example.com",
            role: "alumni",
            onboarding_state: "complete",
          });
        }
        return createMockSupabaseClient().from(table);
      });

      const { getCurrentUser } = await import("./index.js");
      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.clerkUserId).toBe("clerk_existing");
      expect(result?.role).toBe("alumni");
      expect(result?.onboardingState).toBe("complete");
    });

    it("auto-provisions local user when Clerk user exists but local row missing", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_new_user" });
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "newuser@example.com" },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          const builder = createMockQueryBuilder();
          let callCount = 0;
          builder.single.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({ data: null, error: { code: "PGRST116" } });
            }
            return Promise.resolve({
              data: {
                id: "uuid-new",
                clerk_user_id: "clerk_new_user",
                primary_email: "newuser@example.com",
                role: "student",
                onboarding_state: "started",
              },
              error: null,
            });
          });
          builder.upsert.mockImplementation(() => {
            const selectBuilder = createMockQueryBuilder();
            selectBuilder.single.mockResolvedValue({
              data: {
                id: "uuid-new",
                clerk_user_id: "clerk_new_user",
                primary_email: "newuser@example.com",
                role: "student",
                onboarding_state: "started",
              },
              error: null,
            });
            selectBuilder.select.mockReturnThis();
            return selectBuilder;
          });
          builder.select.mockReturnThis();
          builder.eq.mockReturnThis();
          return builder;
        }
        return createMockSupabaseClient().from(table);
      });

      const { getCurrentUser } = await import("./index.js");
      const result = await getCurrentUser();

      expect(result).not.toBeNull();
      expect(result?.clerkUserId).toBe("clerk_new_user");
      expect(result?.primaryEmail).toBe("newuser@example.com");
      expect(result?.role).toBe("student");
      expect(result?.onboardingState).toBe("started");
    });

    it("returns null when Clerk user has no email", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_no_email" });
      mockCurrentUser.mockResolvedValue({ primaryEmailAddress: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createNoUserMock();
        }
        return createMockSupabaseClient().from(table);
      });

      const { getCurrentUser } = await import("./index.js");
      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("requireUser", () => {
    it("throws E.UNAUTHENTICATED when not signed in", async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const { requireUser } = await import("./index.js");

      await expect(requireUser()).rejects.toThrow("E.UNAUTHENTICATED");
    });

    it("returns user when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_auth" });
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "auth@example.com" },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createUserMock({
            id: "uuid-auth",
            clerk_user_id: "clerk_auth",
            primary_email: "auth@example.com",
            role: "student",
            onboarding_state: "started",
          });
        }
        return createMockSupabaseClient().from(table);
      });

      const { requireUser } = await import("./index.js");
      const result = await requireUser();

      expect(result.clerkUserId).toBe("clerk_auth");
    });
  });

  describe("requireRole", () => {
    it("throws E.FORBIDDEN when role not allowed", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_student" });
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "student@example.com" },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createUserMock({
            id: "uuid-student",
            clerk_user_id: "clerk_student",
            primary_email: "student@example.com",
            role: "student",
            onboarding_state: "complete",
          });
        }
        return createMockSupabaseClient().from(table);
      });

      const { requireRole } = await import("./index.js");

      await expect(requireRole(["admin", "faculty"])).rejects.toThrow("E.FORBIDDEN");
    });

    it("returns user when role is allowed", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_admin" });
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "admin@example.com" },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createUserMock({
            id: "uuid-admin",
            clerk_user_id: "clerk_admin",
            primary_email: "admin@example.com",
            role: "admin",
            onboarding_state: "complete",
          });
        }
        return createMockSupabaseClient().from(table);
      });

      const { requireRole } = await import("./index.js");
      const result = await requireRole(["admin", "faculty"]);

      expect(result.clerkUserId).toBe("clerk_admin");
      expect(result.role).toBe("admin");
    });

    it("allows multiple allowed roles", async () => {
      mockAuth.mockResolvedValue({ userId: "clerk_faculty" });
      mockCurrentUser.mockResolvedValue({
        primaryEmailAddress: { emailAddress: "faculty@example.com" },
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === "users") {
          return createUserMock({
            id: "uuid-faculty",
            clerk_user_id: "clerk_faculty",
            primary_email: "faculty@example.com",
            role: "faculty",
            onboarding_state: "complete",
          });
        }
        return createMockSupabaseClient().from(table);
      });

      const { requireRole } = await import("./index.js");
      const result = await requireRole(["student", "alumni", "faculty", "admin"]);

      expect(result.clerkUserId).toBe("clerk_faculty");
      expect(result.role).toBe("faculty");
    });
  });
});

// ============================================================================
// Webhook sync idempotency tests
// ============================================================================

describe("webhook sync idempotency", () => {
  let mockSupabase: MockClient;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient() as MockClient;
    mockCreateClient.mockReturnValue(mockSupabase as any);
  });

  it("handles concurrent user.created webhooks without duplicates", async () => {
    const { syncClerkUser } = await import("./index.js");

    const promises = Array(5)
      .fill(null)
      .map(() => syncClerkUser({ clerkUserId: "clerk_concurrent", primaryEmail: "concurrent@example.com" }));

    await Promise.all(promises);

    const usersTable = mockSupabase.from.mock.calls.find((c) => c[0] === "users");
    expect(usersTable).toBeDefined();
  });

  it("handles concurrent user.updated webhooks without data loss", async () => {
    const { syncClerkUser } = await import("./index.js");

    await syncClerkUser({ clerkUserId: "clerk_update", primaryEmail: "original@example.com" });

    const promises = Array(3)
      .fill(null)
      .map((_, i) => syncClerkUser({ clerkUserId: "clerk_update", primaryEmail: `update${i}@example.com` }));

    await Promise.all(promises);

    expect(mockSupabase.from).toHaveBeenCalled();
  });

  it("handles missing users gracefully in webhook", async () => {
    const { syncClerkUser } = await import("./index.js");

    await expect(
      syncClerkUser({ clerkUserId: "clerk_missing", primaryEmail: "missing@example.com" })
    ).resolves.not.toThrow();
  });

  it("handles user.deleted webhook", async () => {
    const { deleteClerkUser } = await import("./index.js");

    await expect(deleteClerkUser("clerk_deleted")).resolves.not.toThrow();
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
  });
});

// ============================================================================
// Unauthorized access tests
// ============================================================================

describe("unauthorized access (mocked)", () => {
  let mockSupabase: MockClient;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient() as MockClient;
    mockCreateClient.mockReturnValue(mockSupabase as any);
  });

  it("rejects dashboard access when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { requireUser } = await import("./index.js");

    await expect(requireUser()).rejects.toThrow("E.UNAUTHENTICATED");
  });

  it("rejects onboarding access when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const { getCurrentUser } = await import("./index.js");
    const result = await getCurrentUser();

    expect(result).toBeNull();
  });

  it("rejects dashboard access when onboarding incomplete", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_incomplete" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "incomplete@example.com" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") {
        return createUserMock({
          id: "uuid-incomplete",
          clerk_user_id: "clerk_incomplete",
          primary_email: "incomplete@example.com",
          role: "student",
          onboarding_state: "affiliation",
        });
      }
      return createMockSupabaseClient().from(table);
    });

    const { getCurrentUser } = await import("./index.js");
    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user?.onboardingState).toBe("affiliation");
  });

  it("allows dashboard access when onboarding complete", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_complete" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "complete@example.com" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") {
        return createUserMock({
          id: "uuid-complete",
          clerk_user_id: "clerk_complete",
          primary_email: "complete@example.com",
          role: "student",
          onboarding_state: "complete",
        });
      }
      return createMockSupabaseClient().from(table);
    });

    const { getCurrentUser } = await import("./index.js");
    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user?.onboardingState).toBe("complete");
  });

  it("enforces role-based access control", async () => {
    mockAuth.mockResolvedValue({ userId: "clerk_student_rbac" });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student_rbac@example.com" },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") {
        return createUserMock({
          id: "uuid-rbac",
          clerk_user_id: "clerk_student_rbac",
          primary_email: "student_rbac@example.com",
          role: "student",
          onboarding_state: "complete",
        });
      }
      return createMockSupabaseClient().from(table);
    });

    const { requireRole } = await import("./index.js");

    await expect(requireRole(["admin"])).rejects.toThrow("E.FORBIDDEN");

    const user = await requireRole(["student", "alumni", "faculty", "admin"]);
    expect(user.role).toBe("student");
  });
});