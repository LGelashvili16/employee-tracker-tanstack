CREATE TABLE "gps_device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"reported_id" text NOT NULL,
	"canonical_id" text GENERATED ALWAYS AS (ltrim("reported_id", '0')) STORED,
	"enabled" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"last_contact_at" timestamp with time zone,
	CONSTRAINT "gps_device_identity" UNIQUE("canonical_id"),
	CONSTRAINT "gps_device_name_valid" CHECK (length(trim("gps_device"."name")) between 1 and 100),
	CONSTRAINT "gps_device_id_valid" CHECK ("gps_device"."reported_id" ~ '^[0-9]{5,20}$' and "gps_device"."reported_id" ~ '[1-9]')
);
--> statement-breakpoint
CREATE TABLE "gps_device_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"before" text,
	"after" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gps_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"fix_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"valid" boolean NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"speed_kmh" double precision NOT NULL,
	"course" double precision NOT NULL,
	"altitude" double precision,
	CONSTRAINT "gps_position_frame" UNIQUE("device_id","fingerprint"),
	CONSTRAINT "gps_position_coordinates" CHECK ("gps_position"."latitude" between -90 and 90 and "gps_position"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "gps_device_event" ADD CONSTRAINT "gps_device_event_device_id_gps_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."gps_device"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_position" ADD CONSTRAINT "gps_position_device_id_gps_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."gps_device"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gps_position_latest_valid" ON "gps_position" USING btree ("device_id","fix_at" DESC NULLS LAST,"received_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "gps_position"."valid";