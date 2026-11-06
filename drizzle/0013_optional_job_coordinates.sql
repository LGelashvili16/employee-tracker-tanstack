ALTER TABLE "job" DROP CONSTRAINT "job_coordinates_valid";--> statement-breakpoint
ALTER TABLE "job" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_coordinates_valid" CHECK (("job"."longitude" is null and "job"."latitude" is null) or ("job"."longitude" is not null and "job"."latitude" is not null and "job"."longitude" between -180 and 180 and "job"."latitude" between -85 and 85));