-- Sesión A del video de planificación, solo en la base desechable hespo-video-a.
-- Fija en el pasado lo que la web no permite fechar: la vigencia de la frecuencia del ejemplo y
-- las ejecuciones del historial. Las fechas llegan como el mediodía de Lima del día que toca
-- (mediodiaLimaHace), así que caen en el mismo día con o sin zona horaria.
-- Variables: frecuencia, hace60, hace39, hace28, hace3, x39, x28, x3 (ids de intervención).
\set ON_ERROR_STOP on
BEGIN;

UPDATE maintenance_frequencies
   SET valid_from = (:'hace60'::timestamptz AT TIME ZONE 'America/Lima')::date
 WHERE id = :frecuencia;

UPDATE interventions SET scheduled_date = (:'hace39'::timestamptz AT TIME ZONE 'America/Lima')::date WHERE id = :x39;
UPDATE interventions SET scheduled_date = (:'hace28'::timestamptz AT TIME ZONE 'America/Lima')::date WHERE id = :x28;
UPDATE interventions SET scheduled_date = (:'hace3'::timestamptz AT TIME ZONE 'America/Lima')::date WHERE id = :x3;

UPDATE intervention_locations
   SET started_at = :'hace39'::timestamptz - interval '3 hours', completed_at = :'hace39'::timestamptz
 WHERE intervention_id = :x39;
UPDATE intervention_locations
   SET started_at = :'hace28'::timestamptz - interval '3 hours', completed_at = :'hace28'::timestamptz
 WHERE intervention_id = :x28;
UPDATE intervention_locations
   SET started_at = :'hace3'::timestamptz - interval '3 hours', completed_at = :'hace3'::timestamptz
 WHERE intervention_id = :x3;

COMMIT;
