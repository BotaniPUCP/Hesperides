-- Propiedad de SPEC-002 §4.4 y SPEC-004 §4.1; ciclo de vida operativo en SPEC-103.
-- Species slugs are permanent route identities, even after logical deletion.
-- Fail rather than silently changing historical routes if an old database has
-- already reused one; the conflict must be resolved with an explicit decision.
DO $$
BEGIN
    IF EXISTS (
        SELECT slug FROM species GROUP BY slug HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot reserve historical species slugs: duplicate values already exist';
    END IF;
END $$;

DROP INDEX IF EXISTS idx_species_slug_active;
CREATE UNIQUE INDEX idx_species_slug_historical ON species(slug);

-- SPEC-004 defines the append-only audit structure. Earlier migrations in this
-- repository did not materialize it, so create that existing contract here.
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    action      VARCHAR(60) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id   BIGINT,
    user_id     BIGINT REFERENCES users(id),
    ip_address  VARCHAR(45),
    changes     JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
