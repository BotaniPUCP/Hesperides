-- Propiedad de SPEC-104 §4. Una especie pasa de una foto generica a varias,
-- ordenadas y con su credito (SPEC-104 D-01, D-04).

DROP INDEX idx_species_photos_current;

-- source_url (SPEC-103) es el enlace del que se descargo la foto; source_page_url,
-- la pagina que acredita la obra. En Wikimedia Commons son distintos: la URL de
-- descarga no muestra ni autor ni licencia.
ALTER TABLE species_photos
    ADD COLUMN sort_order      INTEGER,
    ADD COLUMN author          VARCHAR(255),
    ADD COLUMN license         VARCHAR(100),
    ADD COLUMN source_page_url VARCHAR(500);

-- Las fotos ya cargadas (una vigente por especie, SPEC-103) pasan a ser la
-- principal. Las dadas de baja tambien reciben 1: el indice de abajo es parcial
-- y no las mira.
UPDATE species_photos SET sort_order = 1;

ALTER TABLE species_photos
    ALTER COLUMN sort_order SET NOT NULL,
    ADD CONSTRAINT chk_species_photos_sort_order CHECK (sort_order > 0);

-- Dos fotos vigentes de una especie no comparten posicion. Parcial por el soft
-- delete: reemplazar el conjunto da de baja las anteriores sin borrarlas.
CREATE UNIQUE INDEX idx_species_photos_order_active
    ON species_photos(species_id, sort_order) WHERE deleted_at IS NULL;
