CREATE TABLE "leave_audit" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_request" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"requester_id" text NOT NULL,
	"kind" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"reviewer_id" text,
	"review_reason" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leave_request_dates_valid" CHECK ("leave_request"."end_date" >= "leave_request"."start_date" and "leave_request"."end_date" - "leave_request"."start_date" <= 365),
	CONSTRAINT "leave_request_kind_valid" CHECK ("leave_request"."kind" in ('day_off', 'vacation')),
	CONSTRAINT "leave_request_status_valid" CHECK ("leave_request"."status" in ('pending', 'approved', 'rejected')),
	CONSTRAINT "leave_request_revision_valid" CHECK ("leave_request"."revision" >= 0),
	CONSTRAINT "leave_request_note_valid" CHECK (length("leave_request"."note") <= 500),
	CONSTRAINT "leave_request_review_valid" CHECK (("leave_request"."reviewer_id" is null and "leave_request"."reviewed_at" is null and "leave_request"."review_reason" = '' and "leave_request"."status" = 'pending') or ("leave_request"."reviewer_id" is not null and "leave_request"."reviewer_id" <> "leave_request"."requester_id" and "leave_request"."reviewed_at" is not null and length(trim("leave_request"."review_reason")) between 5 and 500))
);
--> statement-breakpoint
ALTER TABLE "leave_audit" ADD CONSTRAINT "leave_audit_request_id_leave_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."leave_request"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_audit" ADD CONSTRAINT "leave_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_request" ADD CONSTRAINT "leave_request_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leave_audit_request" ON "leave_audit" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "leave_request_own_created" ON "leave_request" USING btree ("requester_id","created_at","id");--> statement-breakpoint
CREATE INDEX "leave_request_status_created" ON "leave_request" USING btree ("status","created_at","id");