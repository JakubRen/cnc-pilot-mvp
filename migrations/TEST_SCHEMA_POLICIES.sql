-- =========================================
-- RLS POLICIES FROM PROD
-- =========================================
-- ~150 Row Level Security policies
-- =========================================

CREATE POLICY "Service role full access on ai_conversations" ON public.ai_conversations AS PERMISSIVE FOR ALL TO service_role
  USING (true);

CREATE POLICY "Users can create conversations" ON public.ai_conversations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete own conversations" ON public.ai_conversations AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update own conversations" ON public.ai_conversations AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own conversations" ON public.ai_conversations AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Service role full access" ON public.ai_feedback_logs AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));

CREATE POLICY "Users can insert own feedback" ON public.ai_feedback_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_my_company_id()));

CREATE POLICY "Users can view company feedback" ON public.ai_feedback_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY "Users can create estimates" ON public.ai_price_estimates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view company estimates" ON public.ai_price_estimates AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Admins can view audit logs" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "Only admins can manage blocked domains" ON public.blocked_email_domains AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Public can read blocked domains" ON public.blocked_email_domains AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can delete carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert carbon_reports for their company" ON public.carbon_reports AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Anyone can read with valid token" ON public.client_access_tokens AS PERMISSIVE FOR SELECT TO public
  USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))));

CREATE POLICY "Users can create tokens for own company" ON public.client_access_tokens AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete own company tokens" ON public.client_access_tokens AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update own company tokens" ON public.client_access_tokens AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own company tokens" ON public.client_access_tokens AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Owners can update their company" ON public.companies AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

CREATE POLICY "Users can view their company" ON public.companies AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Only admins can manage domains" ON public.company_email_domains AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'admin'::text)))));

CREATE POLICY "Public can read domains for registration" ON public.company_email_domains AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can view their company domains" ON public.company_email_domains AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete cooperants from their company" ON public.cooperants AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert cooperants for their company" ON public.cooperants AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update cooperants from their company" ON public.cooperants AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view cooperants from their company" ON public.cooperants AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY customers_delete_policy ON public.customers AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

CREATE POLICY customers_insert_policy ON public.customers AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY customers_select_policy ON public.customers AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY customers_update_policy ON public.customers AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY email_logs_insert_own_company ON public.email_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY email_logs_select_own_company ON public.email_logs AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY email_queue_company_access ON public.email_queue AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert energy emissions for their company" ON public.energy_emissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view global and company energy emissions" ON public.energy_emissions AS PERMISSIVE FOR SELECT TO public
  USING (((company_id IS NULL) OR (company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid())))));

CREATE POLICY "Users can create entity tags" ON public.entity_tags AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((tag_id IN ( SELECT tags.id
   FROM tags
  WHERE (tags.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete entity tags" ON public.entity_tags AS PERMISSIVE FOR DELETE TO public
  USING ((tag_id IN ( SELECT tags.id
   FROM tags
  WHERE (tags.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can manage entity tags" ON public.entity_tags AS PERMISSIVE FOR ALL TO public
  USING ((tag_id IN ( SELECT tags.id
   FROM tags
  WHERE (tags.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view company entity tags" ON public.entity_tags AS PERMISSIVE FOR SELECT TO public
  USING ((tag_id IN ( SELECT tags.id
   FROM tags
  WHERE (tags.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view entity tags" ON public.entity_tags AS PERMISSIVE FOR SELECT TO public
  USING ((tag_id IN ( SELECT tags.id
   FROM tags
  WHERE (tags.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete external_operation_items from their company" ON public.external_operation_items AS PERMISSIVE FOR DELETE TO public
  USING ((external_operation_id IN ( SELECT external_operations.id
   FROM external_operations
  WHERE (external_operations.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can insert external_operation_items for their company" ON public.external_operation_items AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((external_operation_id IN ( SELECT external_operations.id
   FROM external_operations
  WHERE (external_operations.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can update external_operation_items from their company" ON public.external_operation_items AS PERMISSIVE FOR UPDATE TO public
  USING ((external_operation_id IN ( SELECT external_operations.id
   FROM external_operations
  WHERE (external_operations.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view external_operation_items from their company" ON public.external_operation_items AS PERMISSIVE FOR SELECT TO public
  USING ((external_operation_id IN ( SELECT external_operations.id
   FROM external_operations
  WHERE (external_operations.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete external_operations from their company" ON public.external_operations AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert external_operations for their company" ON public.external_operations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update external_operations from their company" ON public.external_operations AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view external_operations from their company" ON public.external_operations AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Upload files" ON public.files AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete own files" ON public.files AS PERMISSIVE FOR DELETE TO public
  USING ((uploaded_by IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can upload files" ON public.files AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view company files" ON public.files AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "View company files" ON public.files AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Only owners can delete inventory items" ON public.inventory AS PERMISSIVE FOR DELETE TO authenticated
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

CREATE POLICY "Users can create inventory items" ON public.inventory AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_my_company_id()));

CREATE POLICY "Users can update their company's inventory" ON public.inventory AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY "Users can view their company's inventory" ON public.inventory AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY inventory_batches_company_isolation ON public.inventory_batches AS PERMISSIVE FOR ALL TO public
  USING ((location_id IN ( SELECT il.id
   FROM (inventory_locations il
     JOIN products p ON ((il.product_id = p.id)))
  WHERE (p.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view their company's inventory history" ON public.inventory_history AS PERMISSIVE FOR SELECT TO public
  USING ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY inventory_locations_company_isolation ON public.inventory_locations AS PERMISSIVE FOR ALL TO public
  USING ((product_id IN ( SELECT products.id
   FROM products
  WHERE (products.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY inventory_movements_company_isolation ON public.inventory_movements AS PERMISSIVE FOR ALL TO public
  USING ((location_id IN ( SELECT il.id
   FROM (inventory_locations il
     JOIN products p ON ((il.product_id = p.id)))
  WHERE (p.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can create transactions" ON public.inventory_transactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT u.company_id
   FROM (auth.users au
     JOIN users u ON (((u.id)::text = (au.id)::text)))
  WHERE (au.id = auth.uid()))));

CREATE POLICY "Users can view their company's transactions" ON public.inventory_transactions AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT u.company_id
   FROM (auth.users au
     JOIN users u ON (((u.id)::text = (au.id)::text)))
  WHERE (au.id = auth.uid()))));

CREATE POLICY "Admins can manage knowledge_categories" ON public.knowledge_categories AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));

CREATE POLICY "Users can view knowledge_categories from their company" ON public.knowledge_categories AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert knowledge_comments" ON public.knowledge_comments AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((entry_id IN ( SELECT knowledge_entries.id
   FROM knowledge_entries
  WHERE (knowledge_entries.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view knowledge_comments from their company entries" ON public.knowledge_comments AS PERMISSIVE FOR SELECT TO public
  USING ((entry_id IN ( SELECT knowledge_entries.id
   FROM knowledge_entries
  WHERE (knowledge_entries.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete their own knowledge_entries" ON public.knowledge_entries AS PERMISSIVE FOR DELETE TO public
  USING (((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))) AND (created_by IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid())))));

CREATE POLICY "Users can insert knowledge_entries for their company" ON public.knowledge_entries AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update knowledge_entries from their company" ON public.knowledge_entries AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view knowledge_entries from their company" ON public.knowledge_entries AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete their own reactions" ON public.knowledge_reactions AS PERMISSIVE FOR DELETE TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert their own reactions" ON public.knowledge_reactions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view knowledge_reactions from their company" ON public.knowledge_reactions AS PERMISSIVE FOR SELECT TO public
  USING ((entry_id IN ( SELECT knowledge_entries.id
   FROM knowledge_entries
  WHERE (knowledge_entries.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete machines from their company" ON public.machines AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert machines for their company" ON public.machines AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update machines from their company" ON public.machines AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view machines from their company" ON public.machines AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete maintenance_logs from their company" ON public.maintenance_logs AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can insert maintenance_logs for their company" ON public.maintenance_logs AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update maintenance_logs from their company" ON public.maintenance_logs AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view maintenance_logs from their company" ON public.maintenance_logs AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete maintenance_parts from their company" ON public.maintenance_parts AS PERMISSIVE FOR DELETE TO public
  USING ((maintenance_log_id IN ( SELECT maintenance_logs.id
   FROM maintenance_logs
  WHERE (maintenance_logs.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can insert maintenance_parts for their company" ON public.maintenance_parts AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((maintenance_log_id IN ( SELECT maintenance_logs.id
   FROM maintenance_logs
  WHERE (maintenance_logs.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can update maintenance_parts from their company" ON public.maintenance_parts AS PERMISSIVE FOR UPDATE TO public
  USING ((maintenance_log_id IN ( SELECT maintenance_logs.id
   FROM maintenance_logs
  WHERE (maintenance_logs.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view maintenance_parts from their company" ON public.maintenance_parts AS PERMISSIVE FOR SELECT TO public
  USING ((maintenance_log_id IN ( SELECT maintenance_logs.id
   FROM maintenance_logs
  WHERE (maintenance_logs.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can insert material emissions for their company" ON public.material_emissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update material emissions from their company" ON public.material_emissions AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view global and company material emissions" ON public.material_emissions AS PERMISSIVE FOR SELECT TO public
  USING (((company_id IS NULL) OR (company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid())))));

CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete operations from their company" ON public.operations AS PERMISSIVE FOR DELETE TO public
  USING ((order_item_id IN ( SELECT oi.id
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE (o.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can insert operations for their company" ON public.operations AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((order_item_id IN ( SELECT oi.id
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE (o.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can update operations from their company" ON public.operations AS PERMISSIVE FOR UPDATE TO public
  USING ((order_item_id IN ( SELECT oi.id
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE (o.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view operations from their company" ON public.operations AS PERMISSIVE FOR SELECT TO public
  USING ((order_item_id IN ( SELECT oi.id
   FROM (order_items oi
     JOIN orders o ON ((oi.order_id = o.id)))
  WHERE (o.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can delete order items from their company" ON public.order_items AS PERMISSIVE FOR DELETE TO public
  USING ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can insert order items for their company orders" ON public.order_items AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can update order items from their company" ON public.order_items AS PERMISSIVE FOR UPDATE TO public
  USING ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view order items from their company" ON public.order_items AS PERMISSIVE FOR SELECT TO public
  USING ((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Only owners can delete orders" ON public.orders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

CREATE POLICY "Users can create orders" ON public.orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_my_company_id()));

CREATE POLICY "Users can update their company's orders" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY "Users can view their company's orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY "Anyone can view permission definitions" ON public.permission_definitions AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY production_plans_company_isolation ON public.production_plans AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY products_company_isolation ON public.products AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can manage QC items" ON public.quality_control_items AS PERMISSIVE FOR ALL TO public
  USING ((plan_id IN ( SELECT quality_control_plans.id
   FROM quality_control_plans
  WHERE (quality_control_plans.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can view QC items" ON public.quality_control_items AS PERMISSIVE FOR SELECT TO public
  USING ((plan_id IN ( SELECT quality_control_plans.id
   FROM quality_control_plans
  WHERE (quality_control_plans.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Users can create QC plans for own company" ON public.quality_control_plans AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete own company QC plans" ON public.quality_control_plans AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update own company QC plans" ON public.quality_control_plans AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own company QC plans" ON public.quality_control_plans AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can create measurements for own company" ON public.quality_measurements AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update own company measurements" ON public.quality_measurements AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own company measurements" ON public.quality_measurements AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can manage own company reports" ON public.quality_reports AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own company reports" ON public.quality_reports AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY quote_items_company_isolation ON public.quote_items AS PERMISSIVE FOR ALL TO public
  USING ((quote_id IN ( SELECT quotes.id
   FROM quotes
  WHERE (quotes.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY quotes_company_isolation ON public.quotes AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Anyone can view role permissions" ON public.role_permissions AS PERMISSIVE FOR SELECT TO public
  USING (true);

CREATE POLICY "Users can manage own filters" ON public.saved_filters AS PERMISSIVE FOR ALL TO public
  USING ((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own filters or company defaults" ON public.saved_filters AS PERMISSIVE FOR SELECT TO public
  USING (((user_id = ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))) OR ((is_default = true) AND (company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))))));

CREATE POLICY "Admins can manage reports" ON public.scheduled_reports AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "Users can view company reports" ON public.scheduled_reports AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Admins can manage tags" ON public.tags AS PERMISSIVE FOR ALL TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can create company tags" ON public.tags AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can delete company tags" ON public.tags AS PERMISSIVE FOR DELETE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update company tags" ON public.tags AS PERMISSIVE FOR UPDATE TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view company tags" ON public.tags AS PERMISSIVE FOR SELECT TO public
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Managers can update all company time logs" ON public.time_logs AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));

CREATE POLICY "Owners and managers can delete time logs" ON public.time_logs AS PERMISSIVE FOR DELETE TO authenticated
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'manager'::text]))))));

CREATE POLICY "Users can create time logs" ON public.time_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((company_id = get_my_company_id()));

CREATE POLICY "Users can update their own time logs" ON public.time_logs AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view their company time logs" ON public.time_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((company_id = get_my_company_id()));

CREATE POLICY "Admins can manage user permissions" ON public.user_permissions AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

CREATE POLICY "Users can view permissions in their company" ON public.user_permissions AS PERMISSIVE FOR SELECT TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.company_id = ( SELECT users_1.company_id
           FROM users users_1
          WHERE (users_1.auth_id = auth.uid()))))));

CREATE POLICY "Manage own preferences" ON public.user_preferences AS PERMISSIVE FOR ALL TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can create own preferences" ON public.user_preferences AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can update own preferences" ON public.user_preferences AS PERMISSIVE FOR UPDATE TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Users can view own preferences" ON public.user_preferences AS PERMISSIVE FOR SELECT TO public
  USING ((user_id IN ( SELECT users.id
   FROM users
  WHERE (users.auth_id = auth.uid()))));

CREATE POLICY "Allow trigger to create users" ON public.users AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Only owners can delete users" ON public.users AS PERMISSIVE FOR DELETE TO authenticated
  USING (((role = 'owner'::text) AND (company_id IN ( SELECT users_1.company_id
   FROM users users_1
  WHERE (users_1.auth_id = auth.uid())))));

CREATE POLICY "Users can update their own profile" ON public.users AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth_id = auth.uid()))
  WITH CHECK ((auth_id = auth.uid()));

CREATE POLICY "Users can view users in their company" ON public.users AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth_id = auth.uid()) OR (company_id = get_my_company_id())));

CREATE POLICY "Users can access their company warehouse document items" ON public.warehouse_document_items AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM warehouse_documents wd
  WHERE ((wd.id = warehouse_document_items.document_id) AND (wd.company_id IN ( SELECT users.company_id
           FROM users
          WHERE (users.auth_id = auth.uid())))))));

CREATE POLICY "Users can access their company warehouse documents" ON public.warehouse_documents AS PERMISSIVE FOR ALL TO authenticated
  USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.auth_id = auth.uid()))));
