CREATE TYPE "public"."gps_diagnostic_kind" AS ENUM('registration', 'authentication', 'heartbeat', 'decode_error');--> statement-breakpoint
CREATE TABLE "gps_device_diagnostic" (
	"device_id" uuid NOT NULL,
	"kind" "gps_diagnostic_kind" NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "gps_device_diagnostic_device_id_kind_pk" PRIMARY KEY("device_id","kind")
);
--> statement-breakpoint
ALTER TABLE "gps_device_diagnostic" ADD CONSTRAINT "gps_device_diagnostic_device_id_gps_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."gps_device"("id") ON DELETE restrict ON UPDATE no action;