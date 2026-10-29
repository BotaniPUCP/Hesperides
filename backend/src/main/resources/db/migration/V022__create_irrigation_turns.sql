-- M7/D-01. Migración provisional para rama privada wip/riego-m7.
-- Coordinar número con el líder antes de integrar: Flyway no permite reutilizar V022.
-- Reutilizamos zones y users, no creamos geografía ni autenticación nuevas.
CREATE TABLE irrigation_turns (
    id                 BIGSERIAL PRIMARY KEY,
    sector_zone_id     BIGINT NOT NULL REFERENCES zones(id),
    supervisor_user_id BIGINT NOT NULL REFERENCES users(id),
    irrigation_date    DATE NOT NULL,
    started_at         TIME,
    finished_at        TIME,
    notes              VARCHAR(500),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP,
    CONSTRAINT chk_irrigation_turn_time CHECK (
        started_at IS NULL OR finished_at IS NULL OR finished_at > started_at)
);
CREATE INDEX idx_irrigation_turns_date_sector ON irrigation_turns (irrigation_date, sector_zone_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_irrigation_turns_supervisor ON irrigation_turns (supervisor_user_id);

CREATE TABLE irrigation_turn_sections (
    id              BIGSERIAL PRIMARY KEY,
    turn_id         BIGINT NOT NULL REFERENCES irrigation_turns(id),
    section_zone_id BIGINT NOT NULL REFERENCES zones(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);
CREATE UNIQUE INDEX idx_irrigation_turn_sections_unique_active
    ON irrigation_turn_sections(turn_id, section_zone_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_irrigation_turn_sections_zone ON irrigation_turn_sections(section_zone_id);
