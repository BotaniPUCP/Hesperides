-- SPEC-107 (enmienda 11 nov 2026): seguimiento del uso del jardín. Dos marcas
-- guardadas junto al estado que se calcula con el reloj:
--
--   use_confirmed — el solicitante confirmó que usará el jardín. La anota
--     coordinación cuando el solicitante avisa (no tiene cuenta); solo se
--     acepta hasta N minutos antes del fin (parámetro
--     RESERVATION_CONFIRMATION_MINUTES, 20 por defecto).
--   space_used    — el encargado marca que el espacio está siendo usado;
--     solo dentro del horario de la reserva. La falta no se marca: una
--     reserva terminada sin marca se muestra «No usada».
--
-- Cada cambio deja fila en su historial, como el cambio de responsable (D-02b).
--
-- La V042 de este esquema ya está aplicada (11 nov 2026): sembró la columna
-- `attendance` de una primera iteración — un solo campo NOT_RECORDED/USED/NO_SHOW
-- — que este diseño reemplaza con dos marcas más finas. La migración aplicada no
-- se edita, así que su columna se retira aquí, en la siguiente libre.

ALTER TABLE garden_reservations DROP CONSTRAINT IF EXISTS chk_reservation_attendance;
ALTER TABLE garden_reservations DROP COLUMN IF EXISTS attendance;

ALTER TABLE garden_reservations
    ADD COLUMN use_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN space_used    BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE garden_reservation_confirmations (
    id                 BIGSERIAL   PRIMARY KEY,
    reservation_id     BIGINT      NOT NULL REFERENCES garden_reservations(id),
    confirmed          BOOLEAN     NOT NULL,
    changed_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservation_confirmations
    ON garden_reservation_confirmations (reservation_id, changed_at);

CREATE TABLE garden_reservation_usages (
    id                 BIGSERIAL   PRIMARY KEY,
    reservation_id     BIGINT      NOT NULL REFERENCES garden_reservations(id),
    used               BOOLEAN     NOT NULL,
    changed_by_user_id BIGINT      NOT NULL REFERENCES users(id),
    changed_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_reservation_usages
    ON garden_reservation_usages (reservation_id, changed_at);

-- El corte de confirmación es configurable, como el resto de reglas en minutos.
INSERT INTO system_parameters (code, label, value, value_type, description, is_editable)
VALUES ('RESERVATION_CONFIRMATION_MINUTES', 'Corte de confirmación de uso (min)',
        '20', 'INTEGER',
        'Minutos antes del fin de una reserva en los que ya no se acepta la confirmación de uso',
        TRUE);
