CREATE TABLE catalog_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_type_id BIGINT NOT NULL REFERENCES catalog_types(id),
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (catalog_type_id, code)
);

CREATE INDEX idx_catalog_types_code ON catalog_types(code);
CREATE INDEX idx_catalog_items_catalog_type_id ON catalog_items(catalog_type_id);

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ROLE', 'Roles del sistema', 'Roles asignables a los usuarios', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'ADMIN', 'Administrador', 1),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'USER', 'Usuario', 2);
