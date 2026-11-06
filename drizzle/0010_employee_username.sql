ALTER TABLE "employee" RENAME COLUMN "code" TO "username";--> statement-breakpoint
ALTER TABLE "employee" RENAME CONSTRAINT "employee_code_normalized" TO "employee_username_normalized";--> statement-breakpoint
ALTER INDEX "employee_code_unique" RENAME TO "employee_username_unique";
