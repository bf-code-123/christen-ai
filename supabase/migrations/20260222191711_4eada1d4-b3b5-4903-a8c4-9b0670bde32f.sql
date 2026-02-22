
-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_name TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  group_size INTEGER NOT NULL DEFAULT 4,
  geography TEXT[] DEFAULT '{}',
  vibe TEXT,
  skill_min TEXT DEFAULT 'beginner',
  skill_max TEXT DEFAULT 'intermediate',
  has_non_skiers BOOLEAN DEFAULT false,
  non_skier_importance INTEGER DEFAULT 50,
  budget_type TEXT DEFAULT 'per_person',
  budget_amount INTEGER DEFAULT 2000,
  pass_types TEXT[] DEFAULT '{}',
  lodging_preference TEXT DEFAULT 'no_preference',
  organizer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guests table
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_city TEXT,
  airport_code TEXT,
  skill_level TEXT DEFAULT 'intermediate',
  budget_min INTEGER,
  budget_max INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Trips: anyone can create and read (no auth required for this app)
CREATE POLICY "Anyone can create trips" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read trips" ON public.trips FOR SELECT USING (true);
CREATE POLICY "Anyone can update trips" ON public.trips FOR UPDATE USING (true);

-- Guests: anyone can CRUD (guest flow doesn't require auth)
CREATE POLICY "Anyone can create guests" ON public.guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read guests" ON public.guests FOR SELECT USING (true);
CREATE POLICY "Anyone can update guests" ON public.guests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete guests" ON public.guests FOR DELETE USING (true);

-- Enable realtime for guests table
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
