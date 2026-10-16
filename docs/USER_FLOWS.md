# Phase 0B: real user journeys

Status: drafted for review, no application implementation. Recruiters are deferred by the user's 2026-10-10 decision. UI_REFERENCE identifies the exact visual baseline. Technical limits and operating policies requiring 0C are explicitly tracked in DATA_MODEL.

## Global behavior

Public users can see the hero and how-it-works. Community discovery and member interactions require an authenticated, completed, eligible profile. Incomplete/pending members can edit their own setup and see its status; reviewer access is separate. This permission model is a proposed V1 operating rule to finalize at 0C, not implied by the demo.
Reuse the demo's existing appearance, ordinary copy, controls and step order. Remove recruiter-specific hero lines/button, talent settings and routes. Replace sample actors and preview controls with genuine sign-in/sign-out and actual data.
Every page has loading, loaded, empty, validation-error, access-denied and dependency-failure states where applicable. Failed writes preserve input, state the failure, and offer a safe retry. An uncertain write must be reconciled before repeating; never assert success because a request was sent.

## 1. Account entry and personal email

Hero → Join the Community → choose student/alumni/faculty → enter name and personal email → real account verification/sign-in → resume onboarding.
Authentication method/recovery is finalized in 0C; the existing code-entry visual is retained where OTP is chosen. Existing account entry must not create a second member. Refresh restores server-owned setup after authentication.
Email-request failure: show that delivery could not be requested and allow retry under limits; do not display verified. Incorrect/expired/consumed proof: verification remains pending. Session expiry: reauthenticate, then recover saved state. No password/key/code in logs.
Already signed-in: skip redundant account creation. Logging out ends session access. Pending users can sign in later and resume.

## 2. Role-adaptive affiliation and academic information

Shared community setup stays one flow with role-dependent fields.
Student: distinct school email → exact university-domain registry match → challenge tied to this account and address → successful single-use proof → claim recorded atomically → degree/program, program-start month and expected-graduation month → remaining setup.
Unknown domain: request institution review with university name and official website; preserve progress, do not grant verified membership. A domain suffix guess is insufficient.
Claim already owned by another account: refuse association with a generic recovery/support message, not the other owner's identity. Repeat verification for the same account is permitted under limits.
Expected graduation before the current month: show alumni guidance and role selector; no automatic false fraud label. Same-month graduation is permitted. Graduation before program start is invalid. These are date-consistency rules, not enrollment proof. If the role changes, clear incompatible affiliation status and re-evaluate required fields server-side.
Alumni: university/program and actual graduation month (not future), optional current position/organization; inactive school mail is not a blocker. Label affiliation self-reported unless separately reviewed. No mandatory diploma, ID photo or transcript. Any optional evidence flow shown in the reference remains deferred until retention/authorization rules pass 0C; cannot claim verification before then.
Faculty: university, department, title, official directory/profile link or a no-directory explanation, participation statement; school mailbox verification and faculty-role review are separate. Pending role is visible to the owner; the backend cannot infer faculty approval from an email suffix. Proposed V1: publishing as faculty waits for approved role; reviewer identity/procedure finalized in 0C.

## 3. Interests, availability, links and profile completion

Preserve offered/wanted searchable multi-selection and learning-goal UI/copy from the supplied reference. They are optional self-reported interests, not proven skill credentials. Type custom topics; normalize for search without dropping the member's display label.
Optional project idea in onboarding saves a project draft, never auto-publishes a shallow brief.
Preserve availability, meeting format, university preference, timezone and optional scheduling fields. Availability is self-reported; no claim of calendar synchronization or automatic schedule matching.
LinkedIn, GitHub, portfolio and other links are optional. Validate URL scheme server-side; no forced profiles for nontechnical members. Resume is optional and private by default; actual upload constraints and safe download rules finalized in 0C.
Profile visibility preserves the reference's choices but must map to an explicit permission table in 0C. A campus filter is not a security boundary.
Review → valid server-side required fields → save completed profile → permitted People/Projects view. Required terms consent stores the policy version and timestamp. Pending affiliation is not disguised as complete verification.

## 4. People discovery and profile viewing

People → university control defaults to the member's actual university name → type/select another university or all participating universities → optional role, topic and availability filters → list → profile.
Filters change search criteria, not access rights. Search results contain only discoverable profiles and permitted fields. No matches: explain how to broaden filters; do not fabricate people. University registry/loading failure: show failure, preserve selection.
Profile → introductory request where permitted. Hide private email, evidence, precise private schedules and files unless a defined sharing rule permits access. Changing profile visibility takes effect for subsequent reads; an old connection does not automatically override the setting.

## 5. Project creation, publication and discovery

Projects → New Project → familiar creation dialog/page → save draft → finish the complete brief → publish.
The brief retains existing title/description/help/contribution/meeting/availability controls and adds required problem, intended audience, goal, deliverable, success criteria, scope/exclusions, responsibilities, duration and eligibility. Group additions within the existing visual system; no separate redesigned demo.
Publishing requires complete validated fields and at least one bounded role with capacity. Project owner is an initial member. Faculty research uses this same workflow with an honest role label; it is not institutionally approved research by default.
Draft is owner-only. Published projects are discoverable to permitted community members. Projects default across participating universities during the pilot, with a visible university filter. University-only projects are visible with eligibility clearly stated; only eligible members may apply. The exact profile/project visibility matrix is finalized at 0C.
Project detail → view brief, roles, university boundary, time commitment and team → apply to an open role. Incomplete/closed/full/ineligible application: reject with a specific safe reason. Non-owner edits/publish/closure: denied regardless of visible buttons.
Owner may update requirements without silently changing accepted members' agreed contribution. Material changes require visible disclosure; handling of an accepted member's objection belongs in the lifecycle contract.

## 6. First contact, applications and acceptance

Unconnected pair: one introduction creates a durable contact request; it may reference a project role/application. No chat channel opens before recipient acceptance. A repeated send, withdrawal or page reload cannot create a new introduction for that pair.
Recipient → accept or decline. Generic contact acceptance opens a one-to-one conversation. Project-role acceptance additionally creates a membership and reserves capacity in the same transaction. It must not accept the contact while silently failing membership when the operation was project acceptance.
Recipient decline: store the decision internally, do not notify the sender or expose Declined through the sender's API/UI. Sender continues to see a neutral pending presentation; the recipient sees the true action. Do not leak decline through errors, activity timestamps or realtime payloads.
Sender withdrawal is recorded, never deletes the original pair-limit record. No resend bypass. Already-connected members apply to other roles through a structured project application; it does not send another introductory message or need to accept the relationship again.
Project application acceptance validates current project/role status, capacity, ownership, eligibility and block status. A competing final-slot request returns role-full with no partial membership/conversation changes. Retry returns the existing successful result rather than duplicating work.
Owner's Add Collaborator action sends an invitation; it cannot enroll another person without acceptance. Invitation/request mechanics for an unconnected pair must use the same contact restriction. No private unsolicited message disguised as an invitation.

## 7. Conversations and team lifecycle

Messages → accepted conversation → real persisted messages. Read/send requires participation, live permitted relationship and no effective block. No simulated replies or messages attributed to another person.
Send failure: retain draft with failed status. Retry uses the same message key; no duplicate bubble. Delivery acknowledgement is not a read receipt unless actually implemented.
Leave/removal ends active project membership and releases role capacity once, while preserving necessary history. Generic pair conversation is separate and remains permitted unless blocked/ended under explicit rules; no team/group chat in V1.
Owner closure stops new applications/invitations/acceptances, marks remaining applications inactive and preserves project history. Ownership-transfer/account-deletion behavior must be decided before coding that mutation.
Project updates are factual owner/member contributions under explicit edit rules, not Jira task management. A first-work outcome is explicitly self-reported. Do not infer completed work from acceptance.

## 8. Trust and moderation

Block from a profile or conversation → contact discovery/actions and messages enforce the block server-side; UI gives a neutral unavailable state to the other party. Unblock must not restore a consumed introduction allowance.
Report → reason/context → persisted private report → authorized reviewer queue → action and audit event. Reporter identity and evidence are not exposed to the reported member.
Deletion/export and file/evidence retention, reviewer bootstrap, suspension/appeal, and abuse limits are finalized in SECURITY/DEPLOYMENT before implementation of those operations.
