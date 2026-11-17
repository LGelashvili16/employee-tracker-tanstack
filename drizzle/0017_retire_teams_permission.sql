-- Remove the retired permission without changing any remaining account exceptions.
UPDATE "user"
SET permission_overrides = jsonb_set(
  jsonb_set(permission_overrides, '{allow}', (permission_overrides->'allow') - 'teams.manage'),
  '{deny}', (permission_overrides->'deny') - 'teams.manage'
)
WHERE jsonb_typeof(permission_overrides->'allow') = 'array'
  AND jsonb_typeof(permission_overrides->'deny') = 'array'
  AND ((permission_overrides->'allow') ? 'teams.manage'
    OR (permission_overrides->'deny') ? 'teams.manage');
