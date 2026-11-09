-- Canonical leave naming preserves existing requests, approvals, allowance charges, and audit history.
--> statement-breakpoint
ALTER TABLE "vacation_request" RENAME TO "leave_request";
--> statement-breakpoint
ALTER TABLE "vacation_audit" RENAME TO "leave_audit";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_pkey" TO "leave_request_pkey";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_requester_id_user_id_fk" TO "leave_request_requester_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_reviewer_id_user_id_fk" TO "leave_request_reviewer_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_request" DROP CONSTRAINT "vacation_request_dates_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_dates_valid" CHECK (("leave_request"."kind" = 'sick_leave' and ("leave_request"."end_date" is null or "leave_request"."end_date" >= "leave_request"."start_date")) or ("leave_request"."kind" <> 'sick_leave' and "leave_request"."end_date" is not null and "leave_request"."end_date" >= "leave_request"."start_date" and "leave_request"."end_date" - "leave_request"."start_date" <= 365));
--> statement-breakpoint
ALTER TABLE "leave_request" DROP CONSTRAINT "vacation_request_kind_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_kind_valid" CHECK ("leave_request"."kind" in ('day_off', 'vacation', 'sick_leave'));
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_status_valid" TO "leave_request_status_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_charge_valid" TO "leave_request_charge_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_revision_valid" TO "leave_request_revision_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_note_valid" TO "leave_request_note_valid";
--> statement-breakpoint
ALTER TABLE "leave_request" RENAME CONSTRAINT "vacation_request_review_valid" TO "leave_request_review_valid";
--> statement-breakpoint
ALTER INDEX "vacation_request_own_created" RENAME TO "leave_request_own_created";
--> statement-breakpoint
ALTER INDEX "vacation_request_status_created" RENAME TO "leave_request_status_created";
--> statement-breakpoint
ALTER TABLE "leave_audit" RENAME CONSTRAINT "vacation_audit_pkey" TO "leave_audit_pkey";
--> statement-breakpoint
ALTER TABLE "leave_audit" RENAME CONSTRAINT "vacation_audit_request_id_vacation_request_id_fk" TO "leave_audit_request_id_leave_request_id_fk";
--> statement-breakpoint
ALTER TABLE "leave_audit" RENAME CONSTRAINT "vacation_audit_actor_id_user_id_fk" TO "leave_audit_actor_id_user_id_fk";
--> statement-breakpoint
ALTER INDEX "vacation_audit_request" RENAME TO "leave_audit_request";
--> statement-breakpoint
ALTER TABLE "leave_request" ALTER COLUMN "end_date" DROP NOT NULL;
--> statement-breakpoint
-- Preserve the meaning of explicit grants and denials.
UPDATE "user" SET permission_overrides=permission_overrides || jsonb_build_object(
 'allow', (SELECT coalesce(jsonb_agg(CASE permission WHEN 'vacation.review' THEN 'leave.review' WHEN 'vacation.configure' THEN 'leave.configure' ELSE permission END ORDER BY position), '[]'::jsonb) FROM jsonb_array_elements_text(permission_overrides->'allow') WITH ORDINALITY AS entries(permission,position)),
 'deny', (SELECT coalesce(jsonb_agg(CASE permission WHEN 'vacation.review' THEN 'leave.review' WHEN 'vacation.configure' THEN 'leave.configure' ELSE permission END ORDER BY position), '[]'::jsonb) FROM jsonb_array_elements_text(permission_overrides->'deny') WITH ORDINALITY AS entries(permission,position))
) WHERE permission_overrides->'allow' ?| ARRAY['vacation.review','vacation.configure'] OR permission_overrides->'deny' ?| ARRAY['vacation.review','vacation.configure'];
