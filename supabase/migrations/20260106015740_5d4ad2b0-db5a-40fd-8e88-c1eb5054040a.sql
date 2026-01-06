
-- Create a test group conversation
INSERT INTO conversations (id, type, name, community_id)
VALUES (
  gen_random_uuid(),
  'group',
  'Test Group Chat',
  'd7c1f1c5-9acf-44c3-896b-33b0df79afd5'
)
RETURNING id;
