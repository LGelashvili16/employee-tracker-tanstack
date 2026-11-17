CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"request_id" uuid NOT NULL,
	"title" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"longitude" double precision NOT NULL,
	"latitude" double precision NOT NULL,
	"created_by" text NOT NULL,
	"assignee_id" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_kind_valid" CHECK ("job"."kind" in ('installation', 'measurement')),
	CONSTRAINT "job_status_valid" CHECK ("job"."status" in ('pending', 'en_route', 'on_site', 'completed', 'rejected')),
	CONSTRAINT "job_coordinates_valid" CHECK ("job"."longitude" between -180 and 180 and "job"."latitude" between -85 and 85),
	CONSTRAINT "job_text_valid" CHECK (char_length(trim("job"."title")) between 3 and 160 and char_length("job"."notes") <= 4000 and char_length("job"."address") <= 300),
	CONSTRAINT "job_version_valid" CHECK ("job"."version" > 0),
	CONSTRAINT "job_assignment_valid" CHECK (("job"."status" = 'pending' and "job"."assignee_id" is null) or ("job"."status" in ('en_route', 'on_site', 'completed') and "job"."assignee_id" is not null) or "job"."status" = 'rejected')
);
--> statement-breakpoint
CREATE TABLE "job_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"job_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_event_action_valid" CHECK ("job_event"."action" in ('created', 'edited', 'status_changed')),
	CONSTRAINT "job_event_status_valid" CHECK ("job_event"."status" in ('pending', 'en_route', 'on_site', 'completed', 'rejected')),
	CONSTRAINT "job_event_note_valid" CHECK (char_length("job_event"."note") <= 2000 and ("job_event"."action" <> 'status_changed' or "job_event"."status" not in ('rejected', 'pending') or char_length(trim("job_event"."note")) >= 5))
);
--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_event" ADD CONSTRAINT "job_event_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_event" ADD CONSTRAINT "job_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_creation_request" ON "job" USING btree ("created_by","request_id");--> statement-breakpoint
CREATE INDEX "job_created_order" ON "job" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "job_status_order" ON "job" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "job_assignee_order" ON "job" USING btree ("assignee_id","created_at","id");--> statement-breakpoint
CREATE INDEX "job_event_history" ON "job_event" USING btree ("job_id","created_at","id");--> statement-breakpoint
CREATE INDEX "job_event_actor" ON "job_event" USING btree ("actor_id");