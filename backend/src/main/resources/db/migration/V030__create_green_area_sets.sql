-- Propietaria: SPEC-203 (planificación preventiva por conjuntos de áreas verdes)
--
-- Un conjunto es una lista guardada de secciones con nombre. El coordinador
-- planifica por grupos grandes que no coinciden con sectores (D-01), y una regla
-- de frecuencia puede aplicar a todo el campus o a un conjunto (D-07). Las reglas
-- por sección (BY_ZONE) y por sector (BY_SECTOR) se convierten en reglas por
-- conjunto: todas las versiones, vigentes o no, para no romper el historial.

CREATE TABLE green_area_sets (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(120) NOT NULL,
    description        TEXT,
    -- Nulo solo en los conjuntos que crea esta migración: V002 no guarda autor.
    created_by_user_id BIGINT REFERENCES users(id),
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_sets_name_active
    ON green_area_sets (lower(name)) WHERE deleted_at IS NULL;

CREATE TABLE green_area_set_zones (
    id         BIGSERIAL PRIMARY KEY,
    set_id     BIGINT NOT NULL REFERENCES green_area_sets(id),
    zone_id    BIGINT NOT NULL REFERENCES zones(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_set_zones_active
    ON green_area_set_zones (set_id, zone_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_green_area_set_zones_zone ON green_area_set_zones (zone_id);

-- Qué actividades se planifican en cada conjunto (D-09).
CREATE TABLE green_area_set_activities (
    id                    BIGSERIAL PRIMARY KEY,
    set_id                BIGINT NOT NULL REFERENCES green_area_sets(id),
    activity_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP
);
CREATE UNIQUE INDEX idx_green_area_set_activities_active
    ON green_area_set_activities (set_id, activity_type_item_id) WHERE deleted_at IS NULL;

ALTER TABLE maintenance_frequencies ADD COLUMN green_area_set_id BIGINT REFERENCES green_area_sets(id);
-- El alcance viejo se suelta antes de convertir; el nuevo se impone al final (paso 4).
ALTER TABLE maintenance_frequencies DROP CONSTRAINT chk_freq_scope;

-- ── 0. Reglas por sección cuya zona ya no existe ──
-- V002 no puso clave foránea a zones: una regla así no tiene a qué aplicarse. Se da de
-- baja (con un alcance válido para el CHECK nuevo) en vez de abortar la migración.
UPDATE maintenance_frequencies f
SET scope = 'CAMPUS_WIDE', zone_id = NULL, deleted_at = COALESCE(f.deleted_at, CURRENT_TIMESTAMP)
WHERE f.scope IN ('BY_ZONE', 'BY_SECTOR') AND f.zone_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM zones z WHERE z.id = f.zone_id);

-- ── 1 y 2. Un conjunto por cada sección o sector que tenga reglas ──
-- Por sección: el conjunto tiene esa sección. Por sector: sus secciones activas.
-- Todas las reglas de esa zona (cualquier actividad, régimen o versión) apuntan
-- al mismo conjunto. El nombre es el de la zona; si ya está tomado, el sector
-- recibe « (sector)» y, en último caso, se añade el código de la zona.
CREATE TEMP TABLE converted_zone_set (zone_id BIGINT PRIMARY KEY, set_id BIGINT NOT NULL) ON COMMIT DROP;

DO $$
DECLARE
    z RECORD;
    candidate TEXT;
    new_set BIGINT;
BEGIN
    FOR z IN
        SELECT DISTINCT zn.id, zn.name, zn.code, f.scope
        FROM maintenance_frequencies f JOIN zones zn ON zn.id = f.zone_id
        WHERE f.scope IN ('BY_ZONE', 'BY_SECTOR')
        ORDER BY f.scope DESC, zn.id
    LOOP
        -- Una misma zona con reglas BY_ZONE y BY_SECTOR recibe un solo conjunto.
        CONTINUE WHEN EXISTS (SELECT 1 FROM converted_zone_set WHERE zone_id = z.id);
        candidate := z.name;
        IF EXISTS (SELECT 1 FROM green_area_sets WHERE lower(name) = lower(candidate) AND deleted_at IS NULL) THEN
            candidate := CASE WHEN z.scope = 'BY_SECTOR' THEN z.name || ' (sector)' ELSE z.name || ' (' || z.code || ')' END;
        END IF;
        IF EXISTS (SELECT 1 FROM green_area_sets WHERE lower(name) = lower(candidate) AND deleted_at IS NULL) THEN
            candidate := z.name || ' (' || z.code || ')';
        END IF;
        INSERT INTO green_area_sets (name) VALUES (candidate) RETURNING id INTO new_set;
        INSERT INTO converted_zone_set (zone_id, set_id) VALUES (z.id, new_set);

        IF z.scope = 'BY_ZONE' THEN
            INSERT INTO green_area_set_zones (set_id, zone_id) VALUES (new_set, z.id);
        ELSE
            INSERT INTO green_area_set_zones (set_id, zone_id)
            SELECT new_set, child.id FROM zones child
            WHERE child.parent_zone_id = z.id AND child.deleted_at IS NULL;
        END IF;
    END LOOP;
END $$;

-- Las actividades de cada conjunto convertido son las de sus reglas.
INSERT INTO green_area_set_activities (set_id, activity_type_item_id)
SELECT DISTINCT c.set_id, f.activity_type_item_id
FROM maintenance_frequencies f JOIN converted_zone_set c ON c.zone_id = f.zone_id
WHERE f.scope IN ('BY_ZONE', 'BY_SECTOR');

UPDATE maintenance_frequencies f SET scope = 'BY_SET', green_area_set_id = c.set_id
FROM converted_zone_set c WHERE f.scope IN ('BY_ZONE', 'BY_SECTOR') AND f.zone_id = c.zone_id;

-- ── 3. Reglas por sector sin sector: la API nunca guardó cuál era ──
-- Si chocan con una regla general vigente, manda la general y la otra se cierra hoy.
-- Una que todavía no empezaba (vigencia futura) no puede cerrarse antes de abrir: se da de baja.
UPDATE maintenance_frequencies f
SET valid_to = CASE WHEN f.valid_from <= CURRENT_DATE THEN CURRENT_DATE END,
    deleted_at = CASE WHEN f.valid_from > CURRENT_DATE THEN CURRENT_TIMESTAMP END
WHERE f.scope = 'BY_SECTOR' AND f.zone_id IS NULL AND f.valid_to IS NULL AND f.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM maintenance_frequencies g
              WHERE g.scope = 'CAMPUS_WIDE' AND g.activity_type_item_id = f.activity_type_item_id
                AND g.regime = f.regime AND g.valid_to IS NULL AND g.deleted_at IS NULL);

UPDATE maintenance_frequencies SET scope = 'CAMPUS_WIDE' WHERE scope = 'BY_SECTOR' AND zone_id IS NULL;

-- ── 4. Nuevas reglas de alcance ──
ALTER TABLE maintenance_frequencies DROP COLUMN zone_id;  -- arrastra chk_freq_zone_required y el índice único
ALTER TABLE maintenance_frequencies
    ADD CONSTRAINT chk_freq_scope CHECK (scope IN ('CAMPUS_WIDE', 'BY_SET')),
    ADD CONSTRAINT chk_freq_set_required CHECK ((scope = 'BY_SET') = (green_area_set_id IS NOT NULL));

CREATE UNIQUE INDEX idx_maint_freq_unique_current
    ON maintenance_frequencies (activity_type_item_id, regime, scope, COALESCE(green_area_set_id, 0))
    WHERE deleted_at IS NULL AND valid_to IS NULL;

-- ── 5. Fuera el teórico (D-06) ──
ALTER TABLE maintenance_frequencies DROP COLUMN target_days_interval;  -- arrastra chk_freq_positive
ALTER TABLE maintenance_frequencies ADD CONSTRAINT chk_freq_positive CHECK (
    (min_days_interval       IS NULL OR min_days_interval       > 0) AND
    (annual_target_count     IS NULL OR annual_target_count     > 0) AND
    (coverage_target_days    IS NULL OR coverage_target_days    > 0) AND
    (estimated_duration_days IS NULL OR estimated_duration_days > 0)
);
ALTER TABLE maintenance_frequency_seasons DROP COLUMN target_days_interval;  -- arrastra chk_season_target
