-- IF NOT EXISTS: drizzle-kit creates "pos" first to hold its __drizzle_migrations log
CREATE SCHEMA IF NOT EXISTS "pos";
--> statement-breakpoint
CREATE TYPE "pos"."order_status" AS ENUM('submitted', 'preparing', 'ready', 'served', 'cancelled');--> statement-breakpoint
CREATE TYPE "pos"."payment_method" AS ENUM('cash', 'card', 'e_wallet');--> statement-breakpoint
CREATE TYPE "pos"."service_request_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "pos"."service_request_type" AS ENUM('call_server', 'water_cutlery', 'request_bill');--> statement-breakpoint
CREATE TYPE "pos"."staff_role" AS ENUM('cashier', 'kitchen', 'branch_manager', 'restaurant_admin', 'system_admin');--> statement-breakpoint
CREATE TABLE "pos"."branch_menu_availability" (
	"branch_id" uuid NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"is_available" boolean NOT NULL,
	CONSTRAINT "branch_menu_availability_branch_id_menu_item_id_pk" PRIMARY KEY("branch_id","menu_item_id")
);
--> statement-breakpoint
CREATE TABLE "pos"."branch_staff" (
	"branch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "branch_staff_branch_id_user_id_pk" PRIMARY KEY("branch_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "pos"."branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"tax_rate_bp" integer DEFAULT 0 NOT NULL,
	"wifi_ssid" text,
	"wifi_password" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branches_restaurant_id_code_unique" UNIQUE("restaurant_id","code"),
	CONSTRAINT "tax_rate_range" CHECK ("pos"."branches"."tax_rate_bp" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "pos"."dietary_tags" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pos"."dietary_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "dietary_tags_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pos"."dining_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"number" text NOT NULL,
	"seats" smallint DEFAULT 2 NOT NULL,
	"qr_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "dining_tables_qr_token_unique" UNIQUE("qr_token"),
	CONSTRAINT "dining_tables_branch_id_number_unique" UNIQUE("branch_id","number"),
	CONSTRAINT "seats_positive" CHECK ("pos"."dining_tables"."seats" > 0)
);
--> statement-breakpoint
CREATE TABLE "pos"."kitchen_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "kitchen_stations_restaurant_id_name_unique" UNIQUE("restaurant_id","name")
);
--> statement-breakpoint
CREATE TABLE "pos"."menu_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_categories_restaurant_id_slug_unique" UNIQUE("restaurant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "pos"."menu_item_dietary_tags" (
	"menu_item_id" uuid NOT NULL,
	"tag_id" smallint NOT NULL,
	CONSTRAINT "menu_item_dietary_tags_menu_item_id_tag_id_pk" PRIMARY KEY("menu_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "pos"."menu_item_modifier_groups" (
	"menu_item_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_item_modifier_groups_menu_item_id_group_id_pk" PRIMARY KEY("menu_item_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "pos"."menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"station_id" uuid,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"image_url" text,
	"prep_minutes" smallint,
	"highlight_label" text,
	"is_signature" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "menu_items_category_id_name_unique" UNIQUE("category_id","name"),
	CONSTRAINT "price_non_negative" CHECK ("pos"."menu_items"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pos"."modifier_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_select" smallint DEFAULT 0 NOT NULL,
	"max_select" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "modifier_groups_restaurant_id_name_unique" UNIQUE("restaurant_id","name"),
	CONSTRAINT "select_range" CHECK ("pos"."modifier_groups"."min_select" >= 0 and "pos"."modifier_groups"."max_select" >= greatest("pos"."modifier_groups"."min_select", 1))
);
--> statement-breakpoint
CREATE TABLE "pos"."modifier_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "modifier_options_group_id_name_unique" UNIQUE("group_id","name")
);
--> statement-breakpoint
CREATE TABLE "pos"."order_item_modifiers" (
	"order_item_id" uuid NOT NULL,
	"modifier_option_id" uuid NOT NULL,
	"price_delta_cents" integer NOT NULL,
	CONSTRAINT "order_item_modifiers_order_item_id_modifier_option_id_pk" PRIMARY KEY("order_item_id","modifier_option_id")
);
--> statement-breakpoint
CREATE TABLE "pos"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"line_no" smallint NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"quantity" smallint NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"note" text,
	CONSTRAINT "order_items_order_id_line_no_unique" UNIQUE("order_id","line_no"),
	CONSTRAINT "quantity_range" CHECK ("pos"."order_items"."quantity" between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "pos"."order_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "pos"."order_status" NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" integer GENERATED ALWAYS AS IDENTITY (sequence name "pos"."orders_ticket_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"session_id" uuid NOT NULL,
	"status" "pos"."order_status" DEFAULT 'submitted' NOT NULL,
	"note" text,
	"tax_rate_bp" integer NOT NULL,
	"placed_by" uuid,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "pos"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"method" "pos"."payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"tip_cents" integer DEFAULT 0 NOT NULL,
	"received_by" uuid,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amounts_non_negative" CHECK ("pos"."payments"."amount_cents" > 0 and "pos"."payments"."tip_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "pos"."restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pos"."service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "pos"."service_request_type" NOT NULL,
	"status" "pos"."service_request_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "pos"."table_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"guest_count" smallint DEFAULT 1 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	CONSTRAINT "guest_count_positive" CHECK ("pos"."table_sessions"."guest_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "pos"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "pos"."staff_role" NOT NULL,
	"restaurant_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_scope" CHECK (("pos"."users"."role" = 'system_admin') = ("pos"."users"."restaurant_id" is null))
);
--> statement-breakpoint
CREATE TABLE "pos"."zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "zones_branch_id_name_unique" UNIQUE("branch_id","name"),
	CONSTRAINT "zones_branch_id_id_key" UNIQUE("branch_id","id")
);
--> statement-breakpoint
ALTER TABLE "pos"."branch_menu_availability" ADD CONSTRAINT "branch_menu_availability_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "pos"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."branch_menu_availability" ADD CONSTRAINT "branch_menu_availability_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "pos"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."branch_staff" ADD CONSTRAINT "branch_staff_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "pos"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."branch_staff" ADD CONSTRAINT "branch_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pos"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."branches" ADD CONSTRAINT "branches_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."dining_tables" ADD CONSTRAINT "dining_tables_branch_id_zone_id_zones_branch_id_id_fk" FOREIGN KEY ("branch_id","zone_id") REFERENCES "pos"."zones"("branch_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."kitchen_stations" ADD CONSTRAINT "kitchen_stations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_categories" ADD CONSTRAINT "menu_categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "pos"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_item_dietary_tags" ADD CONSTRAINT "menu_item_dietary_tags_tag_id_dietary_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "pos"."dietary_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "pos"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_item_modifier_groups" ADD CONSTRAINT "menu_item_modifier_groups_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "pos"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "pos"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."menu_items" ADD CONSTRAINT "menu_items_station_id_kitchen_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "pos"."kitchen_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."modifier_groups" ADD CONSTRAINT "modifier_groups_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."modifier_options" ADD CONSTRAINT "modifier_options_group_id_modifier_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "pos"."modifier_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "pos"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_option_id_modifier_options_id_fk" FOREIGN KEY ("modifier_option_id") REFERENCES "pos"."modifier_options"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "pos"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "pos"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_status_events" ADD CONSTRAINT "order_status_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "pos"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."order_status_events" ADD CONSTRAINT "order_status_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."orders" ADD CONSTRAINT "orders_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "pos"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."orders" ADD CONSTRAINT "orders_placed_by_users_id_fk" FOREIGN KEY ("placed_by") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD CONSTRAINT "payments_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "pos"."table_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."payments" ADD CONSTRAINT "payments_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."service_requests" ADD CONSTRAINT "service_requests_session_id_table_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "pos"."table_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."service_requests" ADD CONSTRAINT "service_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."table_sessions" ADD CONSTRAINT "table_sessions_table_id_dining_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "pos"."dining_tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."table_sessions" ADD CONSTRAINT "table_sessions_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "pos"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."users" ADD CONSTRAINT "users_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "pos"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos"."zones" ADD CONSTRAINT "zones_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "pos"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_status_events_order_idx" ON "pos"."order_status_events" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_session_idx" ON "pos"."orders" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "pos"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_session_idx" ON "pos"."payments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "service_requests_open_idx" ON "pos"."service_requests" USING btree ("status") WHERE "pos"."service_requests"."status" <> 'resolved';--> statement-breakpoint
CREATE UNIQUE INDEX "table_sessions_one_open_idx" ON "pos"."table_sessions" USING btree ("table_id") WHERE "pos"."table_sessions"."closed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "pos"."users" USING btree (lower("email"));