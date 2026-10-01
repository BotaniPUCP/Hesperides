-- Propiedad de SPEC-002 §4.2. Requiere que la imagen del servicio `db` sea
-- postgis/postgis (docker-compose ya la usa). Sobre una imagen postgres sin
-- PostGIS esta migracion falla y el arranque se detiene: es el comportamiento
-- deseado (fail fast), no un bug.
CREATE EXTENSION IF NOT EXISTS postgis;
