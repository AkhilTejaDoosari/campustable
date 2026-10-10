import { z } from "zod";

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  cursor: z.string().max(512).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const profileRoleSchema = z.enum(["student", "alumni", "faculty"]);
export type ProfileRole = z.infer<typeof profileRoleSchema>;

export const profileUpdateSchema = z.object({
  role: profileRoleSchema.optional(),
  display_name: nonEmpty(120).optional(),
  major: optionalText(160),
  degree: optionalText(160),
  graduation: optionalText(32),
  skills: z.array(nonEmpty(80)).max(50).optional(),
  topics: z.array(nonEmpty(80)).max(50).optional(),
  wants: optionalText(2000),
  availability: optionalText(500),
  meeting_format: z.enum(["in_person", "remote", "hybrid"]).optional(),
  visibility: z.enum(["public", "university", "private"]).optional(),
  talent_opt_in: z.boolean().optional(),
});

export const affiliationStartSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  university_id: z.string().uuid().optional(),
  role: profileRoleSchema.optional(),
});

export const affiliationConfirmSchema = z.object({
  affiliation_id: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const affiliationReviewSchema = z.object({
  affiliation_id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: optionalText(1000),
});

export const projectVisibilitySchema = z.enum(["public", "university", "private"]);

export const projectDraftSchema = z.object({
  title: nonEmpty(200),
  purpose: optionalText(4000),
  commitment: optionalText(2000),
  university_id: z.string().uuid().nullable().optional(),
  visibility: projectVisibilitySchema.optional(),
  local_only: z.boolean().optional(),
});

export const projectRoleInputSchema = z.object({
  title: nonEmpty(200),
  kind: z.enum(["contributor", "advisor"]),
  capacity: z.number().int().min(1).max(50).default(1),
});

export const projectPublishSchema = z.object({
  roles: z.array(projectRoleInputSchema).min(1).max(20).optional(),
});

export const projectUpdateSchema = z.object({
  title: nonEmpty(200).optional(),
  purpose: optionalText(4000),
  commitment: optionalText(2000),
  university_id: z.string().uuid().nullable().optional(),
  visibility: projectVisibilitySchema.optional(),
  local_only: z.boolean().optional(),
});

export const requestCreateSchema = z.object({
  project_id: z.string().uuid(),
  role_id: z.string().uuid(),
  message: nonEmpty(2000),
});

export const messageSendSchema = z.object({
  body: nonEmpty(4000),
});

export const blockCreateSchema = z.object({
  blocked_user_id: z.string().uuid(),
  reason: optionalText(1000),
});

export const reportCreateSchema = z.object({
  target_user_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  reason: nonEmpty(500),
  details: optionalText(4000),
}).refine((v) => v.target_user_id !== undefined || v.project_id !== undefined, {
  message: "Provide target_user_id or project_id",
});

export const outcomeCreateSchema = z.object({
  project_id: z.string().uuid(),
  text: nonEmpty(4000),
  self_report: z.literal(true),
});

export function formatZodIssues(error: z.ZodError): unknown {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}
