-- SPEC-107 §4 · decisión del 17 nov 2026: la confirmación de uso se retira.
-- Quien reserva se supone que lo usará; si no, la anula. La marca de uso del
-- espacio (space_used) se queda, y con ella el corte de
-- RESERVATION_CONFIRMATION_MINUTES (V043, V044); una migración aplicada no se
-- edita, así que esto se retira en una nueva.

ALTER TABLE garden_reservations DROP COLUMN use_confirmed;
DROP TABLE IF EXISTS garden_reservation_confirmations;

-- La ventana ya no es de la confirmación: es solo de la marca de uso.
UPDATE system_parameters
   SET label = 'Tolerancia del corte de la marca de uso (minutos)',
       description = 'Minutos antes del fin de la reserva en que se cierra la '
                     || 'ventana para marcar que el espacio está siendo usado (SPEC-107 D-12).'
 WHERE code = 'RESERVATION_CONFIRMATION_MINUTES';
