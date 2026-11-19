-- SPEC-107 (enmienda 11 nov 2026): la tolerancia del corte aplica a las dos
-- marcas del seguimiento de uso, no solo a la confirmación. Pasado el corte
-- (fin − RESERVATION_CONFIRMATION_MINUTES) ya no se confirma el uso ni se
-- marca el espacio. La V043 nombró el parámetro «corte de confirmación»: su
-- código no se renombra (rompería los consumidores), solo su etiqueta y su
-- descripción se generalizan.

UPDATE system_parameters
   SET label = 'Corte de confirmación y de marca de uso (min)',
       description = 'Minutos antes del fin de una reserva en los que ya no se acepta '
                     || 'confirmar el uso ni marcar que el espacio está en uso',
       updated_at = CURRENT_TIMESTAMP
 WHERE code = 'RESERVATION_CONFIRMATION_MINUTES' AND deleted_at IS NULL;
