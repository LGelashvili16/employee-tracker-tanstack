CREATE TABLE "attendance_audit" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_audit_reason_valid" CHECK (length(trim("attendance_audit"."reason")) between 5 and 500)
);
--> statement-breakpoint
CREATE TABLE "attendance_reviewer" (
	"reviewer_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_reviewer_reviewer_id_employee_id_pk" PRIMARY KEY("reviewer_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "attendance_setting" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"max_open_hours" integer DEFAULT 16 NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "attendance_setting_valid" CHECK ("attendance_setting"."id" = 1 and "attendance_setting"."max_open_hours" between 8 and 72 and "attendance_setting"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "original_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "original_ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "review_state" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "approved_outside_seconds" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "max_open_hours" integer DEFAULT 16 NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reviewer" ADD CONSTRAINT "attendance_reviewer_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_reviewer" ADD CONSTRAINT "attendance_reviewer_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_audit_target" ON "attendance_audit" USING btree ("target_id","created_at");--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_review_state_valid" CHECK ("attendance_session"."review_state" in ('pending', 'approved', 'rejected'));--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_review_values_valid" CHECK ("attendance_session"."revision" >= 0 and "attendance_session"."approved_outside_seconds" >= 0 and ("attendance_session"."review_state" = 'approved' or "attendance_session"."approved_outside_seconds" = 0) and "attendance_session"."max_open_hours" between 8 and 72);
--> statement-breakpoint
-- Preserve existing punches before any reviewed corrections are permitted.
UPDATE "attendance_session" SET "original_started_at" = "started_at", "original_ended_at" = "ended_at";
