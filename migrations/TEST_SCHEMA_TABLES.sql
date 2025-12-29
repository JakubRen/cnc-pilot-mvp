-- =========================================
-- PEŁNY SCHEMAT TABEL Z PROD DO TEST
-- =========================================
-- Wygenerowano: 2025-12-29
-- Źródło: PROD (pbkajsjbsyuvpqpqsalc)
-- Cel: TEST (vvetjctdjswgwebhgbpd)
-- =========================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  context jsonb DEFAULT '{}'::jsonb,
  total_tokens int4 DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  model text DEFAULT 'claude-3-5-sonnet'::text,
  title text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id int8 NOT NULL,
  company_id uuid NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS ai_feedback_logs (
  feature_name text NOT NULL,
  user_id int8,
  created_at timestamptz DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  input_context jsonb,
  metadata jsonb,
  company_id uuid,
  ai_output text NOT NULL,
  user_correction text NOT NULL,
  correction_reason text,
  session_id text
);

CREATE TABLE IF NOT EXISTS ai_price_estimates (
  confidence_score numeric,
  material text NOT NULL,
  dimensions text,
  complexity text,
  prompt_used text,
  estimated_hours numeric,
  response_data jsonb,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  quantity int4,
  created_at timestamp DEFAULT now(),
  estimated_price numeric
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text,
  changed_fields text[],
  table_name text,
  user_agent text,
  entity_id text,
  entity_type text NOT NULL,
  action text NOT NULL,
  new_data jsonb,
  old_data jsonb,
  record_id uuid,
  created_at timestamptz DEFAULT now(),
  ip_address inet,
  changes jsonb,
  company_id uuid NOT NULL,
  user_id int8 NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_email_domains (
  reason text DEFAULT 'Public email provider'::text,
  created_at timestamptz DEFAULT now(),
  domain text NOT NULL
);

CREATE TABLE IF NOT EXISTS carbon_reports (
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  created_by int4,
  co2_per_unit numeric,
  material_name text,
  transport_co2_kg numeric,
  transport_km numeric,
  energy_co2_kg numeric,
  energy_emission_factor numeric,
  energy_kwh numeric,
  total_co2_kg numeric NOT NULL,
  notes text,
  calculation_method text DEFAULT 'simplified'::text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  material_co2_kg numeric,
  material_emission_factor numeric,
  report_number text NOT NULL,
  product_unit text DEFAULT 'szt'::text,
  material_weight_kg numeric,
  product_quantity numeric NOT NULL,
  document_id uuid,
  order_id uuid,
  company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS client_access_tokens (
  company_id uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  access_count int4 DEFAULT 0,
  customer_name text NOT NULL,
  last_accessed_at timestamptz,
  is_active bool DEFAULT true,
  expires_at timestamptz DEFAULT (now() + '30 days'::interval),
  created_at timestamptz DEFAULT now(),
  created_by int8,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS companies (
  max_operators int4 DEFAULT 5,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  timezone text DEFAULT 'Europe/Warsaw'::text,
  phone text,
  address text,
  logo_url text,
  owner_id int8,
  plan_type text DEFAULT 'basic'::text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_email_domains (
  created_at timestamptz DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  email_domain text NOT NULL,
  created_by uuid
);

CREATE TABLE IF NOT EXISTS cooperants (
  notes text,
  address text,
  company_id uuid NOT NULL,
  avg_lead_days int4 DEFAULT 7,
  name text NOT NULL,
  contact_person text,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  email text,
  phone text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  service_type text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  nip text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  type text NOT NULL DEFAULT 'client'::text,
  email text,
  street text,
  city text,
  company_id uuid NOT NULL,
  postal_code text,
  created_by int8,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  phone text,
  notes text,
  name text NOT NULL,
  country text DEFAULT 'Polska'::text
);

CREATE TABLE IF NOT EXISTS email_logs (
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  success bool DEFAULT false,
  sent_by int8,
  company_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email_type text NOT NULL,
  recipients text[] NOT NULL,
  subject text NOT NULL,
  error_message text
);

CREATE TABLE IF NOT EXISTS email_queue (
  created_at timestamptz DEFAULT now(),
  last_attempt_at timestamptz,
  scheduled_for timestamptz NOT NULL,
  attempts int4 DEFAULT 0,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  status text DEFAULT 'pending'::text,
  error_message text,
  payload jsonb NOT NULL,
  company_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_user_id int8
);

CREATE TABLE IF NOT EXISTS energy_emissions (
  energy_name text NOT NULL,
  energy_type text NOT NULL,
  source text,
  unit text NOT NULL DEFAULT 'kWh'::text,
  created_at timestamptz DEFAULT now(),
  is_active bool DEFAULT true,
  year int4,
  emission_factor numeric NOT NULL,
  company_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS entity_tags (
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tag_id uuid NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS external_operation_items (
  part_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quantity int4 NOT NULL DEFAULT 1,
  unit text DEFAULT 'szt'::text,
  order_id uuid,
  status text DEFAULT 'sent'::text,
  external_operation_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS external_operations (
  status text NOT NULL DEFAULT 'pending'::text,
  updated_at timestamptz DEFAULT now(),
  transport_info text,
  notes text,
  created_at timestamptz DEFAULT now(),
  operation_type text NOT NULL,
  operation_number text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  cooperant_id uuid,
  sent_date timestamptz,
  expected_return_date date,
  actual_return_date timestamptz,
  sent_by int4,
  received_by int4
);

CREATE TABLE IF NOT EXISTS files (
  uploaded_by int8 NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  company_id uuid NOT NULL,
  public_url text,
  thumbnail_url text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  original_filename text NOT NULL,
  filename text NOT NULL,
  file_type text NOT NULL,
  created_at timestamp DEFAULT now(),
  entity_id text,
  entity_type text,
  size_bytes int8 NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  created_by int8 NOT NULL,
  expiry_date date,
  company_id uuid NOT NULL,
  unit_cost numeric,
  low_stock_threshold numeric DEFAULT 10,
  quantity numeric NOT NULL DEFAULT 0,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs'::text,
  description text,
  category text DEFAULT 'raw_material'::text,
  name text NOT NULL,
  location text,
  supplier text,
  batch_number text,
  notes text
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  expiry_date date,
  received_date date,
  unit_cost numeric,
  quantity numeric NOT NULL,
  location_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  purchase_order_number text,
  supplier text,
  batch_number text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_history (
  quantity_change numeric NOT NULL,
  document_id uuid NOT NULL,
  company_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  notes text,
  document_number text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by int8 NOT NULL,
  quantity_after numeric NOT NULL,
  quantity_before numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  created_at timestamp DEFAULT now(),
  last_counted_at timestamp,
  reorder_point numeric,
  low_stock_threshold numeric,
  location_code text NOT NULL,
  notes text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  updated_at timestamp DEFAULT now(),
  reserved_quantity numeric NOT NULL DEFAULT 0,
  available_quantity numeric,
  last_movement_at timestamp
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp DEFAULT now(),
  quantity numeric NOT NULL,
  movement_type text NOT NULL,
  location_id uuid NOT NULL,
  batch_id uuid,
  reference_id uuid,
  created_by int8,
  reason text,
  reference_type text
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  quantity_after numeric NOT NULL,
  item_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp DEFAULT now(),
  transaction_type text NOT NULL,
  batch_number text,
  notes text,
  reason text,
  created_by int8 NOT NULL,
  company_id uuid NOT NULL,
  reference_order_id uuid,
  quantity numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_categories (
  slug text NOT NULL,
  name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  icon text,
  company_id uuid NOT NULL,
  description text,
  parent_id uuid,
  sort_order int4 DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  color text
);

CREATE TABLE IF NOT EXISTS knowledge_comments (
  created_at timestamptz DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL,
  created_by int4,
  content text NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content text,
  tags text[],
  category text,
  updated_at timestamptz DEFAULT now(),
  visibility_roles text[],
  created_at timestamptz DEFAULT now(),
  media_url text,
  ai_keywords text[],
  ai_summary text,
  transcription_status text DEFAULT 'pending'::text,
  created_by int4,
  transcription_text text,
  is_public bool DEFAULT false,
  ai_processed_at timestamptz,
  media_duration_seconds int4,
  media_type text,
  media_size_bytes int8,
  entry_type text NOT NULL DEFAULT 'note'::text,
  title text NOT NULL,
  product_id uuid,
  machine_id uuid,
  order_id uuid
);

CREATE TABLE IF NOT EXISTS knowledge_reactions (
  created_at timestamptz DEFAULT now(),
  entry_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'helpful'::text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id int4 NOT NULL
);

CREATE TABLE IF NOT EXISTS machines (
  name text NOT NULL,
  model text,
  company_id uuid NOT NULL,
  purchase_date date,
  warranty_until date,
  last_maintenance_date date,
  next_maintenance_date date,
  maintenance_interval_days int4 DEFAULT 90,
  specifications jsonb,
  notes text,
  serial_number text,
  manufacturer text,
  created_by int4,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  location text,
  code text,
  status text DEFAULT 'active'::text,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  machine_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'scheduled'::text,
  external_technician text,
  status text NOT NULL DEFAULT 'planned'::text,
  title text NOT NULL,
  description text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by int4,
  performed_by int4,
  total_cost numeric,
  labor_cost numeric,
  parts_cost numeric,
  labor_hours numeric,
  completed_at timestamptz,
  started_at timestamptz,
  scheduled_date date,
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS maintenance_parts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inventory_id uuid,
  total_cost numeric,
  created_at timestamptz DEFAULT now(),
  unit_cost numeric,
  part_number text,
  quantity numeric DEFAULT 1,
  maintenance_log_id uuid NOT NULL,
  part_name text NOT NULL
);

CREATE TABLE IF NOT EXISTS material_emissions (
  material_name text NOT NULL,
  material_category text NOT NULL,
  year int4,
  emission_factor numeric NOT NULL,
  company_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source text,
  is_active bool DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  message text,
  type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id int8 NOT NULL,
  company_id uuid NOT NULL,
  read bool DEFAULT false,
  created_at timestamptz DEFAULT now(),
  link text,
  title text NOT NULL
);

CREATE TABLE IF NOT EXISTS operations (
  created_at timestamp DEFAULT now(),
  status text DEFAULT 'pending'::text,
  production_plan_id uuid NOT NULL,
  updated_at timestamp DEFAULT now(),
  completed_at timestamp,
  started_at timestamp,
  assigned_operator_id int8,
  total_operation_cost numeric DEFAULT 0,
  total_run_cost numeric,
  total_setup_cost numeric,
  hourly_rate numeric NOT NULL DEFAULT 0,
  run_time_per_unit_minutes numeric NOT NULL DEFAULT 0,
  setup_time_minutes int4 NOT NULL DEFAULT 0,
  machine_id uuid,
  operation_number int4 NOT NULL,
  order_item_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  operation_name text NOT NULL,
  operation_type text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS order_items (
  drawing_file_id uuid,
  total_setup_time_minutes int4 DEFAULT 0,
  material text,
  length numeric,
  quantity int4 NOT NULL,
  order_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  height numeric,
  complexity text,
  width numeric,
  part_name text NOT NULL,
  notes text,
  updated_at timestamp DEFAULT now(),
  total_run_time_minutes numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  linked_inventory_item_id uuid,
  material_quantity_needed numeric DEFAULT 0.00,
  overhead_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  material_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  estimated_hours numeric,
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  company_id uuid NOT NULL,
  created_by int8 NOT NULL,
  priority int4 DEFAULT 0,
  deadline timestamp NOT NULL,
  quantity int4 NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  notes text,
  status text NOT NULL DEFAULT 'pending'::text,
  material text,
  part_name text,
  drawing_file_id uuid,
  customer_id uuid,
  price_per_unit numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  margin_amount numeric DEFAULT 0,
  margin_percent numeric DEFAULT 20,
  customer_name text NOT NULL,
  order_number text NOT NULL,
  selling_price numeric DEFAULT 0,
  actual_labor_hours numeric DEFAULT 0,
  actual_labor_cost numeric DEFAULT 0,
  estimated_total_cost numeric DEFAULT 0,
  estimated_overhead_cost numeric DEFAULT 0,
  estimated_labor_cost numeric DEFAULT 0,
  estimated_material_cost numeric DEFAULT 0,
  assigned_operator_id int8
);

CREATE TABLE IF NOT EXISTS permission_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  module text NOT NULL,
  name_pl text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  description_pl text
);

CREATE TABLE IF NOT EXISTS production_plans (
  approved_by int8,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  order_id uuid,
  order_item_id uuid,
  quantity int4 NOT NULL,
  length numeric,
  width numeric,
  height numeric,
  drawing_file_id uuid,
  is_active bool DEFAULT true,
  total_setup_time_minutes int4 DEFAULT 0,
  total_run_time_minutes numeric DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  actual_cost numeric,
  approved_at timestamp,
  created_by int8,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  plan_number text NOT NULL,
  part_name text NOT NULL,
  material text,
  technical_notes text,
  status text DEFAULT 'draft'::text
);

CREATE TABLE IF NOT EXISTS products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  specifications jsonb,
  default_unit_cost numeric,
  manufacturer text,
  unit text NOT NULL,
  updated_at timestamp DEFAULT now(),
  description text,
  category text NOT NULL,
  name text NOT NULL,
  sku text NOT NULL,
  created_at timestamp DEFAULT now(),
  created_by int8,
  is_active bool DEFAULT true,
  manufacturer_sku text
);

CREATE TABLE IF NOT EXISTS quality_control_items (
  tolerance_plus numeric NOT NULL DEFAULT 0,
  measurement_type text DEFAULT 'dimension'::text,
  unit text DEFAULT 'mm'::text,
  sort_order int4 DEFAULT 0,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  is_critical bool DEFAULT false,
  name text NOT NULL,
  nominal_value numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  tolerance_minus numeric NOT NULL DEFAULT 0,
  description text
);

CREATE TABLE IF NOT EXISTS quality_control_plans (
  created_at timestamptz DEFAULT now(),
  is_active bool DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  description text,
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_by int8,
  part_name text,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_measurements (
  measured_at timestamptz DEFAULT now(),
  measured_value numeric NOT NULL,
  item_id uuid NOT NULL,
  plan_id uuid,
  order_id uuid,
  batch_number text,
  notes text,
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_number int4 DEFAULT 1,
  is_pass bool NOT NULL,
  measured_by int8 NOT NULL
);

CREATE TABLE IF NOT EXISTS quality_reports (
  approved_by int8,
  created_at timestamptz DEFAULT now(),
  created_by int8,
  failed_measurements int4 DEFAULT 0,
  passed_measurements int4 DEFAULT 0,
  total_measurements int4 DEFAULT 0,
  plan_id uuid,
  order_id uuid,
  company_id uuid NOT NULL,
  overall_result text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_number text NOT NULL,
  notes text,
  status text DEFAULT 'draft'::text,
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS quote_items (
  part_name text NOT NULL,
  notes text,
  complexity text,
  dimensions text,
  quote_id uuid NOT NULL,
  material text,
  created_at timestamp DEFAULT now(),
  total_price numeric NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  unit_price numeric NOT NULL,
  quantity int4 NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quotes (
  customer_email text,
  material text,
  part_name text,
  customer_phone text,
  reasoning text,
  status text DEFAULT 'draft'::text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  quantity int4 NOT NULL DEFAULT 1,
  deadline date,
  total_price numeric NOT NULL,
  price_per_unit numeric,
  breakdown jsonb,
  confidence_score int4,
  sent_at timestamp,
  viewed_at timestamp,
  accepted_at timestamp,
  rejected_at timestamp,
  expires_at timestamp,
  converted_order_id uuid,
  created_by int8,
  token text NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  customer_id uuid,
  quote_number text NOT NULL,
  customer_name text NOT NULL,
  pricing_method text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  permission_code text NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS saved_filters (
  filter_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  name text NOT NULL,
  user_id int8,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_default bool DEFAULT false,
  company_id uuid NOT NULL,
  filter_type text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  is_active bool DEFAULT true,
  last_sent_at timestamp,
  filters jsonb,
  time_of_day time NOT NULL,
  day_of_month int4,
  day_of_week int4,
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  next_send_at timestamp,
  recipients text[] NOT NULL,
  name text NOT NULL,
  frequency text NOT NULL,
  report_type text NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  name text NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  color text DEFAULT '#3b82f6'::text,
  company_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS time_logs (
  start_time timestamp NOT NULL DEFAULT now(),
  company_id uuid NOT NULL,
  user_id int8 NOT NULL,
  order_id uuid NOT NULL,
  updated_at timestamp DEFAULT now(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  total_cost numeric DEFAULT 0,
  notes text,
  created_at timestamp DEFAULT now(),
  status text DEFAULT 'running'::text,
  hourly_rate numeric NOT NULL,
  duration_seconds int4 DEFAULT 0,
  end_time timestamp
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id int8 NOT NULL,
  permission_code text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  granted_by int8,
  granted bool NOT NULL DEFAULT true,
  id uuid NOT NULL DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  preferences jsonb,
  email_notifications bool DEFAULT true,
  notifications_enabled bool DEFAULT true,
  theme text DEFAULT 'dark'::text,
  language text DEFAULT 'pl'::text,
  user_id int8 NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  dashboard_layout jsonb
);

CREATE TABLE IF NOT EXISTS users (
  email text NOT NULL,
  role text,
  auth_id uuid,
  company_id uuid,
  hourly_rate numeric NOT NULL DEFAULT 150.00,
  language varchar NOT NULL DEFAULT 'pl'::character varying,
  interface_mode text DEFAULT 'full_access'::text,
  password_hash text,
  notification_preferences jsonb DEFAULT '{"team_changes": true, "daily_summary": false, "email_enabled": true, "order_created": true, "weekly_report": false, "low_stock_alert": true, "deadline_approaching": true, "deadline_days_before": 3, "order_status_changed": true}'::jsonb,
  dashboard_preferences jsonb DEFAULT '{"metricCards": true, "ordersChart": true, "urgentTasks": true, "activityFeed": true, "topCustomers": true, "productionPlan": true}'::jsonb,
  id int8 NOT NULL,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_document_items (
  inventory_id uuid NOT NULL,
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  quantity numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS warehouse_documents (
  company_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_at timestamptz DEFAULT now(),
  document_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by int8,
  document_number text NOT NULL,
  contractor text NOT NULL,
  description text,
  status text DEFAULT 'draft'::text
);

-- =========================================
-- GOTOWE! 54 TABELE UTWORZONE
-- =========================================
-- Następny krok: PRIMARY KEYS, FOREIGN KEYS, INDEXES
-- =========================================
