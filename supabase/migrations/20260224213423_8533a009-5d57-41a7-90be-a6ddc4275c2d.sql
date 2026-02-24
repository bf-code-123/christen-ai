
-- Validation trigger for guests table to enforce input constraints server-side
CREATE OR REPLACE FUNCTION public.validate_guest_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Name: required, 1-100 chars
  IF NEW.name IS NULL OR char_length(trim(NEW.name)) = 0 OR char_length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Guest name must be between 1 and 100 characters';
  END IF;

  -- Origin city: optional, max 100 chars
  IF NEW.origin_city IS NOT NULL AND char_length(NEW.origin_city) > 100 THEN
    RAISE EXCEPTION 'Origin city must be 100 characters or less';
  END IF;

  -- Airport code: optional, must be 3-4 uppercase letters
  IF NEW.airport_code IS NOT NULL AND NEW.airport_code !~ '^[A-Z]{3,4}$' THEN
    RAISE EXCEPTION 'Airport code must be 3-4 uppercase letters';
  END IF;

  -- Notes: optional, max 500 chars
  IF NEW.notes IS NOT NULL AND char_length(NEW.notes) > 500 THEN
    RAISE EXCEPTION 'Notes must be 500 characters or less';
  END IF;

  -- Budget range: 0-100000, max >= min
  IF NEW.budget_min IS NOT NULL AND (NEW.budget_min < 0 OR NEW.budget_min > 100000) THEN
    RAISE EXCEPTION 'Budget min must be between 0 and 100000';
  END IF;

  IF NEW.budget_max IS NOT NULL AND (NEW.budget_max < 0 OR NEW.budget_max > 100000) THEN
    RAISE EXCEPTION 'Budget max must be between 0 and 100000';
  END IF;

  IF NEW.budget_min IS NOT NULL AND NEW.budget_max IS NOT NULL AND NEW.budget_max < NEW.budget_min THEN
    RAISE EXCEPTION 'Budget max must be greater than or equal to budget min';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger on INSERT and UPDATE
CREATE TRIGGER validate_guest_input_trigger
  BEFORE INSERT OR UPDATE ON public.guests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_guest_input();
