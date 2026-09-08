-- V012__create_teams.sql
-- Cuadrillas de trabajo. Un supervisor dirige una cuadrilla; los operarios
-- pertenecen a ella. El coordinador supervisa a todos los supervisores.
-- SPEC-002 §4.10.

CREATE TABLE teams (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT       NOT NULL REFERENCES users(id),
    zone_id            BIGINT,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_teams_code_active ON teams(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_supervisor ON teams(supervisor_user_id);
CREATE INDEX idx_teams_zone ON teams(zone_id);

-- Pertenencia de operarios a una cuadrilla. Es una tabla puente con historia:
-- left_at permite saber quién estuvo en qué cuadrilla cuando se ejecutó una
-- intervención pasada, sin reescribir el histórico al reasignar a alguien.
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
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- El catastro de zonas (SPEC-002 V004) no llega en esta misma entrega; la FK
-- se aplica cuando exista, sin bloquear la creación de cuadrillas por una tabla
-- que todavía no está. El día que aterrice V004 con zonas, el constraint aparece.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = current_schema() AND table_name = 'zones') THEN
        EXECUTE 'ALTER TABLE teams ADD CONSTRAINT fk_teams_zone FOREIGN KEY (zone_id) REFERENCES zones(id)';
    END IF;
END $$;