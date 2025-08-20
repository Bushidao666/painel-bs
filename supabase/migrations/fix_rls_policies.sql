-- Fix RLS policies for better security with authentication
-- Generated at 2025-01-06

-- 1. Enable RLS on integration_config table
ALTER TABLE integration_config ENABLE ROW LEVEL SECURITY;

-- Create policies for integration_config
CREATE POLICY "Integration config visible to authenticated users" 
ON integration_config FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage integration config" 
ON integration_config FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 2. Fix leads table policies - remove public insert
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;

CREATE POLICY "Authenticated users can insert leads" 
ON leads FOR INSERT 
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can view all leads" ON leads;

CREATE POLICY "Authenticated users can view all leads" 
ON leads FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage leads" 
ON leads FOR ALL 
TO authenticated
USING (true);

-- 3. Fix campaigns table - remove public visibility
DROP POLICY IF EXISTS "Campanhas são visíveis para todos" ON campaigns;

CREATE POLICY "Campaigns visible to authenticated users" 
ON campaigns FOR SELECT 
TO authenticated
USING (true);

-- 4. Fix scoring_rules - remove ALL public access (CRITICAL!)
DROP POLICY IF EXISTS "Permitir modificação de regras" ON scoring_rules;
DROP POLICY IF EXISTS "Permitir leitura de regras" ON scoring_rules;
DROP POLICY IF EXISTS "Regras são visíveis para todos" ON scoring_rules;

CREATE POLICY "Scoring rules visible to authenticated users" 
ON scoring_rules FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can manage scoring rules" 
ON scoring_rules FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 5. Fix conversions table
DROP POLICY IF EXISTS "Conversões são visíveis para todos" ON conversions;

CREATE POLICY "Conversions visible to authenticated users" 
ON conversions FOR SELECT 
TO authenticated
USING (true);

-- 6. Fix webhook_events table
DROP POLICY IF EXISTS "Enable insert for API" ON webhook_events;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON webhook_events;

-- Allow public insert for webhooks (they come from external services)
-- But add rate limiting and validation in the application layer
CREATE POLICY "Public can insert webhook events" 
ON webhook_events FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can read webhook events" 
ON webhook_events FOR SELECT 
TO authenticated
USING (true);

-- 7. Add user-specific policies for whatsapp_instances
-- Allow users to see and manage their own instances
DROP POLICY IF EXISTS "Instâncias visíveis para autenticados" ON whatsapp_instances;
DROP POLICY IF EXISTS "Gerenciar instâncias para autenticados" ON whatsapp_instances;

CREATE POLICY "Users can view whatsapp instances" 
ON whatsapp_instances FOR SELECT 
TO authenticated
USING (true); -- All authenticated users can see instances

CREATE POLICY "Users can manage whatsapp instances" 
ON whatsapp_instances FOR ALL 
TO authenticated
USING (true); -- All authenticated users can manage instances

-- 8. Add policies for whatsapp_groups
CREATE POLICY "Users can view whatsapp groups" 
ON whatsapp_groups FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can manage whatsapp groups" 
ON whatsapp_groups FOR ALL 
TO authenticated
USING (true);

-- 9. Ensure app_settings policies are correct
DROP POLICY IF EXISTS "Configurações visíveis para autenticados" ON app_settings;
DROP POLICY IF EXISTS "Apenas admins podem editar configurações" ON app_settings;

CREATE POLICY "Settings visible to authenticated users" 
ON app_settings FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Only admins can update settings" 
ON app_settings FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- 10. Add policy for lead_scoring_history
CREATE POLICY "Scoring history visible to authenticated users" 
ON lead_scoring_history FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System can insert scoring history" 
ON lead_scoring_history FOR INSERT 
TO authenticated
WITH CHECK (true);