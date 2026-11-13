-- Propietaria: SPEC-203 (planificación preventiva por conjuntos de áreas verdes)
--
-- Un conjunto puede incluir ejemplares además de jardines, o solo ejemplares:
-- la gran poda de fin de año se planifica sobre árboles concretos, no sobre
-- secciones. El jardín y el ejemplar cuentan por separado; un ejemplar dentro
-- de un jardín del mismo conjunto no se da por atendido con el jardín.

CREATE TABLE green_area_set_elements (
    id               BIGSERIAL PRIMARY KEY,
    set_id           BIGINT NOT NULL REFERENCES green_area_sets(id),
    green_element_id BIGINT NOT NULL REFERENCES green_elements(id),
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_set_elements_active
    ON green_area_set_elements (set_id, green_element_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_green_area_set_elements_element ON green_area_set_elements (green_element_id);
