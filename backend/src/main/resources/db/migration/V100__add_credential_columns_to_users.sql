-- V100__add_credential_columns_to_users.sql
-- SPEC-100 §4. La tabla users ya existe (V002); solo se añaden columnas.

-- Estado de entrega de credenciales. Independiente de is_active (SPEC-100 §2.6):
-- is_active responde "¿sigue trabajando aquí?"; esta columna, "¿recibió su clave?".
ALTER TABLE users
    ADD COLUMN credential_status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED'
        CHECK (credential_status IN ('PENDING_DELIVERY', 'DELIVERED'));

-- TRUE mientras la contraseña vigente sea la temporal que asignó un administrador.
-- Fuerza el cambio en el primer ingreso (SPEC-100 §5.2).
ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Momento del último envío de credenciales. Sirve para que el administrador sepa
-- cuánto lleva pendiente una entrega sin tener que consultar audit_log.
ALTER TABLE users
    ADD COLUMN credentials_sent_at TIMESTAMP;

-- El listado por defecto filtra activos y suele filtrar por rol; el índice cubre
-- el caso más frecuente de la pantalla /admin/usuarios.
CREATE INDEX idx_users_is_active_role ON users(is_active, role_item_id)
    WHERE deleted_at IS NULL;

-- Permite que la pantalla resalte las entregas pendientes sin escanear la tabla.
CREATE INDEX idx_users_credential_status ON users(credential_status)
    WHERE credential_status = 'PENDING_DELIVERY' AND deleted_at IS NULL;