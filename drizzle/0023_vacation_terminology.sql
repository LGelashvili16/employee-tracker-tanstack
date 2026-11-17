-- Rename existing vacation records and their schema objects without recreating tables.
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME TO "vacation_request";
--> statement-breakpoint
ALTER TABLE "leave_audit" RENAME TO "vacation_audit";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_pkey" TO "vacation_request_pkey";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_requester_id_user_id_fk" TO "vacation_request_requester_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_reviewer_id_user_id_fk" TO "vacation_request_reviewer_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_dates_valid" TO "vacation_request_dates_valid";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_kind_valid" TO "vacation_request_kind_valid";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_status_valid" TO "vacation_request_status_valid";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_revision_valid" TO "vacation_request_revision_valid";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_note_valid" TO "vacation_request_note_valid";
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME CONSTRAINT "leave_request_review_valid" TO "vacation_request_review_valid";
--> statement-breakpoint
ALTER INDEX "leave_request_own_created" RENAME TO "vacation_request_own_created";
--> statement-breakpoint
ALTER INDEX "leave_request_status_created" RENAME TO "vacation_request_status_created";
--> statement-breakpoint
ALTER TABLE "vacation_audit" RENAME CONSTRAINT "leave_audit_pkey" TO "vacation_audit_pkey";
--> statement-breakpoint
ALTER TABLE "vacation_audit" RENAME CONSTRAINT "leave_audit_request_id_leave_request_id_fk" TO "vacation_audit_request_id_vacation_request_id_fk";
--> statement-breakpoint
ALTER TABLE "vacation_audit" RENAME CONSTRAINT "leave_audit_actor_id_user_id_fk" TO "vacation_audit_actor_id_user_id_fk";
--> statement-breakpoint
ALTER INDEX "leave_audit_request" RENAME TO "vacation_audit_request";
--> statement-breakpoint
-- Retain explicit grants and denials when the permission vocabulary changes.
UPDATE "user" SET permission_overrides = permission_overrides || jsonb_build_object(
 'allow', (SELECT coalesce(jsonb_agg(CASE permission WHEN 'leave.review' THEN 'vacation.review' WHEN 'leave.configure' THEN 'vacation.configure' ELSE permission END ORDER BY position), '[]'::jsonb) FROM jsonb_array_elements_text(permission_overrides->'allow') WITH ORDINALITY AS entries(permission, position)),
 'deny', (SELECT coalesce(jsonb_agg(CASE permission WHEN 'leave.review' THEN 'vacation.review' WHEN 'leave.configure' THEN 'vacation.configure' ELSE permission END ORDER BY position), '[]'::jsonb) FROM jsonb_array_elements_text(permission_overrides->'deny') WITH ORDINALITY AS entries(permission, position))
) WHERE permission_overrides->'allow' ?| ARRAY['leave.review','leave.configure'] OR permission_overrides->'deny' ?| ARRAY['leave.review','leave.configure'];
