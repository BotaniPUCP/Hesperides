-- V101__enable_unaccent.sql
-- La búsqueda de usuarios es insensible a tildes (SPEC-100 CA-06): "perez"
-- debe encontrar "Pérez". unaccent existe en el contrib de PostgreSQL; si ya
-- está instalada, el IF NOT EXISTS convierte esto en un no-op idempotente.
CREATE EXTENSION IF NOT EXISTS unaccent;