CREATE TYPE "pos"."payment_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "pos"."table_hold" AS ENUM('cleaning', 'reserved');--> statement-breakpoint
ALTER TYPE "pos"."order_status" ADD VALUE 'confirmed';--> statement-breakpoint
ALTER TYPE "pos"."order_status" ADD VALUE 'completed';--> statement-breakpoint
ALTER TYPE "pos"."payment_method" ADD VALUE 'online';--> statement-breakpoint
CREATE TABLE "pos"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_name" text,
	"actor_role" "pos"."staff_role",
	"restaurant_id" uuid,
	"branch_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos"."feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "rating_range" CHECK ("pos"."feedback"."rating" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "pos"."payments" ALTER COLUMN "paid_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pos"."payments" ALTER COLUMN "paid_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."branches" ADD COLUMN "cash_payments_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."branches" ADD COLUMN "online_payments_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."dining_tables" ADD COLUMN "hold" "pos"."table_hold";--> statement-breakpoint
ALTER TABLE "pos"."orders" ADD COLUMN "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "status" "pos"."payment_status" DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "tendered_cents" integer;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "provider_ref" text;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "channel" text;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "reference_number" text;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."restaurants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pos"."users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pos"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."audit_logs" ADD CONSTRAINT "audit_logs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "pos"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."feedback" ADD CONSTRAINT "feedback_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "pos"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "pos"."audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_restaurant_idx" ON "pos"."audit_logs" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_paid_at_idx" ON "pos"."payments" USING btree ("paid_at");--> statement-breakpoint
CREATE UNIQUE INDEX "service_requests_one_open_idx" ON "pos"."service_requests" USING btree ("session_id","type") WHERE "pos"."service_requests"."status" <> 'resolved';--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref");