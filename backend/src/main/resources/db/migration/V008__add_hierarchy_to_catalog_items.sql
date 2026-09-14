-- Propiedad de SPEC-005 §4.1 (D-01). Enmienda SPEC-003 §3.
--
-- Habilita catálogos de dos niveles. La taxonomía real del cliente no es una
-- lista plana: 9 clases de intervención agrupan 45 tipos de actividad, y el
-- formulario de campo encadena ambos selectores.

ALTER TABLE catalog_items
    ADD COLUMN parent_item_id BIGINT REFERENCES catalog_items(id);

CREATE INDEX idx_catalog_items_parent ON catalog_items(parent_item_id);

-- Un ítem no puede ser su propio padre. La profundidad máxima real (dos niveles)
-- y la regla de que padre e hijo pertenezcan a catalog_type distintos y
-- relacionados las hace cumplir el servicio, no la base: un CHECK no puede
-- consultar otra fila de la misma tabla.
ALTER TABLE catalog_items
    ADD CONSTRAINT chk_catalog_items_not_self_parent
        CHECK (parent_item_id IS NULL OR parent_item_id <> id);

-- parent_item_id es nulable porque la inmensa mayoría de catálogos son planos y
-- deben seguir funcionando sin tocarlos: un ROLE o un URGENCY_LEVEL no tiene
-- padre. La jerarquía es opcional y solo la usa quien la necesita.
