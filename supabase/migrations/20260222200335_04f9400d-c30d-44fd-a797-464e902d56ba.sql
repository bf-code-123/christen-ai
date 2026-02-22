
-- Create recommendations table to store AI-generated resort recommendations
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create recommendations" ON public.recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read recommendations" ON public.recommendations FOR SELECT USING (true);

-- Create flight cache table (6-hour TTL managed in code)
CREATE TABLE public.flight_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_airport TEXT NOT NULL,
  destination_airport TEXT NOT NULL,
  departure_date TEXT NOT NULL,
  return_date TEXT NOT NULL,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(origin_airport, destination_airport, departure_date, return_date)
);

ALTER TABLE public.flight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flight cache" ON public.flight_cache FOR SELECT USING (true);
CREATE POLICY "Anyone can insert flight cache" ON public.flight_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update flight cache" ON public.flight_cache FOR UPDATE USING (true);
