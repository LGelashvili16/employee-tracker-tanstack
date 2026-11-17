ALTER TABLE "notification" ADD COLUMN "event_key" text;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "destination" jsonb;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "live_toast" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_event_recipient" ON "notification" USING btree ("event_key","recipient_id");