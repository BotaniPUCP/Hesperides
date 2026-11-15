-- SPEC-113 D-08 · SPEC-202 D-15. Se elimina el módulo de turnos de riego (V024): la
-- planificación (SPEC-203) ya maneja el riego como intervenciones de clase RIEGO, y dos
-- registros del mismo trabajo se contradicen. Decisión del usuario, 15 nov 2026.
-- Es un DROP y no un soft delete porque se retira la estructura, no filas de negocio: al
-- decidirlo, la base de desarrollo no tenía ningún turno. Una base con turnos debe
-- respaldarlos antes de aplicar esta migración.
DROP TABLE irrigation_turn_sections;
DROP TABLE irrigation_turns;
