-- BASELINE DEL ESQUEMA. Consolida las doce migraciones V001-V011 que existieron
-- hasta la integracion de frecuencias de mantenimiento.
--
-- POR QUE SE CONSOLIDO: dos ramas tomaron el numero V010 a la vez (la taxonomia
-- preliminar y la tabla de frecuencias). Flyway rechaza versiones duplicadas y
-- `out-of-order = false` impide renumerar hacia atras. Como ninguna base
-- desplegada conservaba datos, reescribir el historial salio mas barato que
-- arrastrar la colision.
--
-- QUE CAMBIO Y QUE NO: este archivo declara el ESTADO FINAL, no la secuencia que
-- llevo hasta el. Las migraciones antiguas se corregian entre si -- V003
-- reparaba el catalogo ROLE de V001, V006 anadia columnas a users, V011 ponia
-- descripciones a las clases de V009. Aqui cada tabla nace ya correcta. El
-- esquema resultante es identico; lo que se pierde es el rastro de las idas y
-- vueltas, no una sola decision: los porques se conservan en los comentarios de
-- cada seccion.
--
-- Specs propietarios por seccion: SPEC-001 (usuarios y sesiones), SPEC-002
-- (cuadrillas), SPEC-003 (catalogos), SPEC-005 (taxonomia), SPEC-100 (entrega
-- de credenciales).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Extensiones
-- ═══════════════════════════════════════════════════════════════════════════

-- La busqueda de usuarios debe encontrar "Nunez" escribiendo "nunez": quien
-- busca no escribe las tildes. unaccent lo resuelve en la base, sin duplicar
-- columnas normalizadas ni normalizar en memoria despues de traer las filas.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Catalogos configurables (SPEC-003)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE catalog_types (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_system   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE TABLE catalog_items (
    id              BIGSERIAL PRIMARY KEY,
    catalog_type_id BIGINT       NOT NULL REFERENCES catalog_types(id),
    -- Jerarquia de dos niveles (SPEC-005 §4.1 D-01, enmienda SPEC-003 §3): la
    -- taxonomia real no es plana, 9 clases agrupan 45 tipos y el formulario de
    -- campo encadena ambos selectores. Nulable porque la mayoria de catalogos
    -- si son planos: un ROLE no tiene padre.
    parent_item_id  BIGINT       REFERENCES catalog_items(id),
    code            VARCHAR(50)  NOT NULL,
    label           VARCHAR(100) NOT NULL,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    metadata        JSONB,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP,
    UNIQUE (catalog_type_id, code),

    -- Un item no puede ser su propio padre. La profundidad maxima real (dos
    -- niveles) y la regla de que padre e hijo pertenezcan a catalog_type
    -- distintos las hace cumplir el servicio: un CHECK no puede consultar otra
    -- fila de la misma tabla.
    CONSTRAINT chk_catalog_items_not_self_parent
        CHECK (parent_item_id IS NULL OR parent_item_id <> id)
);

CREATE INDEX idx_catalog_types_code            ON catalog_types(code);
CREATE INDEX idx_catalog_items_catalog_type_id ON catalog_items(catalog_type_id);
CREATE INDEX idx_catalog_items_parent          ON catalog_items(parent_item_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Catalogo ROLE (SPEC-001 Anexo A)
-- ═══════════════════════════════════════════════════════════════════════════
-- Los cuatro roles del dominio real. El historial anterior sembraba ADMIN y un
-- USER generico que una migracion posterior desactivaba; aqui ese USER no llega
-- a existir.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ROLE', 'Roles del sistema', 'Roles asignables a los usuarios', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'ADMIN',       'Administrador',           1),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'COORDINADOR', 'Coordinador',             2),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'SUPERVISOR',  'Supervisor de cuadrilla', 3),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'OPERARIO',    'Operario de campo',       4);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Usuarios y sesiones (SPEC-001; columnas de credenciales, SPEC-100)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
    id                   BIGSERIAL PRIMARY KEY,
    email                VARCHAR(255) NOT NULL,
    password_hash        VARCHAR(255) NOT NULL,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    role_item_id         BIGINT       NOT NULL REFERENCES catalog_items(id),
    is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login           TIMESTAMP,

    -- Estado de entrega de credenciales (SPEC-100 §2.6). Independiente de
    -- is_active: is_active responde "¿sigue trabajando aqui?"; esta columna,
    -- "¿recibio su clave?".
    credential_status    VARCHAR(20)  NOT NULL DEFAULT 'DELIVERED'
        CHECK (credential_status IN ('PENDING_DELIVERY', 'DELIVERED')),
    -- TRUE mientras la contrasena vigente sea la temporal que asigno un
    -- administrador. Fuerza el cambio en el primer ingreso (SPEC-100 §5.2).
    must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Momento del ultimo envio. Permite saber cuanto lleva pendiente una
    -- entrega sin consultar audit_log.
    credentials_sent_at  TIMESTAMP,

    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP
);

-- Unico entre vigentes: libera el correo si el usuario se da de baja logica y
-- se necesita reutilizarlo.
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_item_id ON users(role_item_id);

-- El listado por defecto filtra activos y suele filtrar por rol.
CREATE INDEX idx_users_is_active_role ON users(is_active, role_item_id)
    WHERE deleted_at IS NULL;

-- Permite resaltar las entregas pendientes sin escanear la tabla.
CREATE INDEX idx_users_credential_status ON users(credential_status)
    WHERE credential_status = 'PENDING_DELIVERY' AND deleted_at IS NULL;

-- Revocacion de sesiones: un JWT firmado no se puede "borrar", asi que la
-- capacidad de cerrar sesion de verdad vive en esta tabla, no en el token.
CREATE TABLE refresh_tokens (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT       NOT NULL REFERENCES users(id),
    token_hash     VARCHAR(255) NOT NULL,
    issued_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at     TIMESTAMP    NOT NULL,
    revoked_at     TIMESTAMP,
    replaced_by_id BIGINT       REFERENCES refresh_tokens(id),
    client_type    VARCHAR(10)  NOT NULL CHECK (client_type IN ('web', 'mobile')),
    user_agent     VARCHAR(255),
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP
);

CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Cuenta inicial. Sin autorregistro y con el alta reservada a un ADMIN, el
-- sistema seria inaccesible sin ella.
--
-- El hash corresponde a la contrasena 'Hesperides2026', generada con BCrypt
-- (fuerza 10). DEBE cambiarse en el primer ingreso de cualquier despliegue
-- real: es publica en el repositorio y no es un secreto.
INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active)
SELECT
    'admin@pucp.edu.pe',
    '$2a$10$4r8g9MXWvnVXpz.Z5AIjRO/OsgquCUkP3xribRDZTpWkIJB06V22y',
    'Administrador',
    'Hesperides',
    (SELECT ci.id FROM catalog_items ci
      JOIN catalog_types ct ON ct.id = ci.catalog_type_id
     WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@pucp.edu.pe' AND deleted_at IS NULL
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Cuadrillas (SPEC-002 §4.10)
-- ═══════════════════════════════════════════════════════════════════════════
-- La operacion de campo no es plana: el operario reporta a un supervisor de
-- cuadrilla, y el supervisor al coordinador. Estas dos tablas permiten resolver
-- "solo mi equipo" sin recorrer la jerarquia a mano en cada consulta.

CREATE TABLE teams (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT       NOT NULL REFERENCES users(id),
    -- Sin FK a zones(id) todavia: esa tabla es propiedad del spec del catastro
    -- (modulo M2) y aun no existe. Nulable ademas porque una cuadrilla puede
    -- ser polivalente. El spec del catastro debe anadir la constraint.
    zone_id            BIGINT,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_teams_code_active ON teams(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_supervisor ON teams(supervisor_user_id);
CREATE INDEX idx_teams_zone       ON teams(zone_id);

-- Tabla puente con historia: left_at permite saber quien estuvo en que cuadrilla
-- cuando se ejecuto una intervencion pasada, sin reescribir el historico al
-- reasignar a alguien.
CREATE TABLE team_members (
    id         BIGSERIAL PRIMARY KEY,
    team_id    BIGINT    NOT NULL REFERENCES teams(id),
    user_id    BIGINT    NOT NULL REFERENCES users(id),
    joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at    TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Un usuario no puede estar dos veces activo en la misma cuadrilla.
CREATE UNIQUE INDEX idx_team_members_unique_active
    ON team_members(team_id, user_id) WHERE left_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Taxonomia de intervenciones (SPEC-005 §4.2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Fuente: hoja `tipo de actividades` del Excel DAF-OSG 2025-2026.
--
-- DIVERGENCIA DELIBERADA CON EL SPEC: SPEC-005 §4.2 asume que una migracion
-- previa creo INTERVENTION_TYPE con seis valores inventados y abre dandolos de
-- baja. Esa migracion nunca se escribio. DECORACION y REMOCION_TERRENO no se
-- siembran: no existen en la operacion real. El fondo de CA-03 (que no se
-- ofrezcan) se cumple; la forma (que existan con is_active = FALSE) no aplica.
--
-- DESCRIPCIONES PROVISIONALES: el Excel trae una descripcion por tipo, pero no
-- esta en el repositorio. Solo `Canteo` y `Deshierbo` constan textuales en
-- material del cliente (docs/dominio/README.md §5.4). Las 43 restantes estan
-- redactadas por nosotros a partir del nombre y la clase, y deben contrastarse
-- antes de produccion: son el texto de ayuda que el operario lee en campo.
--
-- Las nueve descripciones de CLASE si son textuales del cliente.

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('INTERVENTION_CLASS', 'Clases de intervención',
     'Agrupación de primer nivel de los trabajos sobre áreas verdes', FALSE),
    ('INTERVENTION_TYPE',  'Tipos de intervención',
     'Trabajos ejecutables sobre un elemento', FALSE);

-- ── Las nueve clases ─────────────────────────────────────────────────────
-- responsible_group conecta la clase con las cuadrillas y explica por que
-- FITOSANITARIO e INSPECCION llegaron sin tipos confirmados: su detalle vive
-- fuera de la hoja de jardineros.
-- priority marca el orden de construccion del equipo, no una regla de dominio:
-- una clase sin el flag se registra igual que una marcada (CA-14).
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'HABILITACION', 'Habilitación de jardines', 1, '{"responsible_group": "jardineros", "description": "Creación e implementación de nuevas áreas verdes"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'REHABILITACION', 'Rehabilitación de jardines', 2, '{"responsible_group": "jardineros", "description": "Recuperación o renovación de jardines existentes"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'MANTENIMIENTO', 'Mantenimiento de jardines', 3, '{"responsible_group": "jardineros", "description": "Conservación rutinaria de las áreas verdes", "priority": true}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'PODA', 'Poda', 4, '{"responsible_group": "jardineros", "description": "Corte y manejo de árboles, arbustos y otras plantas", "priority": true}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'PROPAGACION', 'Propagación y plantación', 5, '{"responsible_group": "jardineros", "description": "Producción, multiplicación e instalación de plantas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'RIEGO', 'Riego', 6, '{"responsible_group": "jardineros", "description": "Aplicación de agua y mantenimiento del sistema de riego"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'FITOSANITARIO', 'Manejo fitosanitario', 7, '{"responsible_group": "herts", "description": "Prevención y control de plagas y enfermedades", "priority": true}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'RESIDUOS', 'Manejo de residuos vegetales', 8, '{"responsible_group": "jardineros / herts", "description": "Recolección y aprovechamiento de residuos vegetales"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_CLASS'), 'INSPECCION', 'Inspección y monitoreo', 9, '{"responsible_group": "Roobert", "description": "Evaluación y seguimiento del estado de las áreas verdes"}');

-- ── Habilitación de jardines (6) ─────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'PREPARACION_TERRENO', 'Preparación del terreno', 1, '{"description": "Acondicionar el terreno antes de plantar: limpieza, nivelación y removido del suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INCORPORACION_SUSTRATO', 'Incorporación de sustrato', 2, '{"description": "Añadir tierra de cultivo o sustrato preparado para mejorar la base de plantación"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_PLANTAS', 'Instalación de plantas', 3, '{"description": "Colocar plantas en un área que se habilita por primera vez"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_CESPED', 'Instalación de césped', 4, '{"description": "Colocar césped en panel (champa) o sembrarlo en un área nueva"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'COBERTURA_ORNAMENTAL', 'Colocación de cobertura ornamental', 5, '{"description": "Extender confitillo, mulch u otro acabado decorativo sobre el suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'HABILITACION'), 'INSTALACION_TUTORES', 'Instalación de tutores', 6, '{"description": "Colocar estacas o soportes que guían y sostienen a la planta joven"}');

-- ── Rehabilitación de jardines (7) ─────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'REPOSICION_PLANTAS', 'Reposición de plantas', 1, '{"description": "Sustituir plantas muertas o deterioradas por ejemplares sanos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RECUPERACION_AREAS', 'Recuperación de áreas verdes', 2, '{"description": "Devolver a condición de uso un área degradada o abandonada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RENOVACION_JARDINERAS', 'Renovación de jardineras', 3, '{"description": "Rehacer el contenido de una jardinera: sustrato, plantas y acabado"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'MEJORAMIENTO_SUELO', 'Mejoramiento del suelo', 4, '{"description": "Corregir la calidad del suelo existente para recuperar su fertilidad"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RENOVACION_COBERTURA', 'Renovación de cobertura ornamental', 5, '{"description": "Reponer o cambiar el confitillo, mulch u otro acabado ya desgastado"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'RESIEMBRA', 'Resiembra', 6, '{"description": "Volver a sembrar sobre un área donde la plantación anterior no prosperó"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'REHABILITACION'), 'REUBICACION_MACETAS', 'Reubicación de macetas', 7, '{"description": "Cambiar de sitio macetas o macetones ya instalados"}');

-- ── Mantenimiento de jardines (10) ─────────────────────────────────────
-- Canteo y Deshierbo llevan la descripción textual del cliente (README §5.4).
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'CANTEO', 'Canteo', 1, '{"description": "Delimitar y perfilar los bordes de jardineras o macizos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'DESHIERBO', 'Deshierbo', 2, '{"description": "Quitar malas hierbas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'ESCARDA', 'Escarda', 3, '{"description": "Remover superficialmente el suelo alrededor de la planta para airearlo y eliminar hierba naciente"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_HOJARASCA', 'Limpieza de hojarasca', 4, '{"description": "Retirar hojas caídas del área verde. En el registro del cliente incluye el barrido de hojas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_PLANTAS', 'Limpieza de plantas', 5, '{"description": "Retirar hojas secas, flores marchitas y restos adheridos a la planta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'AIREACION_SUELO', 'Aireación del suelo', 6, '{"description": "Perforar o descompactar el suelo para que el agua y el aire lleguen a la raíz"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'LIMPIEZA_JARDINERAS', 'Limpieza integral de jardineras', 7, '{"description": "Limpieza completa de una jardinera, incluidos residuos y elementos ajenos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'FERTILIZACION', 'Fertilización', 8, '{"description": "Aplicar fertilizante para aportar nutrientes a la planta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'APLICACION_ENMIENDAS', 'Aplicación de enmiendas', 9, '{"description": "Incorporar materia orgánica o correctores para mejorar la estructura del suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'MANTENIMIENTO'), 'TRASLADO_MACETAS', 'Traslado de macetas', 10, '{"description": "Mover macetas dentro del campus por evento, obra o necesidad del área"}');

-- ── Poda (4) ─────────────────────────────────────
-- La poda de altura (más de 5 m) es tercerizada y requiere prevencionista; estos
-- cuatro tipos describen el trabajo, no quién lo ejecuta.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_MANTENIMIENTO', 'Poda de mantenimiento', 1, '{"description": "Poda periódica que conserva la forma y el tamaño del ejemplar"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_FORMACION', 'Poda de formación', 2, '{"description": "Poda que orienta la estructura del ejemplar joven hacia la forma deseada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_SANITARIA', 'Poda sanitaria', 3, '{"description": "Retirar ramas secas, enfermas o dañadas para proteger la salud del ejemplar"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PODA'), 'PODA_DESPEJE', 'Poda de despeje/reducción', 4, '{"description": "Reducir el volumen del ejemplar para liberar luminarias, cámaras, fachadas o vías de paso"}');

-- ── Propagación y plantación (10) ─────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PROPAGACION_DIVISION', 'Propagación por división de matas', 1, '{"description": "Separar una mata en varias plantas independientes con raíz propia"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PROPAGACION_ESQUEJES', 'Propagación por esquejes', 2, '{"description": "Obtener plantas nuevas a partir de fragmentos de tallo enraizados"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'TRASPLANTE', 'Trasplante', 3, '{"description": "Mover una planta ya establecida a una ubicación definitiva distinta"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'SIEMBRA_PLANTAS', 'Siembra de plantas', 4, '{"description": "Sembrar directamente en el terreno a partir de semilla o plantín"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_ARBOLES', 'Plantación de árboles', 5, '{"description": "Instalar un árbol en su ubicación definitiva"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_ARBUSTOS', 'Plantación de arbustos', 6, '{"description": "Instalar arbustos en jardinera o macizo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_CUBRESUELOS', 'Plantación de cubresuelos', 7, '{"description": "Instalar plantas de porte bajo que tapizan el suelo"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'PLANTACION_MACETAS', 'Plantación en macetas', 8, '{"description": "Plantar directamente en maceta o macetón"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'TRASPLANTE_MACETAS', 'Trasplante a macetas', 9, '{"description": "Pasar a maceta una planta que estaba en el terreno o en vivero"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'PROPAGACION'), 'CAMBIO_MACETA', 'Cambio de maceta', 10, '{"description": "Trasladar la planta a una maceta de mayor tamaño o reemplazar la dañada"}');

-- ── Riego (4) ─────────────────────────────────────
-- El riego es semi-tecnificado y manual: hoy no hay pop-ups ni electroválvulas.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_MANUAL', 'Riego manual', 1, '{"description": "Riego con manguera o regadera sobre el área asignada"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_NOCTURNO', 'Riego nocturno', 2, '{"description": "Riego programado fuera del horario de actividad del campus para reducir evaporación"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'RIEGO_ESTABLECIMIENTO', 'Riego de establecimiento', 3, '{"description": "Riego de apoyo a una plantación reciente hasta que arraiga"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RIEGO'), 'VERIFICACION_RIEGO', 'Verificación del sistema de riego', 4, '{"description": "Revisar el estado y funcionamiento de la red de riego"}');

-- ── Manejo de residuos vegetales (4) ─────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'RECOLECCION_HOJARASCA', 'Recolección de hojarasca', 1, '{"description": "Juntar y retirar la hojarasca acumulada para su disposición"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'RECOLECCION_RAMAS', 'Recolección de ramas', 2, '{"description": "Juntar y retirar las ramas resultantes de podas o caídas"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'TRITURADO_RESIDUOS', 'Triturado de residuos', 3, '{"description": "Triturar restos vegetales para reducir volumen u obtener mulch"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'RESIDUOS'), 'DISPOSICION_RESIDUOS', 'Disposición o aprovechamiento de residuos', 4, '{"description": "Destino final del residuo vegetal: retiro del campus o reaprovechamiento en el área verde"}');

-- ── Tipos PRELIMINARES de FITOSANITARIO e INSPECCION ─────────────────────
-- ⚠️ DATOS PRELIMINARES, NO CONFIRMADOS POR EL CLIENTE ⚠️
--
-- El Excel DAF-OSG no desglosa estas dos clases: esa hoja es el registro de
-- los jardineros, y ambas estan asignadas a grupos distintos (`herts` y
-- `Roobert`), cuyo detalle vive en documentos que no tenemos. La entrevista C1
-- pregunta exactamente esto y sigue sin respuesta (P-10 de SPEC-005).
--
-- Se redactan a partir de lo que el dominio SI documenta: aplicacion estacional
-- a todo el campus cada 3 meses con refuerzos segun la plaga (README §6),
-- minimo 4 controles al ano (§7), el objetivo es controlar la poblacion y no
-- erradicarla (§4), y el estado sanitario es atributo del elemento verde (§8).
--
-- COMO REVERTIRLOS cuando llegue el desglose real:
--   SELECT ... WHERE metadata->>'provisional' = 'true'
-- localiza estos siete y solo estos. Si algun registro ya los referencia, se
-- desactivan (is_active = FALSE) en vez de borrarse (SPEC-003 §7.1).
--
-- MigrationSmokeTest fija que los tipos confirmados siguen siendo exactamente
-- 45, de modo que estos nunca se cuelan en esa cuenta.

-- Manejo fitosanitario (4 preliminares)
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'MONITOREO_PLAGAS', 'Monitoreo de plagas y enfermedades', 1, '{"provisional": true, "description": "Revisar los ejemplares para detectar presencia de plagas o enfermedades y decidir si hace falta intervenir"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'APLICACION_ESTACIONAL', 'Aplicación estacional', 2, '{"provisional": true, "description": "Tratamiento programado a todo el campus, aproximadamente cada 3 meses"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'APLICACION_REFUERZO', 'Aplicación de refuerzo', 3, '{"provisional": true, "description": "Tratamiento puntual fuera del calendario estacional, cuando una plaga lo exige"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'FITOSANITARIO'), 'TRATAMIENTO_FOCO', 'Tratamiento de foco localizado', 4, '{"provisional": true, "description": "Intervencion sobre un ejemplar o grupo concreto con plaga o enfermedad declarada"}');

-- Inspección y monitoreo (3 preliminares)
-- El grupo responsable figura en el Excel como `Roobert`, que parece nombre de
-- persona y no de cuadrilla. Cabe que no sea una clase con tipos propios sino
-- el trabajo de supervision de alguien. La entrevista C1 tambien pregunta esto.
INSERT INTO catalog_items (catalog_type_id, parent_item_id, code, label, sort_order, metadata) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'INSPECCION_ESTADO', 'Inspección de estado', 1, '{"provisional": true, "description": "Revision del estado de conservacion de un area verde o de sus elementos"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'INSPECCION_RIESGO', 'Inspección de riesgo', 2, '{"provisional": true, "description": "Evaluacion de un ejemplar por riesgo de caida de rama o volcadura"}'),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), (SELECT ci.id FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'INTERVENTION_CLASS' AND ci.code = 'INSPECCION'), 'VERIFICACION_TRABAJO', 'Verificación de trabajo ejecutado', 3, '{"provisional": true, "description": "Comprobacion en campo de que una intervencion quedo correctamente ejecutada"}');
