-- Cada jardín prestable es un lugar. El calendario de reservas de la OSG nombra los jardines a
-- su manera («Jardín ROSALES (FARES)», «Jardin H»); como lugar, cada uno tiene sus alias y un
-- préstamo se encuentra por cualquiera de ellos. La sección sigue siendo el territorio: el lugar
-- toma su contorno de la zona, sin copiarlo. Equivalencias en
-- docs/dominio/datos/fuentes-mapa/equivalencias-jardines-reserva.csv.

-- El calendario de la OSG lo confirma: el Jardín Física lo presta la DAF, no una unidad.
UPDATE zones SET reservation_owner_item_id = (
        SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id
         WHERE ct.code = 'RESERVATION_OWNER' AND ci.code = 'DAF'),
       updated_at = CURRENT_TIMESTAMP
 WHERE code = 'AV-0475';

CREATE TEMP TABLE garden_places (zone_code TEXT, name TEXT, alias TEXT, parent_name TEXT);
INSERT INTO garden_places VALUES
    ('AV-0358',   'Jardín Comedor Central',                    NULL, NULL),
    ('AV-0079',   'Jardín Comedor Arte Antiguo (centro)',      NULL, NULL),
    ('AV-0328',   'Jardín Humanidades bloque A',               NULL, NULL),
    ('AV-0130',   'Jardín DAES',                               NULL, NULL),
    ('AV-0212',   'Jardín Estudio de TV (Paredón)',            NULL, NULL),
    ('AV-0011',   'Jardín Rosales',                            'Jardín ROSALES (FARES)', NULL),
    ('AV-0151-1', 'Jardín Frutas',                             NULL, NULL),
    ('AV-0324',   'Jardín Lidera',                             NULL, NULL),
    ('AV-0078',   'Jardín Comedor Arte Antiguo (lado EEGGCC)', NULL, NULL),
    ('AV-0125',   'Jardín Tesorería',                          NULL, NULL),
    ('AV-0201',   'Jardín Humanidades bloque B',               NULL, NULL),
    ('AV-0151-2', 'Jardín Frutas-Lado FCCSS',                  NULL, NULL),
    ('AV-0273',   'Jardín Pabellón H',                         'Jardin H', NULL),
    ('AV-0200',   'Jardín Comedor Letras',                     NULL, NULL),
    ('AV-0475',   'Jardín Física',                             NULL, NULL),
    ('AV-0236',   'Jardín Facu Sociales',                      NULL, NULL),
    ('AV-0250',   'Jardín Tinkuy',                             NULL, NULL),
    ('AV-0370',   'Jardín CAPU',                               NULL, NULL),
    -- Un solo jardín del calendario dibujado en dos secciones: el lugar suma el contorno de ambas.
    ('AV-0481',   'Lado oeste',                                NULL, 'Jardín Palmeras (Gastronomía)'),
    ('AV-0482',   'Lado este',                                 NULL, 'Jardín Palmeras (Gastronomía)');

-- Un jardín que ya es lugar, o un nombre ya usado, se respeta: lo creó alguien a mano y
-- duplicarlo dejaría dos lugares para el mismo préstamo.
CREATE TEMP TABLE pending_gardens AS
SELECT g.*, z.id AS zone_id FROM garden_places g JOIN zones z ON z.code = g.zone_code
 WHERE z.is_reservable AND z.deleted_at IS NULL
   AND NOT EXISTS (SELECT 1 FROM places p WHERE p.zone_id = z.id AND p.deleted_at IS NULL);

INSERT INTO places (name, kind_item_id, category_item_id, outline_from_children)
SELECT DISTINCT g.parent_name,
       (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'PLACE_KIND' AND ci.code = 'OUTDOOR'),
       (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'REFERENCE_CATEGORY' AND ci.code = 'AREA_VERDE'), TRUE
  FROM pending_gardens g
 WHERE g.parent_name IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM places p WHERE p.parent_place_id IS NULL AND p.deleted_at IS NULL
                      AND lower(p.name) = lower(g.parent_name));

INSERT INTO places (name, kind_item_id, category_item_id, zone_id, parent_place_id)
SELECT g.name,
       (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'PLACE_KIND' AND ci.code = 'OUTDOOR'),
       (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'REFERENCE_CATEGORY' AND ci.code = 'AREA_VERDE'),
       g.zone_id, parent.id
  FROM pending_gardens g
  LEFT JOIN places parent ON parent.parent_place_id IS NULL AND parent.deleted_at IS NULL
                         AND lower(parent.name) = lower(g.parent_name)
 WHERE NOT EXISTS (SELECT 1 FROM places p WHERE p.deleted_at IS NULL
                      AND COALESCE(p.parent_place_id, 0) = COALESCE(parent.id, 0)
                      AND lower(p.name) = lower(g.name));

INSERT INTO place_aliases (place_id, alias)
SELECT p.id, g.alias FROM pending_gardens g JOIN places p ON p.zone_id = g.zone_id AND p.deleted_at IS NULL
 WHERE g.alias IS NOT NULL;
