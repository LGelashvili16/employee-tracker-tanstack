CREATE TABLE "complaint" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"submission_id" uuid NOT NULL,
	"requester_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"visibility" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"assignee_id" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_title_length" CHECK (length(trim("complaint"."title")) between 1 and 160),
	CONSTRAINT "complaint_description_length" CHECK (length(trim("complaint"."description")) between 1 and 5000),
	CONSTRAINT "complaint_category_valid" CHECK ("complaint"."category" in ('conditions','equipment','conduct','other')),
	CONSTRAINT "complaint_visibility_valid" CHECK ("complaint"."visibility" in ('standard','hr_only')),
	CONSTRAINT "complaint_status_valid" CHECK ("complaint"."status" in ('new','in_review','resolved','closed')),
	CONSTRAINT "complaint_revision_valid" CHECK ("complaint"."revision" >= 0),
	CONSTRAINT "complaint_no_self_assignment" CHECK ("complaint"."assignee_id" is null or "complaint"."assignee_id" <> "complaint"."requester_id")
);
--> statement-breakpoint
CREATE TABLE "complaint_activity" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"submission_id" uuid,
	"action" text NOT NULL,
	"body" text NOT NULL,
	"previous_status" text,
	"next_status" text,
	"previous_assignee_id" text,
	"next_assignee_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_activity_action_valid" CHECK ("complaint_activity"."action" in ('created','reply','assigned','status_changed')),
	CONSTRAINT "complaint_activity_body_length" CHECK (length(trim("complaint_activity"."body")) between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "complaint_id" uuid;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "complaint_activity_id" uuid;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint" ADD CONSTRAINT "complaint_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_activity" ADD CONSTRAINT "complaint_activity_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_activity" ADD CONSTRAINT "complaint_activity_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_activity" ADD CONSTRAINT "complaint_activity_previous_assignee_id_user_id_fk" FOREIGN KEY ("previous_assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_activity" ADD CONSTRAINT "complaint_activity_next_assignee_id_user_id_fk" FOREIGN KEY ("next_assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_requester_submission" ON "complaint" USING btree ("requester_id","submission_id");--> statement-breakpoint
CREATE INDEX "complaint_requester_recent" ON "complaint" USING btree ("requester_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "complaint_assignee_recent" ON "complaint" USING btree ("assignee_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "complaint_status_recent" ON "complaint" USING btree ("status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "complaint_activity_retry" ON "complaint_activity" USING btree ("complaint_id","actor_id","submission_id");--> statement-breakpoint
CREATE INDEX "complaint_activity_recent" ON "complaint_activity" USING btree ("complaint_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_complaint_id_complaint_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaint"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_complaint_activity_id_complaint_activity_id_fk" FOREIGN KEY ("complaint_activity_id") REFERENCES "public"."complaint_activity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_complaint_activity_recipient" ON "notification" USING btree ("complaint_activity_id","recipient_id");