-- V011__create_audit_log.sql
-- Bitácora de acciones administrativas sensibles. Append-only por diseño
-- (SPEC-004 §6): no lleva updated_at ni deleted_at, a diferencia de toda
-- otra tabla del proyecto (excepción deliberada a SPEC-000 §5.4).
--
-- Las columnas de autoría creadas_by/updated_by_user_id que SPEC-004 §4.2
-- añade a zones, species, green_elements, supplies, providers, contracts y
-- system_parameters no se declaran aquí: esas tablas no existen en esta
-- entrega y sus migraciones las traerán junto con sus campos de autoría.

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    action          VARCHAR(60)  NOT NULL,
    entity_type     VARCHAR(60)  NOT NULL,
    entity_id       BIGINT,
    user_id         BIGINT REFERENCES users(id),
    ip_address      VARCHAR(45),
    changes         JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Consulta más común: filtrar por usuario y ordenar por fecha.
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
-- Segunda consulta más común: "todo lo que le pasó a esta entidad".
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id, created_at DESC);
-- Filtro por tipo de acción (ej. "todos los USER_DEACTIVATED").
CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
-- Rango de fechas sin otro filtro (reporte de dirección "qué pasó este mes").
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- En producción el rol de aplicación solo inserta y lee; nunca edita ni borra
-- la bitácora (SPEC-004 §6). En entornos donde ese rol aún no existe, no-op.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hesperides_app') THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON audit_log FROM hesperides_app';
        EXECUTE 'GRANT INSERT, SELECT ON audit_log TO hesperides_app';
    END IF;
END $$;