-- SPEC-201: development-only repeatable migration, applied after schema migrations.
-- Public test password: Hesperides2026. Never run against real user data.
INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active, must_change_password)
SELECT fixture.email, '$2a$10$4r8g9MXWvnVXpz.Z5AIjRO/OsgquCUkP3xribRDZTpWkIJB06V22y',
       fixture.first_name, 'Demostración', ci.id, TRUE, FALSE
FROM (VALUES
 ('capataz@demo.invalid', 'Capataz', 'SUPERVISOR'),
 ('otro-capataz@demo.invalid', 'Otro capataz', 'SUPERVISOR'),
 ('coordinador@demo.invalid', 'Coordinador', 'COORDINADOR')
) AS fixture(email,first_name,role_code)
JOIN catalog_types ct ON ct.code='ROLE'
JOIN catalog_items ci ON ci.catalog_type_id=ct.id AND ci.code=fixture.role_code
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email=fixture.email AND u.deleted_at IS NULL);

INSERT INTO teams (code,name,supervisor_user_id)
SELECT fixture.code, fixture.name, u.id
FROM (VALUES
 ('DEMO-INC-1','Cuadrilla de demostración','capataz@demo.invalid'),
 ('DEMO-INC-2','Otra cuadrilla de demostración','otro-capataz@demo.invalid')
) AS fixture(code,name,email)
JOIN users u ON u.email=fixture.email AND u.deleted_at IS NULL
WHERE NOT EXISTS (SELECT 1 FROM teams t WHERE t.code=fixture.code AND t.deleted_at IS NULL);

-- Eight incidents: two per state, four per team. Coordinates are illustrative.
-- Only newly inserted incidents receive work/history. Rerunning never resets
-- an incident that someone has edited, approved or resolved during the demo.
WITH fixtures (
    seed_number, team_code, status_code, age, original_description, description,
    location_reference, latitude, longitude, type_code, urgency_code,
    first_work, first_activity, second_work, second_activity, completed_work_count
) AS (VALUES
    (1, 'DEMO-INC-1', 'PENDING_APPROVAL', INTERVAL '1 hour',
     'Rama caída en puerta principal.', 'Rama caída en puerta principal.',
     NULL, NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, NULL, 0),
    (2, 'DEMO-INC-2', 'PENDING_APPROVAL', INTERVAL '3 hours',
     'Hay una fuga de agua junto al jardín de Gastronomía.', 'Hay una fuga de agua junto al jardín de Gastronomía.',
     'Jardín frente a Gastronomía, cerca del aspersor.', NULL, NULL, NULL, NULL,
     NULL, NULL, NULL, NULL, 0),
    (3, 'DEMO-INC-1', 'OPEN', INTERVAL '1 day',
     'Mucha hojarasca al costado del Comedor Central.', 'Hojarasca acumulada en el sendero junto al Comedor Central.',
     'Sendero lateral del Comedor Central.', NULL, NULL, 'LEAF_LITTER', 'LOW',
     'Barrer la hojarasca del sendero.', 'LIMPIEZA_HOJARASCA',
     'Recoger los residuos y trasladarlos al punto de acopio.', 'RECOLECCION_HOJARASCA', 0),
    (4, 'DEMO-INC-2', 'OPEN', INTERVAL '2 days',
     'Rama caída frente a Ingeniería de Minas.', 'Rama caída junto al acceso a Ingeniería de Minas.',
     'Jardín frente al acceso de Ingeniería de Minas.', NULL, NULL, 'FALLEN_BRANCH', 'MEDIUM',
     'Retirar la rama del acceso peatonal.', 'RECOLECCION_RAMAS',
     'Trasladar los restos vegetales al punto de acopio.', 'DISPOSICION_RESIDUOS', 0),
    (5, 'DEMO-INC-1', 'IN_PROGRESS', INTERVAL '3 days',
     'Rama caída en el tontódromo, cerca de Letras.', 'Rama caída obstruye parcialmente el sendero del Tontódromo frente a Letras.',
     'Tontódromo, frente a Estudios Generales Letras.', -12.0694, -77.0796, 'FALLEN_BRANCH', 'HIGH',
     'Retirar la rama para liberar el paso peatonal.', 'RECOLECCION_RAMAS',
     'Recoger las ramas pequeñas y limpiar el sendero.', 'DISPOSICION_RESIDUOS', 1),
    (6, 'DEMO-INC-2', 'IN_PROGRESS', INTERVAL '4 days',
     'Fuga de agua en un aspersor del jardín de Arte.', 'Pérdida de agua en la conexión de un aspersor del jardín de Arte.',
     'Jardín de Arte, al lado del camino peatonal.', NULL, NULL, 'WATER_LEAK', 'MEDIUM',
     'Revisar el aspersor y localizar la conexión con pérdida.', 'VERIFICACION_RIEGO',
     'Corregir la conexión y comprobar que no pierda agua.', NULL, 0),
    (7, 'DEMO-INC-1', 'RESOLVED', INTERVAL '6 days',
     'Hojarasca acumulada junto a la Biblioteca Central.', 'Hojarasca acumulada junto a la Biblioteca Central.',
     'Sendero junto al jardín de la Biblioteca Central.', NULL, NULL, 'LEAF_LITTER', 'LOW',
     'Barrer la hojarasca del sendero.', 'LIMPIEZA_HOJARASCA',
     'Recoger los residuos vegetales y trasladarlos al acopio.', 'RECOLECCION_HOJARASCA', 2),
    (8, 'DEMO-INC-2', 'RESOLVED', INTERVAL '8 days',
     'Rama caída cerca de la puerta Urubamba.', 'Rama caída cerca de la puerta Urubamba.',
     'Lado interior de la puerta Urubamba.', -12.0710, -77.0810, 'FALLEN_BRANCH', 'MEDIUM',
     'Retirar la rama del área de tránsito.', 'RECOLECCION_RAMAS',
     'Trasladar los restos vegetales y dejar libre el acceso.', 'DISPOSICION_RESIDUOS', 2)
), prepared AS (
    SELECT f.*, t.id AS team_id, t.supervisor_user_id AS sender_id,
           reviewer.id AS reviewer_id, state.id AS status_id,
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INCIDENT_TYPE' AND ci.code=f.type_code AND ci.deleted_at IS NULL) AS type_id,
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='URGENCY_LEVEL' AND ci.code=f.urgency_code AND ci.deleted_at IS NULL) AS urgency_id,
           ('20000000-0000-4000-8000-' || lpad(f.seed_number::text, 12, '0'))::uuid AS reference,
           CURRENT_TIMESTAMP - f.age AS received_at
    FROM fixtures f
    JOIN teams t ON t.code=f.team_code AND t.deleted_at IS NULL
    JOIN users reviewer ON reviewer.email='coordinador@demo.invalid' AND reviewer.deleted_at IS NULL
    JOIN catalog_types state_type ON state_type.code='INCIDENT_STATUS'
    JOIN catalog_items state ON state.catalog_type_id=state_type.id AND state.code=f.status_code
), inserted AS (
    INSERT INTO incidents (
        original_description, description, location_reference, latitude, longitude,
        incident_type_item_id, urgency_item_id, status_item_id, reported_by_user_id, team_id,
        approved_by_user_id, approved_at, resolved_at, channel, client_reference, request_hash,
        version, created_at, updated_at
    )
    SELECT original_description, description, location_reference, latitude, longitude,
           type_id, urgency_id, status_id, sender_id, team_id,
           CASE WHEN status_code <> 'PENDING_APPROVAL' THEN reviewer_id END,
           CASE WHEN status_code <> 'PENDING_APPROVAL' THEN received_at + INTERVAL '30 minutes' END,
           CASE WHEN status_code = 'RESOLVED' THEN received_at + INTERVAL '4 hours' END,
           'WEB', reference, encode(sha256(convert_to('SPEC-200 demo incident ' || seed_number, 'UTF8')), 'hex'),
           CASE status_code WHEN 'PENDING_APPROVAL' THEN 0 WHEN 'OPEN' THEN 1 WHEN 'IN_PROGRESS' THEN 2 ELSE 3 END,
           received_at,
           received_at + CASE status_code WHEN 'PENDING_APPROVAL' THEN INTERVAL '0 minutes'
               WHEN 'OPEN' THEN INTERVAL '30 minutes' WHEN 'IN_PROGRESS' THEN INTERVAL '75 minutes'
               ELSE INTERVAL '4 hours' END
    FROM prepared
    ON CONFLICT (reported_by_user_id, client_reference) WHERE deleted_at IS NULL DO NOTHING
    RETURNING *
), inserted_work AS (
    INSERT INTO incident_interventions (
        incident_id, description, type_item_id, status_item_id, recorded_by_user_id,
        completed_by_user_id, completed_at, client_reference, request_hash, created_at, updated_at
    )
    SELECT i.id, work.description,
           (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id
            WHERE ct.code='INTERVENTION_TYPE' AND ci.code=work.activity AND ci.deleted_at IS NULL),
           state.id, i.approved_by_user_id,
           CASE WHEN work.position <= f.completed_work_count THEN i.reported_by_user_id END,
           CASE WHEN work.position <= f.completed_work_count THEN i.approved_at + work.position * INTERVAL '1 hour' END,
           ('21000000-0000-4000-8000-' || lpad((f.seed_number * 10 + work.position)::text, 12, '0'))::uuid,
           encode(sha256(convert_to(work.description, 'UTF8')), 'hex'),
           i.approved_at + INTERVAL '15 minutes',
           i.approved_at + CASE WHEN work.position <= f.completed_work_count THEN work.position * INTERVAL '1 hour'
               ELSE INTERVAL '15 minutes' END
    FROM inserted i
    JOIN prepared f ON f.reference=i.client_reference
    CROSS JOIN LATERAL (VALUES (1, f.first_work, f.first_activity), (2, f.second_work, f.second_activity))
        AS work(position, description, activity)
    JOIN catalog_types state_type ON state_type.code='INTERVENTION_STATUS'
    JOIN catalog_items state ON state.catalog_type_id=state_type.id
        AND state.code=CASE WHEN work.position <= f.completed_work_count THEN 'COMPLETED' ELSE 'ASSIGNED' END
    WHERE i.approved_at IS NOT NULL
    RETURNING id
)
INSERT INTO incident_status_history (incident_id, status_item_id, changed_by_user_id, created_at, updated_at)
SELECT i.id, state.id, event.actor_id, event.occurred_at, event.occurred_at
FROM inserted i
JOIN prepared f ON f.reference=i.client_reference
CROSS JOIN LATERAL (VALUES
    ('PENDING_APPROVAL', i.reported_by_user_id, i.created_at),
    ('OPEN', i.approved_by_user_id, i.approved_at),
    ('IN_PROGRESS', i.reported_by_user_id,
        CASE WHEN f.status_code IN ('IN_PROGRESS', 'RESOLVED') THEN i.approved_at + INTERVAL '45 minutes' END),
    ('RESOLVED', i.reported_by_user_id, i.resolved_at)
) AS event(status_code, actor_id, occurred_at)
JOIN catalog_types state_type ON state_type.code='INCIDENT_STATUS'
JOIN catalog_items state ON state.catalog_type_id=state_type.id AND state.code=event.status_code
WHERE event.occurred_at IS NOT NULL;
