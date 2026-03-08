CREATE OR REPLACE FUNCTION public.add_points(
  _user_id uuid,
  _points integer,
  _transaction_type text,
  _description text DEFAULT NULL,
  _reference_type text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the user to add points for themselves
  IF _user_id != auth.uid() THEN RETURN false; END IF;
  
  -- Cap points per transaction (max 2500 to allow large achievement rewards, min 0)
  IF _points > 2500 OR _points < 0 THEN RETURN false; END IF;
  
  -- Validate transaction type
  IF _transaction_type NOT IN ('workout', 'meditation', 'breathing', 'mood_log', 'achievement', 'streak_bonus', 'community_join', 'event_attend') THEN
    RETURN false;
  END IF;

  INSERT INTO point_transactions (user_id, points, transaction_type, description, reference_type, reference_id)
  VALUES (_user_id, _points, _transaction_type, _description, _reference_type, _reference_id);
  
  -- Update total_points in gamification stats
  UPDATE user_gamification 
  SET total_points = total_points + _points,
      updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN true;
END;
$$;