-- Retired operations accounts retain their former explicit grants.
-- Do not silently promote operations accounts to production reviewers.
WITH affected AS (
  SELECT id, permission_overrides,
    regexp_split_to_array(btrim(roles), '\s*,\s*') AS old_roles
  FROM "user"
  WHERE regexp_split_to_array(btrim(roles), '\s*,\s*') && ARRAY['operations_manager']
), migrated AS (
  UPDATE "user" AS identity
  SET roles = (
      SELECT coalesce(string_agg(DISTINCT role, ',' ORDER BY role), 'employee')
      FROM unnest(affected.old_roles) AS item(role)
      WHERE role <> 'operations_manager'
    ),
    permission_overrides = CASE
      WHEN jsonb_typeof(affected.permission_overrides->'allow') = 'array'
        AND jsonb_typeof(affected.permission_overrides->'deny') = 'array'
      THEN jsonb_set(affected.permission_overrides, '{allow}', (
        SELECT coalesce(jsonb_agg(DISTINCT grant_name), '[]'::jsonb)
        FROM (
          SELECT value AS grant_name
          FROM jsonb_array_elements(affected.permission_overrides->'allow')
          UNION ALL
          SELECT to_jsonb(permission)
          FROM unnest(ARRAY['manage.access', 'attendance.read.team', 'schedule.manage', 'jobs.manage', 'employees.read', 'reports.read']) AS grants(permission)
          WHERE NOT (affected.permission_overrides->'deny') ? permission
        ) AS preserved_grants
      ))
      ELSE affected.permission_overrides
    END,
    updated_at = CURRENT_TIMESTAMP
  FROM affected
  WHERE identity.id = affected.id
  RETURNING identity.id
), audited AS (
  INSERT INTO access_audit (actor_id, target_id, action, reason)
  SELECT NULL, id, 'account.roles_consolidated',
    'გაუქმებული როლების შეცვლა არსებული უფლებების შენარჩუნებით.'
  FROM migrated
)
DELETE FROM "session" WHERE user_id IN (SELECT id FROM migrated);
