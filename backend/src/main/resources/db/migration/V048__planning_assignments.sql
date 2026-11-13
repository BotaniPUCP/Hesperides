-- Propietaria: SPEC-203 (planificación preventiva por asignación de frecuencias)
--
-- Un conjunto ya no declara actividades: dice dónde (jardines y ejemplares). Qué
-- se planifica en él es una asignación de una frecuencia a ese conjunto, que se
-- hace en Planificación. Una frecuencia «para conjuntos» ya no nombra un
-- conjunto: es una regla que se asigna a los que la necesiten.

-- ── 1. La identidad de una regla ──
-- Editar una frecuencia abre una versión nueva (fila nueva). La asignación tiene
-- que seguir a la regla y no a una versión, así que cada cadena de versiones
-- comparte una clave. Las existentes se agrupan por lo que hasta hoy las hacía
-- únicas: actividad, modalidad, alcance y conjunto.
ALTER TABLE maintenance_frequencies ADD COLUMN rule_key UUID;

WITH chains AS (
    SELECT activity_type_item_id, regime, scope, COALESCE(green_area_set_id, 0) AS set_key, gen_random_uuid() AS rule_key
    FROM maintenance_frequencies
    GROUP BY activity_type_item_id, regime, scope, COALESCE(green_area_set_id, 0)
)
UPDATE maintenance_frequencies f SET rule_key = c.rule_key
FROM chains c
WHERE f.activity_type_item_id = c.activity_type_item_id AND f.regime = c.regime AND f.scope = c.scope
  AND COALESCE(f.green_area_set_id, 0) = c.set_key;

ALTER TABLE maintenance_frequencies ALTER COLUMN rule_key SET DEFAULT gen_random_uuid();
ALTER TABLE maintenance_frequencies ALTER COLUMN rule_key SET NOT NULL;

-- ── 2. Alcance «para conjuntos» sin conjunto ──
-- green_area_set_id se conserva para el histórico, pero ya no se exige ni se usa.
ALTER TABLE maintenance_frequencies DROP CONSTRAINT chk_freq_set_required;
DROP INDEX idx_maint_freq_unique_current;

-- De todo el campus, una sola vigente por actividad y modalidad. Para conjuntos
-- puede haber varias por actividad (por ejemplo, riego normal y riego intensivo).
CREATE UNIQUE INDEX idx_maint_freq_unique_campus
    ON maintenance_frequencies (activity_type_item_id, regime)
    WHERE scope = 'CAMPUS_WIDE' AND deleted_at IS NULL AND valid_to IS NULL;
-- Cada regla tiene a lo más una versión vigente.
CREATE UNIQUE INDEX idx_maint_freq_one_current_per_rule
    ON maintenance_frequencies (rule_key) WHERE deleted_at IS NULL AND valid_to IS NULL;

-- ── 3. Las asignaciones ──
-- Una por conjunto y actividad: dos reglas de la misma actividad en un conjunto
-- darían dos estados que se contradicen. Sin regla (frequency_rule_key nulo), la
-- tarjeta sale «Sin frecuencia configurada».
CREATE TABLE planning_assignments (
    id                    BIGSERIAL PRIMARY KEY,
    set_id                BIGINT NOT NULL REFERENCES green_area_sets(id),
    activity_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    frequency_rule_key    UUID,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE UNIQUE INDEX idx_planning_assignments_active
    ON planning_assignments (set_id, activity_type_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_planning_assignments_rule
    ON planning_assignments (frequency_rule_key) WHERE deleted_at IS NULL;

-- ── 4. Lo que ya existe se convierte, sin perder tarjetas ──
-- Cada actividad declarada en un conjunto pasa a ser una asignación a la regla
-- vigente de todo el campus de personal propio de esa actividad, si la hay.
INSERT INTO planning_assignments (set_id, activity_type_item_id, frequency_rule_key)
SELECT ga.set_id, ga.activity_type_item_id,
       (SELECT f.rule_key FROM maintenance_frequencies f
        WHERE f.activity_type_item_id = ga.activity_type_item_id AND f.scope = 'CAMPUS_WIDE' AND f.regime = 'IN_HOUSE'
          AND f.is_active AND f.valid_to IS NULL AND f.deleted_at IS NULL
        LIMIT 1)
FROM green_area_set_activities ga
JOIN green_area_sets s ON s.id = ga.set_id AND s.deleted_at IS NULL
WHERE ga.deleted_at IS NULL;

-- Cada frecuencia propia de un conjunto (de personal propio) pasa a ser su
-- asignación: manda sobre la de todo el campus, como mandaba antes.
INSERT INTO planning_assignments (set_id, activity_type_item_id, frequency_rule_key)
SELECT f.green_area_set_id, f.activity_type_item_id, f.rule_key
FROM maintenance_frequencies f
JOIN green_area_sets s ON s.id = f.green_area_set_id AND s.deleted_at IS NULL
WHERE f.scope = 'BY_SET' AND f.regime = 'IN_HOUSE' AND f.is_active
  AND f.valid_to IS NULL AND f.deleted_at IS NULL
ON CONFLICT (set_id, activity_type_item_id) WHERE deleted_at IS NULL
DO UPDATE SET frequency_rule_key = EXCLUDED.frequency_rule_key, updated_at = CURRENT_TIMESTAMP;
