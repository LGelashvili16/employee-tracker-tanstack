CREATE TABLE "company_schedule_audit" (
	"effective_from" date PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_schedule_audit_reason_valid" CHECK (length(trim("company_schedule_audit"."reason")) between 5 and 500)
);
--> statement-breakpoint
ALTER TABLE "company_schedule_audit" ADD CONSTRAINT "company_schedule_audit_effective_from_company_schedule_effective_from_fk" FOREIGN KEY ("effective_from") REFERENCES "public"."company_schedule"("effective_from") ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE "company_schedule_audit" ADD CONSTRAINT "company_schedule_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;