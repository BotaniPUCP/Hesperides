-- Propiedad de SPEC-005 §4.4.6. Capa territorial del cliente, independiente de
-- la jerarquia de zonas: cada zona de supervision corta a varios sectores.
--
-- Toda zona tiene supervisor. Por ahora lo es el coordinador (o el ADMIN si aun
-- no hay cuenta de coordinador); la semilla lo resuelve en V011. Que el usuario
-- tenga rol COORDINADOR o ADMIN lo valida el servicio: un CHECK no puede
-- consultar el rol, que vive en otra tabla.
CREATE TABLE supervision_zones (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(30)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT NOT NULL REFERENCES users(id),
    -- Una zona de supervision ES su poligono: sin el no significa nada.
    boundary           GEOMETRY(MultiPolygon, 4326) NOT NULL,
    area_m2            NUMERIC(12, 2) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    is_active          BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_supervision_zones_code_active ON supervision_zones(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_supervision_zones_supervisor ON supervision_zones(supervisor_user_id);
CREATE INDEX idx_supervision_zones_boundary ON supervision_zones USING GIST(boundary);
