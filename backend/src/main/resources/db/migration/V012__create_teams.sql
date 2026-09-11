-- Propiedad de SPEC-002 §4.10. SPEC-100 la necesita para el campo teams[], el
-- filtro teamId y el alcance del SUPERVISOR, así que se implementa aquí.
--
-- La operación de campo no es plana: el operario reporta a un supervisor de
-- cuadrilla, y el supervisor al coordinador. Estas dos tablas permiten resolver
-- "solo mi equipo" sin recorrer la jerarquía a mano en cada consulta.

CREATE TABLE teams (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT       NOT NULL REFERENCES users(id),
    -- Sin FK a zones(id) todavía: esa tabla es de V004, propiedad del spec del
    -- catastro, y aún no existe. SPEC-002 ya declara zone_id nulable (una
    -- cuadrilla puede ser polivalente), así que la columna es válida tal cual.
    -- El spec del catastro debe añadir la constraint con un ALTER TABLE.
    zone_id            BIGINT,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_teams_code_active ON teams(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_supervisor ON teams(supervisor_user_id);
CREATE INDEX idx_teams_zone ON teams(zone_id);

-- Tabla puente con historia: left_at permite saber quién estuvo en qué cuadrilla
-- cuando se ejecutó una intervención pasada, sin reescribir el histórico al
-- reasignar a alguien.
CREATE TABLE team_members (
    id          BIGSERIAL PRIMARY KEY,
    team_id     BIGINT    NOT NULL REFERENCES teams(id),
    user_id     BIGINT    NOT NULL REFERENCES users(id),
    joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

-- Un usuario no puede estar dos veces activo en la misma cuadrilla.
CREATE UNIQUE INDEX idx_team_members_unique_active
    ON team_members(team_id, user_id) WHERE left_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id);
