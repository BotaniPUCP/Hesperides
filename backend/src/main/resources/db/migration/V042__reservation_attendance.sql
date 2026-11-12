-- SPEC-107 §4 (enmienda 11 nov 2026): seguimiento de asistencia. El estado de la
-- reserva sigue calculándose (D-09); la asistencia es un dato que el coordinador
-- registra mientras la reserva está próxima o en curso, y nace sin registrar.
ALTER TABLE garden_reservations
    ADD COLUMN attendance VARCHAR(20) NOT NULL DEFAULT 'NOT_RECORDED',
    ADD CONSTRAINT chk_reservation_attendance
        CHECK (attendance IN ('NOT_RECORDED', 'USED', 'NO_SHOW'));
