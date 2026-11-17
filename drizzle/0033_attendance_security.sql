CREATE TABLE "attendance_challenge" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"device_id" uuid NOT NULL,
	"session_hash" text NOT NULL,
	"kind" text NOT NULL,
	"challenge" text NOT NULL,
	"action_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_device" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"name" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"credential_id" text,
	"public_key" text,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"backed_up" boolean DEFAULT false NOT NULL,
	"device_type" text,
	"requested_ip" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_device_state" CHECK ("attendance_device"."state" in ('pending','approved','rejected','revoked') and "attendance_device"."revision" >= 0 and "attendance_device"."counter" >= 0)
);
--> statement-breakpoint
CREATE TABLE "attendance_employee_network" (
	"user_id" text PRIMARY KEY NOT NULL,
	"allowed_ips" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_punch" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"session_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"subject_user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"kind" text NOT NULL,
	"source" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"ip" text,
	"device_id" uuid,
	"credential_id" text,
	"user_verified" boolean NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_punch_kind" CHECK ("attendance_punch"."kind" in ('in','out') and "attendance_punch"."source" in ('employee','hr'))
);
--> statement-breakpoint
CREATE TABLE "attendance_security_audit" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"actor_id" text NOT NULL,
	"target_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_security_policy" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"ip_restriction_enabled" boolean DEFAULT false NOT NULL,
	"passkey_required" boolean DEFAULT true NOT NULL,
	"allowed_ips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_ips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "attendance_security_singleton" CHECK ("attendance_security_policy"."id" = 1 and "attendance_security_policy"."revision" >= 0)
);
--> statement-breakpoint
ALTER TABLE "attendance_challenge" ADD CONSTRAINT "attendance_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_challenge" ADD CONSTRAINT "attendance_challenge_device_id_attendance_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_device"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_device" ADD CONSTRAINT "attendance_device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_device" ADD CONSTRAINT "attendance_device_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_employee_network" ADD CONSTRAINT "attendance_employee_network_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_punch" ADD CONSTRAINT "attendance_punch_session_id_attendance_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_session"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_punch" ADD CONSTRAINT "attendance_punch_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_punch" ADD CONSTRAINT "attendance_punch_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_punch" ADD CONSTRAINT "attendance_punch_device_id_attendance_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."attendance_device"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_security_audit" ADD CONSTRAINT "attendance_security_audit_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_challenge_actor" ON "attendance_challenge" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "attendance_challenge_expiry" ON "attendance_challenge" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_device_browser_user" ON "attendance_device" USING btree ("user_id","token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_device_credential" ON "attendance_device" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "attendance_device_queue" ON "attendance_device" USING btree ("state","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_punch_once" ON "attendance_punch" USING btree ("session_id","kind");--> statement-breakpoint
CREATE INDEX "attendance_punch_employee" ON "attendance_punch" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "attendance_security_audit_target" ON "attendance_security_audit" USING btree ("target_id","created_at");