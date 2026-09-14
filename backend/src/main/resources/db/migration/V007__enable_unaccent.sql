-- La búsqueda de usuarios debe encontrar "Núñez" escribiendo "nunez": quien
-- busca no escribe las tildes. unaccent lo resuelve en la base, sin duplicar
-- columnas normalizadas ni normalizar en memoria después de traer las filas.
CREATE EXTENSION IF NOT EXISTS unaccent;
