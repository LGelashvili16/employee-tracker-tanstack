CREATE TABLE "day_off_allowance_audit" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" text,
	"target_user_id" text,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "day_off_balance" (
	"user_id" text PRIMARY KEY NOT NULL,
	"annual_days" integer NOT NULL,
	"remaining_days" integer NOT NULL,
	"period_year" integer NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "day_off_balance_valid" CHECK ("day_off_balance"."annual_days" between 0 and 366 and "day_off_balance"."remaining_days" between 0 and 3660 and "day_off_balance"."period_year" between 2000 and 2100 and "day_off_balance"."revision" >= 0)
);
--> statement-breakpoint
CREATE TABLE "day_off_setting" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_days" integer DEFAULT 4 NOT NULL,
	"reset_yearly" boolean DEFAULT true NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "day_off_setting_valid" CHECK ("day_off_setting"."id" = 1 and "day_off_setting"."default_days" between 0 and 366 and "day_off_setting"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "day_off_allowance_audit" ADD CONSTRAINT "day_off_allowance_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_off_allowance_audit" ADD CONSTRAINT "day_off_allowance_audit_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "day_off_balance" ADD CONSTRAINT "day_off_balance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "day_off_allowance_audit_target" ON "day_off_allowance_audit" USING btree ("target_user_id","created_at");
--> statement-breakpoint
INSERT INTO day_off_setting (id, default_days, reset_yearly, revision) VALUES (1, 4, true, 0);
--> statement-breakpoint
-- Existing approved day offs count against the current company calendar year.
WITH calendar AS (
 SELECT extract(year from now() AT TIME ZONE coalesce((SELECT timezone FROM company_schedule WHERE effective_from <= (now() AT TIME ZONE timezone)::date ORDER BY effective_from DESC LIMIT 1), 'Asia/Tbilisi'))::int AS year,
 coalesce((SELECT timezone FROM company_schedule WHERE effective_from <= (now() AT TIME ZONE timezone)::date ORDER BY effective_from DESC LIMIT 1), 'Asia/Tbilisi') AS timezone
)
INSERT INTO day_off_balance (user_id, annual_days, remaining_days, period_year)
SELECT u.id, 4, greatest(0, 4 - (SELECT count(*)::int FROM leave_request r WHERE r.requester_id = u.id AND r.kind = 'day_off' AND r.status = 'approved' AND extract(year from r.reviewed_at AT TIME ZONE c.timezone) = c.year)), c.year
FROM "user" u CROSS JOIN calendar c;
--> statement-breakpoint
INSERT INTO day_off_allowance_audit (target_user_id, action, reason, "after")
SELECT user_id, 'initialized', 'დასვენების დღეების საწყისი ლიმიტი', jsonb_build_object('annualDays', annual_days, 'remainingDays', remaining_days, 'year', period_year) FROM day_off_balance;
