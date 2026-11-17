CREATE TABLE "production_team" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_team_name_valid" CHECK (char_length(trim("production_team"."name")) between 2 and 100),
	CONSTRAINT "production_team_version_valid" CHECK ("production_team"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "team_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"team_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_membership" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"leader" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "team_membership_dates_valid" CHECK ("team_membership"."ended_at" is null or "team_membership"."ended_at" >= "team_membership"."created_at")
);
--> statement-breakpoint
ALTER TABLE "team_event" ADD CONSTRAINT "team_event_team_id_production_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."production_team"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_event" ADD CONSTRAINT "team_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_production_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."production_team"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "production_team_active_name" ON "production_team" USING btree (lower(trim("name"))) WHERE "production_team"."active";--> statement-breakpoint
CREATE INDEX "team_event_history" ON "team_event" USING btree ("team_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_one_current_team" ON "team_membership" USING btree ("user_id") WHERE "team_membership"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "team_one_current_leader" ON "team_membership" USING btree ("team_id") WHERE "team_membership"."ended_at" is null and "team_membership"."leader";--> statement-breakpoint
CREATE INDEX "team_membership_history" ON "team_membership" USING btree ("team_id","created_at");