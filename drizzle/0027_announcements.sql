CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"author_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"show_on_login" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_title_length" CHECK (length(trim("announcement"."title")) between 1 and 160),
	CONSTRAINT "announcement_body_length" CHECK (length(trim("announcement"."body")) between 1 and 10000)
);
--> statement-breakpoint
CREATE TABLE "announcement_recipient" (
	"announcement_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"dismissed_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	CONSTRAINT "announcement_recipient_announcement_id_user_id_pk" PRIMARY KEY("announcement_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "announcement_id" uuid;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipient" ADD CONSTRAINT "announcement_recipient_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_recipient" ADD CONSTRAINT "announcement_recipient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_author_request" ON "announcement" USING btree ("author_id","request_id");--> statement-breakpoint
CREATE INDEX "announcement_recent" ON "announcement" USING btree ("published_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcement_recipient_pending" ON "announcement_recipient" USING btree ("user_id","announcement_id") WHERE "announcement_recipient"."dismissed_at" is null and "announcement_recipient"."read_at" is null;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_announcement_id_announcement_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcement"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_announcement_recipient" ON "notification" USING btree ("announcement_id","recipient_id");