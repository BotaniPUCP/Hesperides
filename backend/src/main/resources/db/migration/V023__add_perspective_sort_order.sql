-- El orden de las perspectivas de un lugar lo decide quien edita, arrastrándolas
-- en la lista (el recorrido natural alrededor del edificio). Las existentes
-- arrancan en el orden que tenían: por lado (frente, espalda, al lado) y nombre.
ALTER TABLE place_perspectives ADD COLUMN sort_order INTEGER;

UPDATE place_perspectives v SET sort_order = o.n
  FROM (SELECT p.id, row_number() OVER (PARTITION BY p.place_id ORDER BY s.sort_order, p.display_name, p.id) AS n
          FROM place_perspectives p JOIN catalog_items s ON s.id = p.side_item_id) o
 WHERE o.id = v.id;

ALTER TABLE place_perspectives ALTER COLUMN sort_order SET NOT NULL;
ALTER TABLE place_perspectives ADD CONSTRAINT chk_place_perspectives_sort_order CHECK (sort_order > 0);
