
-- 1. Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can read trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can read guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can read recommendations" ON public.recommendations;

-- 2. Create owner-only SELECT policies
CREATE POLICY "Owner can read own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can read trip guests"
  ON public.guests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = guests.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Owner can read trip recommendations"
  ON public.recommendations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = recommendations.trip_id AND trips.user_id = auth.uid()
  ));

-- 3. Create RPC functions for public UUID-based access (share/invite pages)
CREATE OR REPLACE FUNCTION public.get_public_trip(p_trip_id uuid)
RETURNS TABLE (
  id uuid, trip_name text, organizer_name text, group_size integer,
  date_start date, date_end date, geography text[], skill_min text, skill_max text,
  budget_amount integer, budget_type text, lodging_preference text, pass_types text[],
  has_non_skiers boolean, non_skier_importance integer, vibe text
)
LANGUAGE sql SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT id, trip_name, organizer_name, group_size, date_start, date_end,
         geography, skill_min, skill_max, budget_amount, budget_type,
         lodging_preference, pass_types, has_non_skiers, non_skier_importance, vibe
  FROM public.trips WHERE trips.id = p_trip_id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_guests(p_trip_id uuid)
RETURNS TABLE (
  id uuid, name text, origin_city text, airport_code text,
  skill_level text, budget_min integer, budget_max integer, status text
)
LANGUAGE sql SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT id, name, origin_city, airport_code, skill_level, budget_min, budget_max, status
  FROM public.guests WHERE guests.trip_id = p_trip_id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_recommendations(p_trip_id uuid)
RETURNS TABLE (id uuid, results jsonb, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT id, results, created_at
  FROM public.recommendations
  WHERE recommendations.trip_id = p_trip_id
  ORDER BY created_at DESC LIMIT 1;
$$;
