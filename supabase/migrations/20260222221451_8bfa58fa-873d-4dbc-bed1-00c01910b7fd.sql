-- Fix overly permissive RLS on flight_cache
-- Edge functions use service_role_key (bypasses RLS), so no public write needed
DROP POLICY IF EXISTS "Anyone can insert flight cache" ON public.flight_cache;
DROP POLICY IF EXISTS "Anyone can update flight cache" ON public.flight_cache;

-- Only authenticated users can read (public reads not needed; edge function uses service role)
DROP POLICY IF EXISTS "Anyone can read flight cache" ON public.flight_cache;
CREATE POLICY "Authenticated users can read flight cache"
  ON public.flight_cache FOR SELECT
  TO authenticated
  USING (true);