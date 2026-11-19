-- SPEC-201 §4 (rediseño del 15 nov 2026). Propietaria: SPEC-201.
--
-- Vuelve a la definición de septiembre: tres estados, modelo propio sin la matriz OSG del
-- cliente y sin correlativo OSG propio. Conserva los vínculos N:M con intervenciones reales.
-- Las bases solo tienen incidencias de demostración (las reales viven en documentos
-- privados), pero igual se convierten las filas existentes en vez de borrarlas.

-- ── Estados: Reportada → En proceso → Cerrada ───────────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, v.code, v.label, v.position FROM (VALUES
    ('REPORTED', 'Reportada', 1),
    ('CLOSED', 'Cerrada', 3)
) AS v(code, label, position) JOIN catalog_types ct ON ct.code = 'INCIDENT_STATUS';
UPDATE catalog_items SET label = 'En proceso', sort_order = 2
 WHERE code = 'IN_PROGRESS' AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS');
UPDATE catalog_types SET description = 'Reportada, En proceso y Cerrada (catálogo 5.3)' WHERE code = 'INCIDENT_STATUS';

CREATE TEMPORARY TABLE incident_status_map (old_code VARCHAR(50) PRIMARY KEY, new_code VARCHAR(50) NOT NULL) ON COMMIT DROP;
INSERT INTO incident_status_map VALUES
    ('PENDING_APPROVAL', 'REPORTED'), ('OPEN', 'REPORTED'), ('CHANGES_REQUESTED', 'REPORTED'),
    ('RESOLUTION_OBSERVED', 'IN_PROGRESS'), ('RESOLVED', 'CLOSED');

-- Una incidencia abierta está En proceso solo si ya tiene trabajo vinculado (§3.5).
UPDATE incidents i SET status_item_id = s.id
  FROM catalog_items s JOIN catalog_types ct ON ct.id = s.catalog_type_id AND ct.code = 'INCIDENT_STATUS'
 WHERE s.code = CASE
     WHEN i.resolved_at IS NOT NULL THEN 'CLOSED'
     WHEN EXISTS (SELECT 1 FROM incident_intervention_links l
                   WHERE l.incident_id = i.id AND l.deleted_at IS NULL) THEN 'IN_PROGRESS'
     ELSE 'REPORTED' END;

UPDATE incident_status_history h SET status_item_id = n.id
  FROM catalog_items o JOIN incident_status_map m ON m.old_code = o.code,
       catalog_items n
 WHERE h.status_item_id = o.id
   AND o.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS')
   AND n.catalog_type_id = o.catalog_type_id AND n.code = m.new_code;

DELETE FROM catalog_items
 WHERE catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS')
   AND code IN (SELECT old_code FROM incident_status_map);

-- ── Activación y cierre ─────────────────────────────────────────────────────────────────
ALTER TABLE incidents RENAME COLUMN approved_at TO activated_at;
ALTER TABLE incidents RENAME COLUMN approved_by_user_id TO activated_by_user_id;
ALTER TABLE incidents RENAME COLUMN resolved_at TO closed_at;
ALTER TABLE incidents RENAME COLUMN resolved_by_user_id TO closed_by_user_id;

-- ── Retiro de la matriz OSG (fuera-de-alcance.md: no se custodia) ───────────────────────
DROP TABLE incident_impacts;
DROP TABLE incident_interventions;
ALTER TABLE incident_intervention_links DROP COLUMN purpose_item_id;
DROP INDEX IF EXISTS idx_incidents_official_number;
ALTER TABLE incidents
    DROP COLUMN official_number,
    DROP COLUMN event_item_id,
    DROP COLUMN service_group_item_id,
    DROP COLUMN service_item_id,
    DROP COLUMN company_item_id,
    DROP COLUMN process_item_id,
    DROP COLUMN subprocess_item_id,
    DROP COLUMN severity_item_id,
    DROP COLUMN responsible_user_id,
    DROP COLUMN immediate_action,
    DROP COLUMN root_cause_item_id,
    DROP COLUMN root_cause,
    DROP COLUMN preventive_action,
    DROP COLUMN impacted_process,
    DROP COLUMN observations,
    DROP COLUMN reviewed_at,
    DROP COLUMN closure_business_days,
    DROP COLUMN correction_reason,
    DROP COLUMN resolution_observation;
DROP SEQUENCE incident_official_number_seq;

-- Borrado físico a propósito: son textos de la matriz confidencial del cliente.
DELETE FROM catalog_items WHERE catalog_type_id IN (SELECT id FROM catalog_types WHERE code IN (
    'INCIDENT_SERVICE_GROUP', 'INCIDENT_SERVICE', 'INCIDENT_COMPANY', 'INCIDENT_PROCESS', 'INCIDENT_SUBPROCESS',
    'INCIDENT_ROOT_CAUSE', 'INCIDENT_IMPACT', 'INCIDENT_EVENT', 'INCIDENT_SEVERITY', 'INCIDENT_ACTION_PURPOSE'))
    AND parent_item_id IS NOT NULL;
DELETE FROM catalog_items WHERE catalog_type_id IN (SELECT id FROM catalog_types WHERE code IN (
    'INCIDENT_SERVICE_GROUP', 'INCIDENT_SERVICE', 'INCIDENT_COMPANY', 'INCIDENT_PROCESS', 'INCIDENT_SUBPROCESS',
    'INCIDENT_ROOT_CAUSE', 'INCIDENT_IMPACT', 'INCIDENT_EVENT', 'INCIDENT_SEVERITY', 'INCIDENT_ACTION_PURPOSE'));
DELETE FROM catalog_types WHERE code IN (
    'INCIDENT_SERVICE_GROUP', 'INCIDENT_SERVICE', 'INCIDENT_COMPANY', 'INCIDENT_PROCESS', 'INCIDENT_SUBPROCESS',
    'INCIDENT_ROOT_CAUSE', 'INCIDENT_IMPACT', 'INCIDENT_EVENT', 'INCIDENT_SEVERITY', 'INCIDENT_ACTION_PURPOSE');

-- ── Datos nuevos de la incidencia ───────────────────────────────────────────────────────
ALTER TABLE incidents
    ADD COLUMN code VARCHAR(20),
    ADD COLUMN title VARCHAR(120),
    -- La gravedad que marcó quien reportó; la vigente es urgency_item_id (§9).
    ADD COLUMN reported_urgency_item_id BIGINT REFERENCES catalog_items(id),
    ADD COLUMN zone_id BIGINT REFERENCES zones(id),
    ADD COLUMN third_party BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN provider_organization_id BIGINT REFERENCES organizations(id),
    ADD COLUMN agreed_days INTEGER CHECK (agreed_days BETWEEN 1 AND 90),
    ADD COLUMN height_class VARCHAR(20)
        CHECK (height_class IN ('UNDER_5M', 'OVER_5M', 'UNCLASSIFIED', 'NOT_APPLICABLE')),
    -- Se congela al cerrar; las cerradas antes del rediseño no tienen plazo y quedan nulas.
    ADD COLUMN deadline_met BOOLEAN,
    ADD COLUMN requested_by_organization_id BIGINT REFERENCES organizations(id),
    ADD COLUMN requested_by_name VARCHAR(200),
    ADD COLUMN requester_contact_id BIGINT REFERENCES contacts(id),
    ADD COLUMN requested_for_organization_id BIGINT REFERENCES organizations(id),
    -- Código OSG o de Centuria que emite la universidad, si existe (SPEC-005 §4.3).
    ADD COLUMN external_code VARCHAR(40),
    ADD COLUMN source_item_id BIGINT REFERENCES catalog_items(id),
    -- Estado técnico del trabajo en segundo plano, no un estado de negocio: por eso no es catálogo.
    ADD COLUMN prefill_status VARCHAR(15) NOT NULL DEFAULT 'PENDING'
        CHECK (prefill_status IN ('NOT_REQUESTED', 'PENDING', 'READY', 'FAILED')),
    ADD COLUMN prefill_suggestion JSONB,
    ADD COLUMN prefill_updated_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN edited_fields TEXT[] NOT NULL DEFAULT '{}';

UPDATE incidents SET reported_urgency_item_id = urgency_item_id,
                     prefill_status = 'NOT_REQUESTED',
                     requested_by_name = 'Áreas verdes (hallazgo en campo)';

ALTER TABLE incidents
    ADD CONSTRAINT chk_incidents_requested_by
        CHECK (requested_by_organization_id IS NOT NULL OR requested_by_name IS NOT NULL),
    ADD CONSTRAINT chk_incidents_requested_for
        CHECK (requested_for_organization_id IS DISTINCT FROM requested_by_organization_id
               OR requested_for_organization_id IS NULL);

-- ── Código INC-AAAA-NNNN, correlativo por año de recepción en hora de Lima ──────────────
CREATE TABLE incident_code_counters (
    year        INTEGER PRIMARY KEY,
    last_number BIGINT NOT NULL CHECK (last_number >= 0)
);

WITH numbered AS (
    SELECT id, extract(YEAR FROM created_at AT TIME ZONE 'America/Lima')::INTEGER AS year,
           row_number() OVER (PARTITION BY extract(YEAR FROM created_at AT TIME ZONE 'America/Lima')
                              ORDER BY created_at, id) AS number
      FROM incidents
)
UPDATE incidents i SET code = 'INC-' || n.year || '-' || lpad(n.number::TEXT, 4, '0')
  FROM numbered n WHERE n.id = i.id;

INSERT INTO incident_code_counters (year, last_number)
SELECT extract(YEAR FROM created_at AT TIME ZONE 'America/Lima')::INTEGER, count(*)
  FROM incidents GROUP BY 1;

ALTER TABLE incidents ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX idx_incidents_code ON incidents(code);
CREATE INDEX idx_incidents_zone ON incidents(zone_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_open ON incidents(status_item_id, activated_at) WHERE deleted_at IS NULL AND closed_at IS NULL;

-- ── Vínculos: quitar uno exige motivo (§3.8) ────────────────────────────────────────────
ALTER TABLE incident_intervention_links
    ADD COLUMN removed_by_user_id BIGINT REFERENCES users(id),
    ADD COLUMN removal_reason TEXT;

-- ── Tipos de incidencia: lista propia y provisional (catálogo 5.7) ──────────────────────
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('INCIDENT_CLASS', 'Clases de incidencia', 'Agrupan los tipos de incidencia (lista propia, provisional)', FALSE);
UPDATE catalog_types SET description = 'Lista propia y provisional (catálogo 5.7), agrupada por clase'
 WHERE code = 'INCIDENT_TYPE';
UPDATE catalog_items SET is_active = FALSE
 WHERE catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_TYPE');

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, v.code, v.label, v.position FROM (VALUES
    ('TREES', 'Arbolado', 1),
    ('PLANT_HEALTH', 'Sanidad vegetal', 2),
    ('IRRIGATION', 'Riego', 3),
    ('LAWN_AND_GARDENS', 'Césped y jardines', 4),
    ('GREEN_INFRASTRUCTURE', 'Infraestructura verde', 5)
) AS v(code, label, position) JOIN catalog_types ct ON ct.code = 'INCIDENT_CLASS';

INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order)
SELECT t.id, p.id, v.code, v.label, v.position FROM (VALUES
    ('TREES', 'BRANCH_AT_RISK', 'Rama en riesgo de caída', 1),
    ('TREES', 'FALLEN_TREE', 'Árbol caído', 2),
    ('TREES', 'LEANING_TREE', 'Árbol inclinado o con raíces expuestas', 3),
    ('PLANT_HEALTH', 'PEST', 'Plaga', 4),
    ('PLANT_HEALTH', 'DISEASE', 'Enfermedad o marchitez', 5),
    ('IRRIGATION', 'LEAK_OR_BROKEN_SPRINKLER', 'Fuga o aspersor roto', 6),
    ('IRRIGATION', 'NO_IRRIGATION', 'Zona sin riego', 7),
    ('LAWN_AND_GARDENS', 'EVENT_DAMAGE', 'Daño por evento o préstamo', 8),
    ('LAWN_AND_GARDENS', 'WEEDS_OR_OBSTRUCTION', 'Obstrucción o maleza', 9),
    ('GREEN_INFRASTRUCTURE', 'PLANTER_OR_FURNITURE_DAMAGE', 'Daño a jardinera o mobiliario', 10)
) AS v(class_code, code, label, position)
JOIN catalog_types t ON t.code = 'INCIDENT_TYPE'
JOIN catalog_items p ON p.code = v.class_code
 AND p.catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_CLASS');

-- ── Historial: clases nuevas; las de la versión anterior quedan solo para filas viejas ──
UPDATE catalog_items SET is_active = FALSE
 WHERE catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'INCIDENT_UPDATE_KIND')
   AND code IN ('WORK_ADDED', 'WORK_COMPLETED', 'REPORT_RETURNED', 'REPORT_RESUBMITTED',
                'RESOLUTION_OBSERVED', 'RESOLVED');
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT ct.id, v.code, v.label, v.position FROM (VALUES
    ('ACTIVATED', 'Incidencia activada', 11),
    ('CLOSED', 'Incidencia cerrada', 12),
    ('INTERVENTION_REPLACED', 'Intervención reemplazada', 13),
    ('PREFILL', 'Prellenado por IA', 14)
) AS v(code, label, position) JOIN catalog_types ct ON ct.code = 'INCIDENT_UPDATE_KIND';

-- ── Plazos provisionales, editables por ADMIN (catálogo 5.6) ────────────────────────────
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable) VALUES
    ('INCIDENT_DEADLINE_HIGH_HOURS', 'Plazo de incidencias de urgencia alta (horas)', '24', 'INTEGER',
     'Provisional, a confirmar con el cliente. Personal propio; un tercero se rige por los días pactados.', TRUE),
    ('INCIDENT_DEADLINE_MEDIUM_HOURS', 'Plazo de incidencias de urgencia media (horas)', '48', 'INTEGER',
     'Provisional, a confirmar con el cliente. Personal propio; un tercero se rige por los días pactados.', TRUE),
    ('INCIDENT_DEADLINE_LOW_HOURS', 'Plazo de incidencias de urgencia baja (horas)', '72', 'INTEGER',
     'Provisional, a confirmar con el cliente. Personal propio; un tercero se rige por los días pactados.', TRUE);
