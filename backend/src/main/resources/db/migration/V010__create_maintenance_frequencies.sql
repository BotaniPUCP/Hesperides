-- Propiedad de SPEC-101: Configuración de frecuencias de mantenimiento
--
-- Modela las reglas de periodicidad teórica, rangos operativos, estacionalidad
-- y ciclos de cobertura para las actividades de áreas verdes del campus.
-- Cierra el pendiente P-03 de SPEC-002.

-- 1. Catálogo para tipos de reglas de frecuencia
INSERT INTO catalog_types (code, name, description, is_system)
VALUES ('FREQUENCY_RULE_TYPE', 'Tipos de reglas de frecuencia', 'Modelos de periodicidad para mantenimiento', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
VALUES
    ((SELECT id FROM catalog_types WHERE code = 'FREQUENCY_RULE_TYPE'), 'INTERVAL_DAYS',   'Intervalo por rango de días', 1),
    ((SELECT id FROM catalog_types WHERE code = 'FREQUENCY_RULE_TYPE'), 'SEASONAL_PERIOD', 'Periodicidad estacional / cuota anual', 2),
    ((SELECT id FROM catalog_types WHERE code = 'FREQUENCY_RULE_TYPE'), 'ANNUAL_WINDOW',   'Ventana anual específica', 3),
    ((SELECT id FROM catalog_types WHERE code = 'FREQUENCY_RULE_TYPE'), 'COVERAGE_CYCLE',  'Ciclo rotativo de cobertura', 4),
    ((SELECT id FROM catalog_types WHERE code = 'FREQUENCY_RULE_TYPE'), 'ON_DEMAND',        'A demanda / sin periodicidad fija', 5);

-- 2. Tabla principal de frecuencias de mantenimiento
CREATE TABLE maintenance_frequencies (
    id                          BIGSERIAL PRIMARY KEY,
    activity_type_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    regime                      VARCHAR(20) NOT NULL DEFAULT 'IN_HOUSE',
    frequency_rule_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    scope                       VARCHAR(30) NOT NULL DEFAULT 'CAMPUS_WIDE',
    zone_id                     BIGINT,
    target_days_interval        INT,
    min_days_interval           INT,
    max_days_interval           INT,
    annual_target_count         INT,
    season_modifier             VARCHAR(255),
    coverage_target_days        INT,
    estimated_duration_days     INT,
    notes                       TEXT,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                  TIMESTAMP,

    CONSTRAINT chk_freq_regime CHECK (regime IN ('IN_HOUSE', 'OUTSOURCED')),
    CONSTRAINT chk_freq_scope CHECK (scope IN ('CAMPUS_WIDE', 'BY_SECTOR', 'BY_ZONE')),
    CONSTRAINT chk_freq_interval CHECK (
        (min_days_interval IS NULL AND max_days_interval IS NULL) OR
        (min_days_interval IS NOT NULL AND max_days_interval IS NOT NULL AND min_days_interval <= max_days_interval)
    )
);

CREATE INDEX idx_maint_freq_activity ON maintenance_frequencies(activity_type_item_id);
CREATE INDEX idx_maint_freq_rule_type ON maintenance_frequencies(frequency_rule_type_item_id);
CREATE UNIQUE INDEX idx_maint_freq_unique_active
    ON maintenance_frequencies(activity_type_item_id, regime, scope, COALESCE(zone_id, 0))
    WHERE deleted_at IS NULL;
