-- Database trigger: Automatically create user profile when auth user signs up
-- Day 10: Updated to use email domain-based company identification
-- Run this in Supabase SQL Editor

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_company_id UUID;
  user_email_domain TEXT;
BEGIN
  -- Extract email domain from user's email
  user_email_domain := split_part(NEW.email, '@', 2);

  -- Find company_id by email domain from company_email_domains table
  SELECT company_id INTO user_company_id
  FROM company_email_domains
  WHERE email_domain = user_email_domain
  LIMIT 1;

  -- Fallback: If no domain found, try to get company_id from metadata
  -- (this allows manual assignment via registration flow)
  IF user_company_id IS NULL THEN
    user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  END IF;

  -- Insert new user into public.users table
  INSERT INTO public.users (
    auth_id,
    email,
    full_name,
    role,
    company_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operator', -- default role
    user_company_id -- automatically detected from email domain
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
