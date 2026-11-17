CREATE TABLE "employee_work_schedule" (
	"employee_id" uuid PRIMARY KEY NOT NULL,
	"days" jsonb NOT NULL,
	"assigned_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_work_schedule_week_valid" CHECK (jsonb_typeof("employee_work_schedule"."days") = 'array' and jsonb_array_length("employee_work_schedule"."days") = 7)
);
--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "employee" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "employee_work_schedule" ADD CONSTRAINT "employee_work_schedule_employee_id_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employee"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_schedule" ADD CONSTRAINT "employee_work_schedule_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;