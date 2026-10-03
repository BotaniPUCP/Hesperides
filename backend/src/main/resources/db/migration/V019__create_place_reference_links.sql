-- Migración gradual de las referencias antiguas (place_references) al catálogo
-- de lugares. Cada referencia se enlaza a un lugar (y quizás a una de sus
-- perspectivas) o se descarta; hasta entonces sigue como está, así que el mapa y
-- la descripción de ubicaciones no cambian mientras dura la migración.

-- Parecido de textos para sugerir el lugar de «lmed», «labortorio», «capu»…
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE place_reference_links (
    id                 BIGSERIAL PRIMARY KEY,
    reference_id       BIGINT    NOT NULL REFERENCES place_references(id),
    place_id           BIGINT    REFERENCES places(id),
    perspective_id     BIGINT    REFERENCES place_perspectives(id),
    -- No es un lugar (un camino, un punto suelto): sale de la cola sin enlazarse.
    discarded          BOOLEAN   NOT NULL DEFAULT FALSE,
    decided_by_user_id BIGINT    NOT NULL REFERENCES users(id),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Una decisión anulada (el lugar se borró) devuelve la referencia a la cola.
    deleted_at         TIMESTAMP,
    CONSTRAINT chk_place_reference_links_decision CHECK (discarded = (place_id IS NULL)),
    CONSTRAINT chk_place_reference_links_perspective CHECK (perspective_id IS NULL OR place_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_place_reference_links_reference ON place_reference_links (reference_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_place_reference_links_place ON place_reference_links (place_id) WHERE deleted_at IS NULL;
