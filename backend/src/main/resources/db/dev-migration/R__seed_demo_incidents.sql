-- SPEC-201 (rediseño del 15 nov 2026): datos de demostración, solo con el perfil dev.
-- Contraseña pública de prueba: Hesperides2026. Nunca correr sobre datos reales.
--
-- Muestra el flujo nuevo sin fabricar trabajo: reportes no activos (con y sin prellenado),
-- activos a tiempo, por vencer y vencidos, y uno de un tercero. No hay cerradas porque
-- cerrar exige intervenciones validadas de verdad (§3.8); se demuestran creándolas en la app.
-- Repetirlo solo inserta lo que falta y nunca deshace lo que alguien cambió en la demo.

INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active, must_change_password)
SELECT fixture.email, '$2a$10$4r8g9MXWvnVXpz.Z5AIjRO/OsgquCUkP3xribRDZTpWkIJB06V22y',
       fixture.first_name, 'Demostración', ci.id, TRUE, FALSE
FROM (VALUES
 ('capataz@demo.invalid', 'Capataz', 'SUPERVISOR'),
 ('otro-capataz@demo.invalid', 'Otro capataz', 'SUPERVISOR'),
 ('coordinador@demo.invalid', 'Coordinador', 'COORDINADOR'),
 ('operario@demo.invalid', 'Operario', 'OPERARIO')
) AS fixture(email, first_name, role_code)
JOIN catalog_types ct ON ct.code = 'ROLE'
JOIN catalog_items ci ON ci.catalog_type_id = ct.id AND ci.code = fixture.role_code
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = fixture.email AND u.deleted_at IS NULL);

INSERT INTO teams (code, name, supervisor_user_id)
SELECT fixture.code, fixture.name, u.id
FROM (VALUES
 ('DEMO-INC-1', 'Cuadrilla de demostración', 'capataz@demo.invalid'),
 ('DEMO-INC-2', 'Otra cuadrilla de demostración', 'otro-capataz@demo.invalid')
) AS fixture(code, name, email)
JOIN users u ON u.email = fixture.email AND u.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.code = fixture.code AND t.deleted_at IS NULL);

INSERT INTO organizations (name, type_item_id)
SELECT 'Arbolistas de demostración (ficticia)', ci.id
FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
WHERE ct.code = 'ORGANIZATION_TYPE' AND ci.code = 'EXTERNAL_COMPANY'
  AND NOT EXISTS (SELECT 1 FROM organizations o
                  WHERE o.name = 'Arbolistas de demostración (ficticia)' AND o.deleted_at IS NULL);

DO $$
DECLARE
    f RECORD;
    new_id BIGINT;
    received TIMESTAMPTZ;
    seq BIGINT;
    zone BIGINT := (SELECT z.id FROM zones z JOIN catalog_items t ON t.id = z.zone_type_item_id
                     WHERE t.code = 'SECTION' AND z.boundary IS NOT NULL AND z.deleted_at IS NULL
                     ORDER BY z.id LIMIT 1);
    coordinator BIGINT := (SELECT id FROM users WHERE email = 'coordinador@demo.invalid' AND deleted_at IS NULL);
    provider BIGINT := (SELECT id FROM organizations
                         WHERE name = 'Arbolistas de demostración (ficticia)' AND deleted_at IS NULL);
BEGIN
    FOR f IN SELECT * FROM (VALUES
        (1, 'capataz@demo.invalid', 'DEMO-INC-1', INTERVAL '30 minutes', 'MEDIUM',
         'Hay una rama rajada sobre el sendero, pasa mucha gente.', NULL, NULL, FALSE, 'NOT_REQUESTED',
         NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, FALSE, NULL::INTEGER, NULL::TEXT),
        (2, 'otro-capataz@demo.invalid', 'DEMO-INC-2', INTERVAL '2 hours', 'LOW',
         'Se rompió un aspersor y sale agua a chorro desde temprano.', NULL, NULL, FALSE, 'READY',
         'Fuga o aspersor roto', 'LEAK_OR_BROKEN_SPRINKLER', NULL, NULL, FALSE, NULL, 'NOT_APPLICABLE'),
        (3, 'operario@demo.invalid', NULL, INTERVAL '5 hours', 'MEDIUM',
         'Encontré cochinilla en los arbustos, varias plantas con hojas pegajosas.', NULL, NULL, FALSE,
         'NOT_REQUESTED', NULL, NULL, NULL, NULL, FALSE, NULL, NULL),
        (4, 'capataz@demo.invalid', 'DEMO-INC-1', INTERVAL '50 hours', 'HIGH',
         'Árbol caído bloquea el paso de estudiantes.', 'Frente a la escalera de Letras', 'zone', TRUE,
         'NOT_REQUESTED', 'Árbol caído', 'FALLEN_TREE', NULL, NULL, FALSE, NULL, 'UNDER_5M'),
        (5, 'otro-capataz@demo.invalid', 'DEMO-INC-2', INTERVAL '40 hours', 'MEDIUM',
         'Plantas marchitas junto a la jardinera.', NULL, NULL, TRUE, 'NOT_REQUESTED',
         'Plantas marchitas', 'DISEASE', -12.0694, -77.0796, FALSE, NULL, 'NOT_APPLICABLE'),
        (6, 'capataz@demo.invalid', 'DEMO-INC-1', INTERVAL '1 day', 'MEDIUM',
         'Ficus de unos 10 metros con una rama grande rajada.', 'Junto a la losa deportiva', 'zone', TRUE,
         'NOT_REQUESTED', 'Rama rajada en ficus alto', 'BRANCH_AT_RISK', NULL, NULL, TRUE, 10, 'OVER_5M')
    ) AS v(n, reporter, team_code, age, urgency, description, reference, zone_flag, active, prefill,
           title, type_code, lat, lng, third_party, agreed_days, height)
    LOOP
        CONTINUE WHEN EXISTS (SELECT 1 FROM incidents
                               WHERE client_reference = ('30000000-0000-4000-8000-' || lpad(f.n::TEXT, 12, '0'))::UUID);
        received := CURRENT_TIMESTAMP - f.age;
        INSERT INTO incident_code_counters (year, last_number)
        VALUES (extract(YEAR FROM received AT TIME ZONE 'America/Lima')::INTEGER, 1)
        ON CONFLICT (year) DO UPDATE SET last_number = incident_code_counters.last_number + 1
        RETURNING last_number INTO seq;

        INSERT INTO incidents (code, title, original_description, description, reported_urgency_item_id,
            urgency_item_id, incident_type_item_id, status_item_id, zone_id, location_reference, latitude, longitude,
            team_id, third_party, provider_organization_id, agreed_days, height_class, requested_by_name,
            reported_by_user_id, activated_by_user_id, activated_at, prefill_status, prefill_suggestion,
            prefill_updated_at, client_reference, request_hash, created_at, updated_at)
        SELECT 'INC-' || extract(YEAR FROM received AT TIME ZONE 'America/Lima')::INTEGER || '-' || lpad(seq::TEXT, 4, '0'),
               f.title, f.description, f.description, u.id, u.id, ty.id, st.id,
               CASE WHEN f.zone_flag = 'zone' THEN zone END, f.reference, f.lat, f.lng,
               tm.id, f.third_party, CASE WHEN f.third_party THEN provider END, f.agreed_days, f.height,
               'Áreas verdes (hallazgo en campo)', rep.id,
               CASE WHEN f.active THEN coordinator END, CASE WHEN f.active THEN received + INTERVAL '20 minutes' END,
               f.prefill,
               CASE WHEN f.prefill = 'READY' THEN jsonb_build_object(
                   'title', f.title, 'typeCode', f.type_code, 'thirdParty', FALSE, 'heightClass', f.height,
                   'imminentRisk', FALSE, 'plan', '1. Cerrar la válvula del sector. 2. Cambiar el cabezal.',
                   'justification', 'Ejemplo de demostración: palabras «aspersor» y «agua».', 'confidence', 0.82) END,
               CASE WHEN f.prefill = 'READY' THEN received + INTERVAL '1 minute' END,
               ('30000000-0000-4000-8000-' || lpad(f.n::TEXT, 12, '0'))::UUID, repeat('0', 64), received, received
        FROM users rep
        JOIN catalog_items u ON u.code = f.urgency
             AND u.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'URGENCY_LEVEL')
        JOIN catalog_items st ON st.code = 'REPORTED'
             AND st.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS')
        LEFT JOIN catalog_items ty ON ty.code = f.type_code
             AND ty.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_TYPE')
             AND (f.active OR f.prefill = 'READY')
        LEFT JOIN teams tm ON tm.code = f.team_code AND tm.deleted_at IS NULL
        WHERE rep.email = f.reporter AND rep.deleted_at IS NULL
        RETURNING id INTO new_id;

        INSERT INTO incident_status_history (incident_id, status_item_id, changed_by_user_id, created_at, updated_at)
        SELECT new_id, status_item_id, reported_by_user_id, received, received FROM incidents WHERE id = new_id;
    END LOOP;
END $$;
