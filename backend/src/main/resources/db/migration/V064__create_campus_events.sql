-- SPEC-114: calendario del campus, con los eventos bloqueantes y los feriados (REQ 1.12, 1.8).
-- Se guarda la regla (fechas, dias de la semana y horario) y el motor calcula las ocurrencias:
-- dar de baja o editar "todos los jueves del semestre" es un solo cambio (D-01).
INSERT INTO catalog_types (code, name, description, is_system)
VALUES ('CAMPUS_EVENT_TYPE', 'Tipos de evento del campus', 'Bloqueante o feriado (SPEC-114)', TRUE);
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT t.id, v.code, v.label, v.pos FROM catalog_types t,
  (VALUES ('BLOCKING', 'Bloqueante', 1), ('HOLIDAY', 'Feriado', 2)) AS v(code, label, pos)
 WHERE t.code = 'CAMPUS_EVENT_TYPE';

CREATE TABLE campus_events (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(150) NOT NULL CHECK (length(trim(name)) > 0),
    description        VARCHAR(500),
    type_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    -- Columna con CHECK y no catalogo: cada ambito exige una regla distinta sobre zone_id (§2.5).
    scope              VARCHAR(10) NOT NULL CHECK (scope IN ('CAMPUS', 'SECTOR', 'SECTION')),
    zone_id            BIGINT REFERENCES zones(id),
    start_date         DATE NOT NULL,
    end_date           DATE NOT NULL,
    start_time         TIME,
    end_time           TIME,
    -- Dias ISO (1 = lunes); NULL = todos los dias de las fechas.
    weekdays           SMALLINT[],
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP,
    -- 366 dias como maximo (D-09): un ano de fin mal tecleado no debe avisar durante siglos.
    CONSTRAINT chk_campus_event_dates CHECK (end_date >= start_date AND end_date <= start_date + 365),
    CONSTRAINT chk_campus_event_scope CHECK ((scope = 'CAMPUS') = (zone_id IS NULL)),
    CONSTRAINT chk_campus_event_hours CHECK ((start_time IS NULL) = (end_time IS NULL)
        AND (start_time IS NULL OR end_time > start_time)),
    CONSTRAINT chk_campus_event_weekdays CHECK (weekdays IS NULL
        OR (cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[1,2,3,4,5,6,7]::smallint[]))
);
CREATE INDEX idx_campus_events_dates ON campus_events (start_date, end_date) WHERE deleted_at IS NULL;
