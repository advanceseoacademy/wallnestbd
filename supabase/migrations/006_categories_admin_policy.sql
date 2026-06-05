-- Allow server admin API to manage categories (matches products policy)
DROP POLICY IF EXISTS "Manage categories" ON categories;
CREATE POLICY "Manage categories" ON categories FOR ALL USING (true) WITH CHECK (true);
