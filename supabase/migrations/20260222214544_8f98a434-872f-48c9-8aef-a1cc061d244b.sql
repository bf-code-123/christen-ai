
-- Add user_id to trips table
ALTER TABLE public.trips ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Update trips RLS =====
-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can create trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can read trips" ON public.trips;
DROP POLICY IF EXISTS "Anyone can update trips" ON public.trips;

-- Only authenticated users can create trips (must set user_id)
CREATE POLICY "Authenticated users can create trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anyone can read trips (needed for invite/share pages - UUID is the access token)
CREATE POLICY "Anyone can read trips"
  ON public.trips FOR SELECT
  USING (true);

-- Only trip owner can update
CREATE POLICY "Trip owner can update"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only trip owner can delete
CREATE POLICY "Trip owner can delete"
  ON public.trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ===== Update guests RLS =====
DROP POLICY IF EXISTS "Anyone can create guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can read guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can update guests" ON public.guests;
DROP POLICY IF EXISTS "Anyone can delete guests" ON public.guests;

-- Anyone can add guests (needed for invite form - no auth required)
CREATE POLICY "Anyone can insert guests"
  ON public.guests FOR INSERT
  WITH CHECK (true);

-- Anyone can read guests (needed for invite/share pages)
CREATE POLICY "Anyone can read guests"
  ON public.guests FOR SELECT
  USING (true);

-- Only trip owner can update guests
CREATE POLICY "Trip owner can update guests"
  ON public.guests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = guests.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Only trip owner can delete guests
CREATE POLICY "Trip owner can delete guests"
  ON public.guests FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = guests.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ===== Update recommendations RLS =====
DROP POLICY IF EXISTS "Anyone can create recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Anyone can read recommendations" ON public.recommendations;

-- Anyone can read recommendations (needed for share page)
CREATE POLICY "Anyone can read recommendations"
  ON public.recommendations FOR SELECT
  USING (true);

-- Only trip owner can create recommendations (via edge function with service role, so this is for direct access)
CREATE POLICY "Trip owner can insert recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = recommendations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ===== Update flight_cache RLS =====
-- Flight cache stays public (non-sensitive pricing data)
