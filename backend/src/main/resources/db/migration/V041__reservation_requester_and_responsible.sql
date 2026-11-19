-- SPEC-107 §4 (enmienda 11 nov 2026): el modelo de D-02, D-02b y D-08b.
-- V039 trajo la primera iteración (organization_id, contact_id opcional); una
-- migración aplicada no se edita, así que este cambio entra en la siguiente libre.
-- El rol del contacto ya entró por V040 (SPEC-106 §4.3).

-- D-02: quién pide y quién es responsable.
ALTER TABLE garden_reservations RENAME COLUMN organization_id TO requested_by_organization_id;
ALTER TABLE garden_reservations RENAME COLUMN contact_id TO requester_contact_id;
ALTER TABLE garden_reservations
    ADD COLUMN requested_for_organization_id BIGINT REFERENCES organizations(id),
    ADD COLUMN responsible_contact_id        BIGINT REFERENCES contacts(id);

-- Una reserva de la primera iteración sin contacto no tiene solicitante: solo pudo crearse
-- en bases de prueba. Se da de baja en vez de inventarle uno.
UPDATE garden_reservations SET deleted_at = CURRENT_TIMESTAMP
 WHERE requester_contact_id IS NULL AND deleted_at IS NULL;
UPDATE garden_reservations SET responsible_contact_id = requester_contact_id;

ALTER TABLE garden_reservations
    ADD CONSTRAINT chk_reservation_requester
        CHECK (deleted_at IS NOT NULL OR (requester_contact_id IS NOT NULL AND responsible_contact_id IS NOT NULL)),
    ADD CONSTRAINT chk_reservation_for_other
        CHECK (requested_for_organization_id IS DISTINCT FROM requested_by_organization_id);
CREATE INDEX idx_garden_reservations_requested_by
    ON garden_reservations (requested_by_organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_garden_reservations_requested_for
    ON garden_reservations (requested_for_organization_id) WHERE deleted_at IS NULL;

-- D-02b: una fila por cada responsable que tuvo la reserva, incluido el primero.
-- responsible_contact_id de la reserva repite la última, para leer la agenda sin agrupar.
CREATE TABLE garden_reservation_responsibles (
    id                  BIGSERIAL   PRIMARY KEY,
    reservation_id      BIGINT      NOT NULL REFERENCES garden_reservations(id),
    contact_id          BIGINT      NOT NULL REFERENCES contacts(id),
    assigned_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservation_responsibles
    ON garden_reservation_responsibles (reservation_id, assigned_at);
INSERT INTO garden_reservation_responsibles (reservation_id, contact_id, assigned_by_user_id, assigned_at)
SELECT id, responsible_contact_id, created_by_user_id, created_at
  FROM garden_reservations WHERE responsible_contact_id IS NOT NULL;
