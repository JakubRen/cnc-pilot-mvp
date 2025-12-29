-- =========================================
-- DROP + CREATE RLS POLICIES (atomic)
-- =========================================
-- Najpierw DROP IF EXISTS, potem CREATE
-- =========================================

-- ai_conversations
DROP POLICY IF EXISTS "Service role full access on ai_conversations" ON public.ai_conversations;
CREATE POLICY "Service role full access on ai_conversations" ON public.ai_conversations AS PERMISSIVE FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Users can create conversations" ON public.ai_conversations;
CREATE POLICY "Users can create conversations" ON public.ai_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id IN ( SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.ai_conversations;
CREATE POLICY "Users can delete own conversations" ON public.ai_conversations AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id IN ( SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.ai_conversations;
CREATE POLICY "Users can update own conversations" ON public.ai_conversations AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id IN ( SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view own conversations" ON public.ai_conversations AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id IN ( SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

-- ai_feedback_logs
DROP POLICY IF EXISTS "Service role full access" ON public.ai_feedback_logs;
CREATE POLICY "Service role full access" ON public.ai_feedback_logs AS PERMISSIVE FOR ALL TO public USING ((auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.ai_feedback_logs;
CREATE POLICY "Users can insert own feedback" ON public.ai_feedback_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can view company feedback" ON public.ai_feedback_logs;
CREATE POLICY "Users can view company feedback" ON public.ai_feedback_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id = get_my_company_id()));

-- ai_price_estimates
DROP POLICY IF EXISTS "Users can create estimates" ON public.ai_price_estimates;
CREATE POLICY "Users can create estimates" ON public.ai_price_estimates AS PERMISSIVE FOR INSERT TO public WITH CHECK ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view company estimates" ON public.ai_price_estimates;
CREATE POLICY "Users can view company estimates" ON public.ai_price_estimates AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text]))))));

-- blocked_email_domains
DROP POLICY IF EXISTS "Only admins can manage blocked domains" ON public.blocked_email_domains;
CREATE POLICY "Only admins can manage blocked domains" ON public.blocked_email_domains AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = 'admin'::text)))));

DROP POLICY IF EXISTS "Public can read blocked domains" ON public.blocked_email_domains;
CREATE POLICY "Public can read blocked domains" ON public.blocked_email_domains AS PERMISSIVE FOR SELECT TO public USING (true);

-- carbon_reports (4 policies)
DROP POLICY IF EXISTS "Users can delete carbon_reports from their company" ON public.carbon_reports;
CREATE POLICY "Users can delete carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR DELETE TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can insert carbon_reports for their company" ON public.carbon_reports;
CREATE POLICY "Users can insert carbon_reports for their company" ON public.carbon_reports AS PERMISSIVE FOR INSERT TO public WITH CHECK ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can update carbon_reports from their company" ON public.carbon_reports;
CREATE POLICY "Users can update carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR UPDATE TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view carbon_reports from their company" ON public.carbon_reports;
CREATE POLICY "Users can view carbon_reports from their company" ON public.carbon_reports AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

-- companies
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
CREATE POLICY "Owners can update their company" ON public.companies AS PERMISSIVE FOR UPDATE TO authenticated USING ((id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
CREATE POLICY "Users can view their company" ON public.companies AS PERMISSIVE FOR SELECT TO authenticated USING ((id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

-- orders (KRYTYCZNE!)
DROP POLICY IF EXISTS "Only owners can delete orders" ON public.orders;
CREATE POLICY "Only owners can delete orders" ON public.orders AS PERMISSIVE FOR DELETE TO authenticated USING ((company_id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can update their company's orders" ON public.orders;
CREATE POLICY "Users can update their company's orders" ON public.orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can view their company's orders" ON public.orders;
CREATE POLICY "Users can view their company's orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id = get_my_company_id()));

-- users (BARDZO KRYTYCZNE!)
DROP POLICY IF EXISTS "Allow trigger to create users" ON public.users;
CREATE POLICY "Allow trigger to create users" ON public.users AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Only owners can delete users" ON public.users;
CREATE POLICY "Only owners can delete users" ON public.users AS PERMISSIVE FOR DELETE TO authenticated USING (((role = 'owner'::text) AND (company_id IN ( SELECT users_1.company_id FROM users users_1 WHERE (users_1.auth_id = auth.uid())))));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth_id = auth.uid())) WITH CHECK ((auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view users in their company" ON public.users;
CREATE POLICY "Users can view users in their company" ON public.users AS PERMISSIVE FOR SELECT TO authenticated USING (((auth_id = auth.uid()) OR (company_id = get_my_company_id())));

-- company_email_domains (KRYTYCZNE dla rejestracji!)
DROP POLICY IF EXISTS "Only admins can manage domains" ON public.company_email_domains;
CREATE POLICY "Only admins can manage domains" ON public.company_email_domains AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1 FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = 'admin'::text)))));

DROP POLICY IF EXISTS "Public can read domains for registration" ON public.company_email_domains;
CREATE POLICY "Public can read domains for registration" ON public.company_email_domains AS PERMISSIVE FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Users can view their company domains" ON public.company_email_domains;
CREATE POLICY "Users can view their company domains" ON public.company_email_domains AS PERMISSIVE FOR SELECT TO public USING ((company_id IN ( SELECT users.company_id FROM users WHERE (users.auth_id = auth.uid()))));

-- inventory (KRYTYCZNE!)
DROP POLICY IF EXISTS "Only owners can delete inventory items" ON public.inventory;
CREATE POLICY "Only owners can delete inventory items" ON public.inventory AS PERMISSIVE FOR DELETE TO authenticated USING ((company_id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = 'owner'::text)))));

DROP POLICY IF EXISTS "Users can create inventory items" ON public.inventory;
CREATE POLICY "Users can create inventory items" ON public.inventory AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can update their company's inventory" ON public.inventory;
CREATE POLICY "Users can update their company's inventory" ON public.inventory AS PERMISSIVE FOR UPDATE TO authenticated USING ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can view their company's inventory" ON public.inventory;
CREATE POLICY "Users can view their company's inventory" ON public.inventory AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id = get_my_company_id()));

-- time_logs (KRYTYCZNE!)
DROP POLICY IF EXISTS "Managers can update all company time logs" ON public.time_logs;
CREATE POLICY "Managers can update all company time logs" ON public.time_logs AS PERMISSIVE FOR UPDATE TO authenticated USING ((company_id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]))))));

DROP POLICY IF EXISTS "Owners and managers can delete time logs" ON public.time_logs;
CREATE POLICY "Owners and managers can delete time logs" ON public.time_logs AS PERMISSIVE FOR DELETE TO authenticated USING ((company_id IN ( SELECT users.company_id FROM users WHERE ((users.auth_id = auth.uid()) AND (users.role = ANY (ARRAY['owner'::text, 'manager'::text]))))));

DROP POLICY IF EXISTS "Users can create time logs" ON public.time_logs;
CREATE POLICY "Users can create time logs" ON public.time_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((company_id = get_my_company_id()));

DROP POLICY IF EXISTS "Users can update their own time logs" ON public.time_logs;
CREATE POLICY "Users can update their own time logs" ON public.time_logs AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id IN ( SELECT users.id FROM users WHERE (users.auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users can view their company time logs" ON public.time_logs;
CREATE POLICY "Users can view their company time logs" ON public.time_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((company_id = get_my_company_id()));
