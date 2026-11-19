-- SPEC-107 §4: reservas de jardines prestables.
--
-- Una reserva es de un solo jardín y no se repite (SPEC-107 D-01). El jardín es un lugar
-- (V035), no una sección: así lo nombra el calendario de la OSG. Las horas se guardan con
-- zona (TIMESTAMPTZ) porque una reserva de 23:00 a 01:00 abarca dos días locales y la
-- comparación con «hoy» debe ser en hora de Lima.
--
-- La cercanía se calcula al consultar, no se guarda: el parámetro RESERVATION_NEARBY_METERS
-- permite ajustarla en campo sin volver a escribir las reservas existentes.

CREATE SEQUENCE garden_reservation_code_seq;

CREATE TABLE garden_reservations (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(20) NOT NULL UNIQUE
                       DEFAULT 'RES-' || lpad(nextval('garden_reservation_code_seq')::text, 4, '0'),
    place_id           BIGINT NOT NULL REFERENCES places(id),
    organization_id    BIGINT NOT NULL REFERENCES organizations(id),
    contact_id         BIGINT REFERENCES contacts(id),
    starts_at          TIMESTAMPTZ NOT NULL,
    ends_at            TIMESTAMPTZ NOT NULL,
    purpose            VARCHAR(300),
    cancelled_at       TIMESTAMPTZ,
    cancel_reason      VARCHAR(500),
    created_by_user_id BIGINT NOT NULL REFERENCES users(id),
    import_batch_id    BIGINT REFERENCES import_batches(id),
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP,
    CONSTRAINT chk_reservation_period CHECK (ends_at > starts_at),
    -- Siete días: una reserva de meses por un error de tipeo bloquearía el aviso de trabajo
    -- en ese jardín durante toda su vigencia (SPEC-107 §3.2).
    CONSTRAINT chk_reservation_duration CHECK (ends_at <= starts_at + INTERVAL '7 days'),
    -- Anular y tener motivo son el mismo hecho: no hay anulada sin explicación ni motivo suelto.
    CONSTRAINT chk_reservation_cancel CHECK ((cancelled_at IS NULL) = (cancel_reason IS NULL))
);
CREATE INDEX idx_garden_reservations_place_time ON garden_reservations (place_id, starts_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_time ON garden_reservations (starts_at, ends_at) WHERE deleted_at IS NULL;

INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('RESERVATION_NEARBY_METERS', 'Distancia de aviso por reservas (m)', '10', 'INTEGER',
        'Metros desde el borde de un jardín reservado dentro de los cuales se avisa al programar trabajo', TRUE);

-- El registro masivo de reservas entra al ciclo común de cargas, como el Directorio en V037.
ALTER TABLE import_batches DROP CONSTRAINT import_batches_kind_check;
ALTER TABLE import_batches ADD CONSTRAINT import_batches_kind_check
    CHECK (kind IN ('specimens', 'waste-bins', 'drinking-fountains', 'species-photos',
                    'organizations', 'contacts', 'reservations'));
