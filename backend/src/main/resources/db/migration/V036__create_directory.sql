-- SPEC-106: directorio de organizaciones (unidades PUCP y empresas externas) y sus contactos.
-- Directorio plano: la relación «pedido de / para» la guardan los préstamos e incidencias.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ORGANIZATION_TYPE', 'Tipos de organización', 'Unidad PUCP o empresa externa', TRUE);
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ORGANIZATION_TYPE'), 'PUCP_UNIT',        'Unidad PUCP',     1),
    ((SELECT id FROM catalog_types WHERE code = 'ORGANIZATION_TYPE'), 'EXTERNAL_COMPANY', 'Empresa externa', 2);

-- unaccent no es IMMUTABLE y un índice lo exige; fijar el diccionario lo vuelve determinista.
CREATE FUNCTION directory_key(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, btrim($1))) $$;

CREATE SEQUENCE organization_code_seq;
CREATE TABLE organizations (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(20)  NOT NULL UNIQUE DEFAULT 'ORG-' || lpad(nextval('organization_code_seq')::text, 4, '0'),
    name         VARCHAR(200) NOT NULL,
    type_item_id BIGINT       NOT NULL REFERENCES catalog_items(id),
    ruc          CHAR(11),
    phone        VARCHAR(30),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP,
    CONSTRAINT chk_organizations_ruc_format CHECK (ruc IS NULL OR ruc ~ '^(10|20)[0-9]{9}$')
);
-- Sin tildes ni mayúsculas: «Estudios Generales Ciencias» y «estudios generales ciencias» son la misma.
CREATE UNIQUE INDEX idx_organizations_name ON organizations (directory_key(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_organizations_ruc ON organizations (ruc) WHERE deleted_at IS NULL AND ruc IS NOT NULL;

CREATE TABLE organization_aliases (
    id              BIGSERIAL PRIMARY KEY,
    organization_id BIGINT       NOT NULL REFERENCES organizations(id),
    alias           VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);
-- Un alias apunta a una sola organización; que no choque con el nombre de otra lo valida el servicio.
CREATE UNIQUE INDEX idx_organization_aliases_alias ON organization_aliases (directory_key(alias))
    WHERE deleted_at IS NULL;
CREATE INDEX idx_organization_aliases_org ON organization_aliases (organization_id) WHERE deleted_at IS NULL;

CREATE SEQUENCE contact_code_seq;
CREATE TABLE contacts (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE DEFAULT 'CON-' || lpad(nextval('contact_code_seq')::text, 4, '0'),
    full_name  VARCHAR(200) NOT NULL,
    extension  CHAR(4),
    mobile     CHAR(9),
    email      VARCHAR(254),
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_contacts_extension CHECK (extension IS NULL OR extension ~ '^[0-9]{4}$'),
    CONSTRAINT chk_contacts_mobile CHECK (mobile IS NULL OR mobile ~ '^9[0-9]{8}$')
);
-- Sin índice único de nombre: dos personas distintas pueden llamarse igual.

CREATE TABLE contact_organizations (
    id              BIGSERIAL PRIMARY KEY,
    contact_id      BIGINT    NOT NULL REFERENCES contacts(id),
    organization_id BIGINT    NOT NULL REFERENCES organizations(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);
CREATE UNIQUE INDEX idx_contact_organizations_pair ON contact_organizations (contact_id, organization_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_contact_organizations_org ON contact_organizations (organization_id) WHERE deleted_at IS NULL;
