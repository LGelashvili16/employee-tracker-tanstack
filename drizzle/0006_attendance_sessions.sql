CREATE TABLE "attendance_session" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"employee_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"timezone" text NOT NULL,
	"schedule_effective_from" date NOT NULL,
	"expected_start_at" timestamp with time zone NOT NULL,
	"expected_end_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_actual_interval_valid" CHECK ("attendance_session"."ended_at" is null or "attendance_session"."ended_at" >= "attendance_session"."started_at"),
	CONSTRAINT "attendance_expected_interval_valid" CHECK ("attendance_session"."expected_end_at" > "attendance_session"."expected_start_at")
);
--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_schedule_effective_from_company_schedule_effective_from_fk" FOREIGN KEY ("schedule_effective_from") REFERENCES "public"."company_schedule"("effective_from") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_one_open_session" ON "attendance_session" USING btree ("employee_id") WHERE "attendance_session"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_request_once" ON "attendance_session" USING btree ("employee_id","request_id");--> statement-breakpoint
CREATE INDEX "attendance_employee_recent" ON "attendance_session" USING btree ("employee_id","work_date","started_at");