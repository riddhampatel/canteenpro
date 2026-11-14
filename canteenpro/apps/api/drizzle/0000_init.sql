CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE');--> statement-breakpoint
CREATE TYPE "public"."billing_cycle" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."consumer_type" AS ENUM('EMPLOYEE', 'GUEST', 'WALK_IN');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('BIOMETRIC', 'KIOSK', 'POS_TERMINAL', 'QR_SCANNER');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."food_type" AS ENUM('VEG', 'NON_VEG', 'EGG', 'VEGAN', 'JAIN');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'CONVERTED', 'LOST');--> statement-breakpoint
CREATE TYPE "public"."notification_audience" AS ENUM('ALL_EMPLOYEES', 'CANTEEN', 'DEPARTMENT', 'EMPLOYEE', 'STAFF', 'TENANT_OWNERS');--> statement-breakpoint
CREATE TYPE "public"."opt_in_status" AS ENUM('OPTED_IN', 'OPTED_OUT');--> statement-breakpoint
CREATE TYPE "public"."order_channel" AS ENUM('POS', 'QR_SCAN', 'EMPLOYEE_QR', 'BIOMETRIC', 'KIOSK', 'MOBILE');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('COMPLETED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('WALLET', 'PAYROLL', 'COMPANY', 'CASH', 'UPI', 'CARD', 'COMPLIMENTARY');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('CREATED', 'PAID', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('SUPER_ADMIN', 'SUPPORT', 'CONTENT_EDITOR');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('OWNER', 'MANAGER', 'CASHIER', 'KITCHEN');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('PURCHASE', 'CONSUMPTION', 'WASTAGE', 'ADJUSTMENT', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."wallet_txn_type" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint

CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"meta" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image" text,
	"status" "post_status" DEFAULT 'DRAFT' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"reading_minutes" integer DEFAULT 4 NOT NULL,
	"published_at" timestamp with time zone,
	"category_id" text,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "canteen_workers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"role" text NOT NULL,
	"daily_wage" numeric(12, 2) DEFAULT 0 NOT NULL,
	"biometric_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canteens" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"client_company" text,
	"client_gstin" text,
	"address" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"allow_guests" boolean DEFAULT true NOT NULL,
	"opt_in_required" boolean DEFAULT false NOT NULL,
	"auto_publish_menus" boolean DEFAULT true NOT NULL,
	"maintenance_mode" boolean DEFAULT false NOT NULL,
	"allow_negative_wallet" boolean DEFAULT false NOT NULL,
	"wallet_credit_limit" numeric(12, 2) DEFAULT 0 NOT NULL,
	"gst_percent" numeric(5, 2) DEFAULT 5 NOT NULL,
	"bill_prefix" text DEFAULT 'BL' NOT NULL,
	"bill_counter" integer DEFAULT 0 NOT NULL,
	"qr_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"seo_description" text,
	"status" "post_status" DEFAULT 'PUBLISHED' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cms_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"percent_off" integer,
	"amount_off" numeric(12, 2),
	"max_redemptions" integer,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_menu_id" text NOT NULL,
	"menu_item_id" text NOT NULL,
	"price_override" numeric(12, 2),
	"planned_qty" integer,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_menus" (
	"id" text PRIMARY KEY NOT NULL,
	"canteen_id" text NOT NULL,
	"meal_session_id" text NOT NULL,
	"date" date NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"cost_center" text
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "device_type" NOT NULL,
	"api_key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"template" text,
	"status" text NOT NULL,
	"error" text,
	"tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"html" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"department_id" text,
	"employee_code" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"designation" text,
	"pin_hash" text,
	"pin_changed_at" timestamp with time zone,
	"photo_url" text,
	"dietary_pref" "food_type" DEFAULT 'VEG' NOT NULL,
	"allergies" text,
	"status" "employee_status" DEFAULT 'ACTIVE' NOT NULL,
	"wallet_balance" numeric(12, 2) DEFAULT 0 NOT NULL,
	"monthly_allowance" numeric(12, 2) DEFAULT 0 NOT NULL,
	"default_pay_mode" "payment_mode" DEFAULT 'WALLET' NOT NULL,
	"qr_token" text NOT NULL,
	"biometric_id" text,
	"biometric_synced" boolean DEFAULT false NOT NULL,
	"rfid_card" text,
	"joined_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_qrToken_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text,
	"date" date NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid_to" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" text PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"group" text DEFAULT 'general' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"employee_id" text,
	"order_id" text,
	"menu_item_id" text,
	"rating" integer NOT NULL,
	"comment" text,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"company" text,
	"purpose" text,
	"host_employee_id" text,
	"id_proof" text,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"category" text,
	"current_stock" numeric(12, 3) DEFAULT 0 NOT NULL,
	"reorder_level" numeric(12, 3) DEFAULT 0 NOT NULL,
	"avg_cost" numeric(12, 2) DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"employees" text,
	"message" text,
	"type" text DEFAULT 'contact' NOT NULL,
	"status" "lead_status" DEFAULT 'NEW' NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_opt_ins" (
	"id" text PRIMARY KEY NOT NULL,
	"canteen_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"meal_session_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "opt_in_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"canteen_id" text NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"opt_in_cutoff" text,
	"employee_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"company_subsidy" numeric(12, 2) DEFAULT 0 NOT NULL,
	"guest_price" numeric(12, 2) DEFAULT 0 NOT NULL,
	"meals_per_day" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"category_id" text,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"price" numeric(12, 2) NOT NULL,
	"guest_price" numeric(12, 2),
	"cost_price" numeric(12, 2),
	"food_type" "food_type" DEFAULT 'VEG' NOT NULL,
	"calories" integer,
	"prep_minutes" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"notification_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_notification_id_employee_id_pk" PRIMARY KEY("notification_id","employee_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"canteen_id" text,
	"audience" "notification_audience" NOT NULL,
	"target_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'GENERAL' NOT NULL,
	"push_status" text,
	"sent_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"menu_item_id" text,
	"name" text NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"bill_no" text NOT NULL,
	"consumer_type" "consumer_type" NOT NULL,
	"employee_id" text,
	"guest_id" text,
	"walk_in_name" text,
	"meal_session_id" text,
	"business_date" date NOT NULL,
	"channel" "order_channel" DEFAULT 'POS' NOT NULL,
	"payment_mode" "payment_mode" NOT NULL,
	"is_fixed_meal" boolean DEFAULT false NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"discount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"subsidy_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'COMPLETED' NOT NULL,
	"notes" text,
	"cancel_reason" text,
	"served_by_id" text,
	"device_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text,
	"plan_id" text,
	"billing_cycle" "billing_cycle",
	"invoice_no" text,
	"amount" numeric(12, 2) NOT NULL,
	"tax_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" "payment_status" DEFAULT 'CREATED' NOT NULL,
	"coupon_code" text,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"razorpay_signature" text,
	"method" text,
	"failure_reason" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_invoiceNo_unique" UNIQUE("invoice_no"),
	CONSTRAINT "payments_razorpayOrderId_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"price_monthly" numeric(12, 2) NOT NULL,
	"price_yearly" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"max_canteens" integer DEFAULT 1 NOT NULL,
	"max_employees" integer DEFAULT 200 NOT NULL,
	"max_staff_users" integer DEFAULT 3 NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"highlights" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "platform_role" DEFAULT 'SUPER_ADMIN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "staff_users" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" "staff_role" DEFAULT 'MANAGER' NOT NULL,
	"canteen_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"reset_token" text,
	"reset_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"inventory_item_id" text NOT NULL,
	"canteen_id" text,
	"supplier_id" text,
	"type" "stock_movement_type" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit_cost" numeric(12, 2),
	"invoice_ref" text,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'TRIALING' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'MONTHLY' NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"last_reminder_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"gstin" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"gstin" text,
	"address" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India' NOT NULL,
	"logo_url" text,
	"currency" text DEFAULT 'INR' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"status" "tenant_status" DEFAULT 'TRIAL' NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"company" text,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"type" "wallet_txn_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reason" text NOT NULL,
	"reference" text,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"canteen_id" text NOT NULL,
	"date" date NOT NULL,
	"meal_session_id" text,
	"prepared_qty_kg" numeric(12, 3),
	"wasted_qty_kg" numeric(12, 3) NOT NULL,
	"reason" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"date" date NOT NULL,
	"status" "attendance_status" DEFAULT 'PRESENT' NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_platform_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."platform_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_workers" ADD CONSTRAINT "canteen_workers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_workers" ADD CONSTRAINT "canteen_workers_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteens" ADD CONSTRAINT "canteens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_daily_menu_id_daily_menus_id_fk" FOREIGN KEY ("daily_menu_id") REFERENCES "public"."daily_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_menu_items" ADD CONSTRAINT "daily_menu_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_menus" ADD CONSTRAINT "daily_menus_meal_session_id_meal_sessions_id_fk" FOREIGN KEY ("meal_session_id") REFERENCES "public"."meal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_host_employee_id_employees_id_fk" FOREIGN KEY ("host_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_opt_ins" ADD CONSTRAINT "meal_opt_ins_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_opt_ins" ADD CONSTRAINT "meal_opt_ins_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_opt_ins" ADD CONSTRAINT "meal_opt_ins_meal_session_id_meal_sessions_id_fk" FOREIGN KEY ("meal_session_id") REFERENCES "public"."meal_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_sessions" ADD CONSTRAINT "meal_sessions_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_meal_session_id_meal_sessions_id_fk" FOREIGN KEY ("meal_session_id") REFERENCES "public"."meal_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_served_by_id_staff_users_id_fk" FOREIGN KEY ("served_by_id") REFERENCES "public"."staff_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_users" ADD CONSTRAINT "staff_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_canteen_id_canteens_id_fk" FOREIGN KEY ("canteen_id") REFERENCES "public"."canteens"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_meal_session_id_meal_sessions_id_fk" FOREIGN KEY ("meal_session_id") REFERENCES "public"."meal_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_attendance" ADD CONSTRAINT "worker_attendance_worker_id_canteen_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."canteen_workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_created_at_index" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "blog_posts_status_published_at_index" ON "blog_posts" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "canteens_tenant_id_code_index" ON "canteens" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "canteens_tenant_id_index" ON "canteens" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_menu_items_daily_menu_id_menu_item_id_index" ON "daily_menu_items" USING btree ("daily_menu_id","menu_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_menus_canteen_id_meal_session_id_date_index" ON "daily_menus" USING btree ("canteen_id","meal_session_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_tenant_id_name_index" ON "departments" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "email_logs_created_at_index" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_tenant_id_employee_code_index" ON "employees" USING btree ("tenant_id","employee_code");--> statement-breakpoint
CREATE INDEX "employees_tenant_id_canteen_id_index" ON "employees" USING btree ("tenant_id","canteen_id");--> statement-breakpoint
CREATE INDEX "employees_phone_index" ON "employees" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "expenses_tenant_id_date_index" ON "expenses" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "feedback_canteen_id_created_at_index" ON "feedback" USING btree ("canteen_id","created_at");--> statement-breakpoint
CREATE INDEX "guests_tenant_id_canteen_id_index" ON "guests" USING btree ("tenant_id","canteen_id");--> statement-breakpoint
CREATE INDEX "guests_phone_index" ON "guests" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_items_tenant_id_name_index" ON "inventory_items" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_opt_ins_employee_id_meal_session_id_date_index" ON "meal_opt_ins" USING btree ("employee_id","meal_session_id","date");--> statement-breakpoint
CREATE INDEX "meal_opt_ins_canteen_id_date_index" ON "meal_opt_ins" USING btree ("canteen_id","date");--> statement-breakpoint
CREATE INDEX "meal_sessions_canteen_id_index" ON "meal_sessions" USING btree ("canteen_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_categories_tenant_id_name_index" ON "menu_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "menu_items_tenant_id_index" ON "menu_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_tenant_id_created_at_index" ON "notifications" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_canteen_id_bill_no_index" ON "orders" USING btree ("canteen_id","bill_no");--> statement-breakpoint
CREATE INDEX "orders_tenant_id_business_date_index" ON "orders" USING btree ("tenant_id","business_date");--> statement-breakpoint
CREATE INDEX "orders_canteen_id_business_date_index" ON "orders" USING btree ("canteen_id","business_date");--> statement-breakpoint
CREATE INDEX "orders_employee_id_business_date_index" ON "orders" USING btree ("employee_id","business_date");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_created_at_index" ON "payments" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "staff_users_tenant_id_index" ON "staff_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_inventory_item_id_created_at_index" ON "stock_movements" USING btree ("inventory_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_tenant_id_index" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_current_period_end_index" ON "subscriptions" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE INDEX "wallet_transactions_employee_id_created_at_index" ON "wallet_transactions" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_tenant_id_created_at_index" ON "wallet_transactions" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "waste_logs_canteen_id_date_index" ON "waste_logs" USING btree ("canteen_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "worker_attendance_worker_id_date_index" ON "worker_attendance" USING btree ("worker_id","date");