ALTER TABLE "gps_device_diagnostic" ADD COLUMN "error_code" text;--> statement-breakpoint
ALTER TABLE "gps_position" ADD COLUMN "satellites" integer;--> statement-breakpoint
ALTER TABLE "gps_position" ADD COLUMN "cellular_signal" integer;--> statement-breakpoint
ALTER TABLE "gps_position" ADD COLUMN "odometer_km" double precision;--> statement-breakpoint
ALTER TABLE "gps_position" ADD CONSTRAINT "gps_position_satellites" CHECK ("gps_position"."satellites" between 0 and 254);--> statement-breakpoint
ALTER TABLE "gps_position" ADD CONSTRAINT "gps_position_cellular_signal" CHECK ("gps_position"."cellular_signal" between 0 and 254);--> statement-breakpoint
ALTER TABLE "gps_position" ADD CONSTRAINT "gps_position_odometer" CHECK ("gps_position"."odometer_km" between 0 and 429496729.5);