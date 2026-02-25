-- Add result_json column to flight_cache to store full FlightPicks (cheapest + mostDirect)
-- instead of just a price. Used by fetch-flights for 6-hour caching.
ALTER TABLE public.flight_cache ADD COLUMN IF NOT EXISTS result_json JSONB;
