-- SPEC-202: development-only repeatable migration, applied after R__seed_demo_incidents.sql.
-- Reuses the demo accounts and teams of SPEC-201 and creates no user, team or incident, so the
-- incidents demo keeps its counts. Dates are relative to CURRENT_DATE. Never run against real data.
-- Only rows that do not exist yet are inserted: rerunning never resets what someone changed.

-- 1. The foreman's team gets a sector, so the SUPERVISOR scope can be tried (D-08). The other
--    demo foreman keeps a team without sector: the "no sector assigned" case.
UPDATE teams t SET zone_id = z.id, updated_at = CURRENT_TIMESTAMP
FROM zones z
WHERE t.code = 'DEMO-INC-1' AND t.deleted_at IS NULL AND t.zone_id IS NULL
  AND z.code = 'SEC-VERDE-02' AND z.deleted_at IS NULL;

-- 2. Three frequencies: one evaluable by place, one outsourced and one for a set of the
--    sector's sections (SPEC-203 D-07). The set is created once and reused.
INSERT INTO green_area_sets (name, description)
SELECT 'Sector verde 02 (demostración)', 'Conjunto de demostración de reportes (SPEC-202)'
WHERE NOT EXISTS (SELECT 1 FROM green_area_sets WHERE name = 'Sector verde 02 (demostración)' AND deleted_at IS NULL);

INSERT INTO green_area_set_zones (set_id, zone_id)
SELECT s.id, child.id
FROM green_area_sets s
JOIN zones sector ON sector.code = 'SEC-VERDE-02' AND sector.deleted_at IS NULL
JOIN zones child ON child.parent_zone_id = sector.id AND child.deleted_at IS NULL
WHERE s.name = 'Sector verde 02 (demostración)' AND s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM green_area_set_zones gz WHERE gz.set_id = s.id AND gz.zone_id = child.id
                  AND gz.deleted_at IS NULL);

INSERT INTO green_area_set_activities (set_id, activity_type_item_id)
SELECT s.id, activity.id
FROM green_area_sets s
JOIN catalog_types activity_type ON activity_type.code = 'INTERVENTION_TYPE'
JOIN catalog_items activity ON activity.catalog_type_id = activity_type.id AND activity.code = 'RIEGO_MANUAL'
WHERE s.name = 'Sector verde 02 (demostración)' AND s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM green_area_set_activities ga WHERE ga.set_id = s.id
                  AND ga.activity_type_item_id = activity.id AND ga.deleted_at IS NULL);

INSERT INTO maintenance_frequencies (activity_type_item_id, frequency_rule_type_item_id, regime, scope,
    green_area_set_id, min_days_interval, max_days_interval, valid_from, notes)
SELECT activity.id, rule.id, f.regime, f.scope, demo_set.id, 1, 10, DATE '2026-01-01',
       'Frecuencia de demostración de reportes (SPEC-202)'
FROM (VALUES
    ('PODA_MANTENIMIENTO', 'IN_HOUSE', 'CAMPUS_WIDE'),
    ('PODA_SANITARIA', 'OUTSOURCED', 'CAMPUS_WIDE'),
    ('RIEGO_MANUAL', 'IN_HOUSE', 'BY_SET')
) AS f(type_code, regime, scope)
JOIN catalog_types activity_type ON activity_type.code = 'INTERVENTION_TYPE'
JOIN catalog_items activity ON activity.catalog_type_id = activity_type.id
    AND activity.code = f.type_code AND activity.deleted_at IS NULL
JOIN catalog_types rule_type ON rule_type.code = 'FREQUENCY_RULE_TYPE'
JOIN catalog_items rule ON rule.catalog_type_id = rule_type.id AND rule.code = 'INTERVAL_DAYS'
LEFT JOIN green_area_sets demo_set ON f.scope = 'BY_SET'
    AND demo_set.name = 'Sector verde 02 (demostración)' AND demo_set.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM maintenance_frequencies m
    WHERE m.activity_type_item_id = activity.id AND m.regime = f.regime AND m.scope = f.scope
      AND COALESCE(m.green_area_set_id, 0) = COALESCE(demo_set.id, 0)
      AND m.deleted_at IS NULL AND m.valid_to IS NULL);

-- 3. Twelve works. Each location names its sector and the n-th section of that sector by code.
--    m0 is the first day of the current month and p0 the first day of the previous one.
WITH bounds AS (
    SELECT date_trunc('month', CURRENT_DATE)::date AS m0,
           (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::date AS p0,
           (date_trunc('month', CURRENT_DATE) - INTERVAL '2 months')::date AS q0
), works (seed_code, team_code, type_code) AS (VALUES
    ('DEMO-REP-01', 'DEMO-INC-1', 'PODA_MANTENIMIENTO'),
    ('DEMO-REP-02', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-03', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-04', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-05', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-06', 'DEMO-INC-1', 'PODA_MANTENIMIENTO'),
    ('DEMO-REP-07', 'DEMO-INC-1', 'PODA_MANTENIMIENTO'),
    ('DEMO-REP-08', 'DEMO-INC-1', 'PODA_MANTENIMIENTO'),
    ('DEMO-REP-09', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-10', 'DEMO-INC-1', 'DESHIERBO'),
    ('DEMO-REP-11', 'DEMO-INC-2', 'DESHIERBO'),
    ('DEMO-REP-12', 'DEMO-INC-1', 'DESHIERBO')
), locations (seed_code, sector_code, section_n, status_code, executed_at) AS (
    SELECT l.seed_code, l.sector_code, l.section_n, l.status_code, l.executed_at
    FROM bounds b CROSS JOIN LATERAL (VALUES
        -- Two works in the same section this month: it is covered once and counted twice.
        ('DEMO-REP-01', 'SEC-VERDE-02', 1, 'VALIDATED', (CURRENT_DATE - 1) + TIME '15:00'),
        ('DEMO-REP-02', 'SEC-VERDE-02', 1, 'VALIDATED', (CURRENT_DATE - 2) + TIME '15:00'),
        ('DEMO-REP-03', 'SEC-VERDE-02', 2, 'VALIDATED', (CURRENT_DATE - 3) + TIME '15:00'),
        ('DEMO-REP-03', 'SEC-VERDE-02', 3, 'VALIDATED', (CURRENT_DATE - 3) + TIME '16:00'),
        -- Executed, one location still waiting for review: pending approval (CA-M01).
        ('DEMO-REP-04', 'SEC-VERDE-02', 4, 'VALIDATED', (CURRENT_DATE - 1) + TIME '14:00'),
        ('DEMO-REP-04', 'SEC-VERDE-02', 5, 'COMPLETED', (CURRENT_DATE - 1) + TIME '15:00'),
        -- 02:00 UTC on the 1st is the evening of the last day of the previous month in Lima (CA-M06).
        ('DEMO-REP-05', 'SEC-VERDE-02', 6, 'VALIDATED', b.m0 + TIME '02:00'),
        -- Previous month: one place overdue and one on target for PODA_MANTENIMIENTO.
        ('DEMO-REP-06', 'SEC-VERDE-02', 7, 'VALIDATED', (b.p0 + 9) + TIME '15:00'),
        ('DEMO-REP-07', 'SEC-VERDE-02', 8, 'VALIDATED', (b.p0 + 17) + TIME '15:00'),
        ('DEMO-REP-08', 'SEC-VERDE-02', 8, 'VALIDATED', (b.p0 + 23) + TIME '15:00'),
        -- Attended two months ago: an unattended section with a known last attention.
        ('DEMO-REP-09', 'SEC-VERDE-02', 9, 'VALIDATED', (b.q0 + 10) + TIME '15:00'),
        -- Observed work never counts.
        ('DEMO-REP-10', 'SEC-VERDE-02', 10, 'OBSERVED', (CURRENT_DATE - 2) + TIME '15:00'),
        -- The other foreman's work in another sector: invisible to the first foreman.
        ('DEMO-REP-11', 'SEC-VERDE-01', 1, 'VALIDATED', (CURRENT_DATE - 2) + TIME '15:00'),
        -- Located only by a point: counts as approved on the campus, covers no section.
        ('DEMO-REP-12', NULL, NULL, 'VALIDATED', (CURRENT_DATE - 2) + TIME '15:00')
    ) AS l(seed_code, sector_code, section_n, status_code, executed_at)
), sections AS (
    SELECT z.id, sector.code AS sector_code,
           row_number() OVER (PARTITION BY sector.code ORDER BY z.code) AS n
    FROM zones z
    JOIN zones sector ON sector.id = z.parent_zone_id AND sector.deleted_at IS NULL
        AND sector.code IN ('SEC-VERDE-01', 'SEC-VERDE-02')
    JOIN catalog_items zone_type ON zone_type.id = z.zone_type_item_id AND zone_type.code = 'SECTION'
    WHERE z.is_active AND z.deleted_at IS NULL
), prepared AS (
    SELECT w.seed_code, t.id AS team_id, t.supervisor_user_id AS foreman_id, coordinator.id AS coordinator_id,
           activity.id AS type_id, activity.parent_item_id AS class_id,
           (SELECT min(l.executed_at)::date FROM locations l WHERE l.seed_code = w.seed_code) AS scheduled_date
    FROM works w
    JOIN teams t ON t.code = w.team_code AND t.deleted_at IS NULL
    JOIN users coordinator ON coordinator.email = 'coordinador@demo.invalid' AND coordinator.deleted_at IS NULL
    JOIN catalog_types activity_type ON activity_type.code = 'INTERVENTION_TYPE'
    JOIN catalog_items activity ON activity.catalog_type_id = activity_type.id
        AND activity.code = w.type_code AND activity.deleted_at IS NULL
    WHERE NOT EXISTS (SELECT 1 FROM interventions i WHERE i.external_code = w.seed_code AND i.deleted_at IS NULL)
), inserted AS (
    INSERT INTO interventions (intervention_class_item_id, intervention_type_item_id, planning_status_item_id,
        team_id, assigned_to_user_id, assigned_by_user_id, created_by_user_id, scheduled_date, description,
        origin_item_id, reported_by_item_id, external_code)
    SELECT p.class_id, p.type_id,
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'INTERVENTION_STATUS' AND ci.code = 'ASSIGNED'),
           p.team_id, p.foreman_id, p.coordinator_id, p.coordinator_id, p.scheduled_date,
           'Trabajo de demostración de reportes (SPEC-202)',
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'INTERVENTION_ORIGIN' AND ci.code = 'MAINTENANCE'),
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
            WHERE ct.code = 'INCIDENT_SOURCE' AND ci.code = 'NONE'),
           p.seed_code
    FROM prepared p
    RETURNING id, external_code, assigned_to_user_id, assigned_by_user_id
)
INSERT INTO intervention_locations (intervention_id, client_reference, zone_id, location, location_description,
    status_item_id, attempt_number, started_at, completed_at, validated_at, executed_by_user_id,
    validated_by_user_id, rejection_reason)
SELECT i.id, gen_random_uuid(), s.id,
       CASE WHEN l.sector_code IS NULL THEN ST_SetSRID(ST_MakePoint(-77.0805, -12.0690), 4326) END,
       CASE WHEN l.sector_code IS NULL THEN 'Punto registrado sin sección (demostración)' END,
       state.id, 1, l.executed_at - INTERVAL '1 hour', l.executed_at,
       CASE WHEN l.status_code = 'VALIDATED' THEN l.executed_at + INTERVAL '2 hours' END,
       i.assigned_to_user_id,
       CASE WHEN l.status_code = 'VALIDATED' THEN i.assigned_by_user_id END,
       CASE WHEN l.status_code = 'OBSERVED' THEN 'Observación de demostración' END
FROM inserted i
JOIN locations l ON l.seed_code = i.external_code
LEFT JOIN sections s ON s.sector_code = l.sector_code AND s.n = l.section_n
JOIN catalog_types state_type ON state_type.code = 'INTERVENTION_STATUS'
JOIN catalog_items state ON state.catalog_type_id = state_type.id AND state.code = l.status_code;

-- 4. The review requires a received photo. The pending location gets one registered as received,
--    so it can be approved from the UI; there is no file behind it and its thumbnail does not load.
INSERT INTO intervention_evidences (intervention_id, intervention_location_id, attempt_number, client_reference,
    moment_item_id, storage_key, original_filename, content_type, size_bytes, content_sha256,
    uploaded_by_user_id, uploaded_at)
SELECT l.intervention_id, l.id, l.attempt_number, gen_random_uuid(),
       (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
        WHERE ct.code = 'EVIDENCE_MOMENT' AND ci.code = 'AFTER'),
       'demo/spec-202/sin-archivo.jpg', 'sin-archivo.jpg', 'image/jpeg', 1, repeat('0', 64),
       l.executed_by_user_id, l.completed_at
FROM intervention_locations l
JOIN interventions i ON i.id = l.intervention_id AND i.external_code = 'DEMO-REP-04' AND i.deleted_at IS NULL
JOIN catalog_items state ON state.id = l.status_item_id AND state.code = 'COMPLETED'
WHERE l.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM intervention_evidences e WHERE e.intervention_location_id = l.id);
