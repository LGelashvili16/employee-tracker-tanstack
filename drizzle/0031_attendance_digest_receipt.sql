CREATE TABLE "attendance_digest_receipt" (
	"reviewer_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	CONSTRAINT "attendance_digest_receipt_reviewer_id_session_id_pk" PRIMARY KEY("reviewer_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_digest_receipt" ADD CONSTRAINT "attendance_digest_receipt_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_digest_receipt" ADD CONSTRAINT "attendance_digest_receipt_session_id_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE cascade ON UPDATE no action;