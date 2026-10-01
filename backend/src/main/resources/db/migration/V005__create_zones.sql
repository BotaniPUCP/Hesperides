-- Propiedad de SPEC-002 §4.3, con las enmiendas de SPEC-005 §4.4 y SPEC-102 §4.3.
--
-- Jerarquia del campus: sector -> seccion -> subseccion. Una seccion es un area
-- verde del mapa del cliente; un sector, el conjunto de secciones que mantiene
-- un mismo responsable. Las zonas de supervision NO estan aqui: cortan a los
-- sectores y viven en su propia tabla (V006).

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ZONE_TYPE', 'Tipos de zona', 'Niveles de la jerarquia del campus', FALSE),
    ('USE_TYPE', 'Tipos de uso', 'Uso y demanda del area verde', FALSE),
    ('RESERVATION_OWNER', 'Duenos de jardines reservables', 'Quien presta un jardin reservable', FALSE),
    ('LANDSCAPE_TYPE', 'Tipos de area verde', 'Si la seccion es un area verde o un jardin xerofitico', FALSE),
    ('IRRIGATION_CURRENT', 'Riego actual', 'Como se riega hoy la seccion', FALSE),
    ('IRRIGATION_PROJECT', 'Proyecto de riego', 'Que riego se planea para la seccion', FALSE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ZONE_TYPE'), 'SECTOR',     'Sector',     1),
    ((SELECT id FROM catalog_types WHERE code = 'ZONE_TYPE'), 'SECTION',    'Sección',    2),
    ((SELECT id FROM catalog_types WHERE code = 'ZONE_TYPE'), 'SUBSECTION', 'Subsección', 3),
    -- Los seis valores del campo `uso` del mapa del cliente, sin reinterpretar.
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'ADMINISTRATIVE', 'Áreas de uso administrativo', 1),
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'SUSTAINABLE',    'Áreas de manejo sostenible y reducción de consumo de agua', 2),
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'RECREATIONAL',   'Áreas de uso recreativo/descanso', 3),
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'SPORTS',         'Áreas deportivas y recreación activa', 4),
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'INSTITUTIONAL',  'Uso institucional', 5),
    ((SELECT id FROM catalog_types WHERE code = 'USE_TYPE'), 'CONSERVATION',   'Áreas de conservación', 6),
    ((SELECT id FROM catalog_types WHERE code = 'RESERVATION_OWNER'), 'DAF',      'DAF',      1),
    ((SELECT id FROM catalog_types WHERE code = 'RESERVATION_OWNER'), 'UNIDADES', 'Unidades', 2),
    ((SELECT id FROM catalog_types WHERE code = 'LANDSCAPE_TYPE'), 'GREEN_AREA', 'Área verde',        1),
    ((SELECT id FROM catalog_types WHERE code = 'LANDSCAPE_TYPE'), 'XEROPHYTIC', 'Jardín xerofítico', 2),
    -- Valores del mapa del cliente (campos `Riego act` y `Proy riego`).
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_CURRENT'), 'NONE',      'Sin riego tecnificado', 1),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_CURRENT'), 'SPRINKLER', 'Riego por aspersión',   2),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_CURRENT'), 'DRIP',      'Riego por goteo',       3),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_PROJECT'), 'TO_VALIDATE',     'Por validar con unidad', 1),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_PROJECT'), 'NEEDS_SPRINKLER', 'Falta aspersión',        2),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_PROJECT'), 'DRIP',            'Goteo',                  3),
    ((SELECT id FROM catalog_types WHERE code = 'IRRIGATION_PROJECT'), 'HAS_SPRINKLER',   'Cuenta con aspersión',   4);

CREATE TABLE zones (
    id                        BIGSERIAL PRIMARY KEY,
    code                      VARCHAR(30)  NOT NULL,
    name                      VARCHAR(150) NOT NULL,
    description               TEXT,
    parent_zone_id            BIGINT REFERENCES zones(id),
    zone_type_item_id         BIGINT NOT NULL REFERENCES catalog_items(id),
    -- Multipoligono: un sector es la suma de secciones repartidas por el campus,
    -- y varias secciones del mapa ya son multipoligonos.
    boundary                  GEOMETRY(MultiPolygon, 4326),
    area_m2                   NUMERIC(12, 2) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    -- Codigo del mapa del cliente ('C 1', 'G 13'). No es unico: hay codigos
    -- repetidos, por eso no va en `code`.
    map_code                  VARCHAR(10),
    use_type_item_id          BIGINT REFERENCES catalog_items(id),
    -- Solo en secciones y subsecciones: un sector no tiene tipo de area ni riego.
    landscape_type_item_id    BIGINT REFERENCES catalog_items(id),
    irrigation_current_item_id BIGINT REFERENCES catalog_items(id),
    irrigation_project_item_id BIGINT REFERENCES catalog_items(id),
    is_reservable             BOOLEAN NOT NULL DEFAULT FALSE,
    reservation_owner_item_id BIGINT REFERENCES catalog_items(id),
    is_active                 BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                TIMESTAMP,

    CONSTRAINT chk_zones_not_self_parent CHECK (parent_zone_id IS NULL OR parent_zone_id <> id),
    -- Un jardin reservable siempre declara quien lo presta.
    CONSTRAINT chk_zones_reservation_owner
        CHECK (NOT is_reservable OR reservation_owner_item_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_zones_code_active ON zones(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_zones_parent_zone_id ON zones(parent_zone_id);
CREATE INDEX idx_zones_type ON zones(zone_type_item_id);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);

-- teams.zone_id nacio sin FK porque esta tabla no existia (baseline, seccion de
-- cuadrillas). Ahora que existe, la referencia se vuelve real.
ALTER TABLE teams
    ADD CONSTRAINT fk_teams_zone FOREIGN KEY (zone_id) REFERENCES zones(id);
