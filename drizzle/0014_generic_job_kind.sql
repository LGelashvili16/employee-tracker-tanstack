ALTER TABLE "job" DROP CONSTRAINT "job_kind_valid";--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_kind_valid" CHECK ("job"."kind" in ('installation', 'measurement', 'other'));