CREATE TABLE "job_geocoding_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"features" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_geocoding_gate" (
	"provider" text PRIMARY KEY NOT NULL,
	"next_request_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "street_name_ka" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "street_name_en" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "location_label_ka" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "location_label_en" text;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "location_resolved_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_geocoding_cache_expiry" ON "job_geocoding_cache" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_location_labels_valid" CHECK (char_length("job"."street_name_ka") <= 300 and char_length("job"."street_name_en") <= 300 and char_length("job"."location_label_ka") <= 300 and char_length("job"."location_label_en") <= 300);