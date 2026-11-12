-- Sesión B del video de planificación, solo en la base desechable hespo-video-b.
-- Elige la sección que recibe el trabajo cercano al jardín reservado: activa, que no sea del
-- jardín, a entre 3 y 9 m de su contorno (metros reales sobre geography, como SPEC-107 §2.4),
-- la de mayor área. Devuelve «id;nombre;metros».
-- Variable: jardin (id del lugar prestable).
\set ON_ERROR_STOP on
WITH jardin AS (
  SELECT ST_Union(z.boundary) AS g, array_agg(z.id) AS ids
    FROM places p
    JOIN zones z ON z.id = p.zone_id
                 OR z.id IN (SELECT c.zone_id FROM places c WHERE c.parent_place_id = p.id AND c.deleted_at IS NULL)
   WHERE p.id = :jardin
)
SELECT z.id || ';' || z.name || ';' || round(ST_Distance(z.boundary::geography, j.g::geography))
  FROM zones z
  JOIN catalog_items ci ON ci.id = z.zone_type_item_id
 CROSS JOIN jardin j
 WHERE ci.code = 'SECTION' AND z.is_active AND z.deleted_at IS NULL AND NOT (z.id = ANY (j.ids))
   AND ST_DWithin(z.boundary::geography, j.g::geography, 9)
   AND ST_Distance(z.boundary::geography, j.g::geography) >= 3
 ORDER BY ST_Area(z.boundary::geography) DESC
 LIMIT 1;
