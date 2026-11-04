CREATE TABLE "company_schedule" (
	"effective_from" date PRIMARY KEY NOT NULL,
	"timezone" text NOT NULL,
	"late_grace_minutes" integer NOT NULL,
	"early_departure_grace_minutes" integer NOT NULL,
	"reminder_minutes_before" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_schedule_timezone_nonempty" CHECK (length(trim("company_schedule"."timezone")) between 1 and 100),
	CONSTRAINT "company_schedule_late_grace_valid" CHECK ("company_schedule"."late_grace_minutes" between 0 and 60),
	CONSTRAINT "company_schedule_early_grace_valid" CHECK ("company_schedule"."early_departure_grace_minutes" between 0 and 60),
	CONSTRAINT "company_schedule_reminder_valid" CHECK ("company_schedule"."reminder_minutes_before" between 0 and 60)
);
--> statement-breakpoint
CREATE TABLE "company_schedule_day" (
	"effective_from" date NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time(0),
	"end_time" time(0),
	CONSTRAINT "company_schedule_day_effective_from_weekday_pk" PRIMARY KEY("effective_from","weekday"),
	CONSTRAINT "company_schedule_day_weekday_valid" CHECK ("company_schedule_day"."weekday" between 1 and 7),
	CONSTRAINT "company_schedule_day_hours_valid" CHECK (("company_schedule_day"."start_time" is null and "company_schedule_day"."end_time" is null) or ("company_schedule_day"."start_time" is not null and "company_schedule_day"."end_time" is not null and "company_schedule_day"."start_time" < "company_schedule_day"."end_time" and extract(second from "company_schedule_day"."start_time") = 0 and extract(second from "company_schedule_day"."end_time") = 0 and "company_schedule_day"."end_time" < time '24:00:00'))
);
--> statement-breakpoint
ALTER TABLE "company_schedule_day" ADD CONSTRAINT "company_schedule_day_effective_from_company_schedule_effective_from_fk" FOREIGN KEY ("effective_from") REFERENCES "public"."company_schedule"("effective_from") ON DELETE restrict ON UPDATE restrict;