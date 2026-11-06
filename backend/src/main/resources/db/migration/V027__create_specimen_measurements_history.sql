-- V027: Historial de mediciones dendrométricas del ejemplar (observación JP / SPEC-103)
-- Permite registrar la evolución del crecimiento en altura, fuste, DAP y copa a lo largo del tiempo.

CREATE TABLE green_element_measurements (
    id                  BIGSERIAL PRIMARY KEY,
    green_element_id    BIGINT NOT NULL REFERENCES green_elements(id) ON DELETE CASCADE,
    measured_at         DATE NOT NULL,
    measured_by_user_id BIGINT REFERENCES users(id),
    height_m            NUMERIC(5, 2) CHECK (height_m IS NULL OR height_m > 0),
    trunk_height_m      NUMERIC(5, 2) CHECK (trunk_height_m IS NULL OR trunk_height_m >= 0),
    dbh_cm              NUMERIC(6, 1) CHECK (dbh_cm IS NULL OR dbh_cm >= 0),
    crown_radius_m      NUMERIC(5, 2) CHECK (crown_radius_m IS NULL OR crown_radius_m > 0),
    is_banded           BOOLEAN,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_green_element_measurements_element 
    ON green_element_measurements(green_element_id, measured_at DESC) 
    WHERE deleted_at IS NULL;

-- Sembrar las mediciones iniciales existentes de green_elements como el primer registro histórico
INSERT INTO green_element_measurements (
    green_element_id,
    measured_at,
    measured_by_user_id,
    height_m,
    trunk_height_m,
    dbh_cm,
    crown_radius_m,
    is_banded,
    created_at,
    updated_at
)
SELECT
    id,
    COALESCE(measured_at, DATE '2026-01-01'),
    measured_by_user_id,
    height_m,
    trunk_height_m,
    dbh_cm,
    crown_radius_m,
    is_banded,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM green_elements
WHERE data_source = 'MEASURED' 
  AND (height_m IS NOT NULL OR dbh_cm IS NOT NULL OR crown_radius_m IS NOT NULL)
  AND deleted_at IS NULL;

