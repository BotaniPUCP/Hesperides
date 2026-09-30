-- Propiedad de SPEC-002 §4.9. La tabla llega ahora, junto con los cuatro
-- parámetros que el cliente pidió configurar (SPEC-100 §9.3 y la 2.ª entrevista
-- apuntan a ellos de forma dispersa; esta migración los materializa).
--
-- Llegó como V012 desde su rama, escrita sobre el historial de doce migraciones
-- que V001 consolidó en un baseline. Renumerada a V003 al integrarla: un V012
-- dejaría nueve números en blanco y REGLAS.md §0.2 pide numeración cronológica
-- y sin huecos. El DDL no cambió — no depende de ninguna migración intermedia.

CREATE TABLE system_parameters (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(60)  NOT NULL,
    label        VARCHAR(150) NOT NULL,
    value        TEXT,
    value_type   VARCHAR(20)  NOT NULL DEFAULT 'STRING'
                 CHECK (value_type IN ('STRING','INTEGER','DECIMAL','BOOLEAN','JSON')),
    description  TEXT,
    is_editable  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP
);

CREATE UNIQUE INDEX idx_system_parameters_code_active
    ON system_parameters(code) WHERE deleted_at IS NULL;

-- Los tres parámetros configurables. La longitud mínima y los intentos de login
-- reemplazan, con los mismos valores, a la constante de PasswordPolicy y al
-- default de `max-attempts`. Las hectáreas del campus las usa el reporte de
-- cobertura (dato de la 2.ª entrevista).
--
-- EL REMITENTE DE CORREO NO ES UN PARÁMETRO, y esto se aprendió probando:
-- sembrado aquí como MAIL_FROM, cualquier dirección sintácticamente válida se
-- aceptaba desde la pantalla. Pero un remitente solo sirve si está verificado en
-- el proveedor, y eso no lo decide este sistema. Brevo exige o confirmar la
-- dirección por correo (imposible en un buzón inexistente) o autenticar el
-- dominio por DNS (accesible solo a la DTI). Un remitente no verificado recibe
-- «250 OK» y se descarta en silencio: el sistema reporta entrega exitosa y el
-- correo no llega nunca.
--
-- Por eso el remitente vive en SMTP_FROM, junto al host y las credenciales del
-- mismo proveedor: quien lo cambia debe tener acceso al despliegue, no solo el
-- rol de administrador. Ofrecerlo en una pantalla prometía un control que la
-- aplicación no tiene.
INSERT INTO system_parameters
    (code, label, value, value_type, description, is_editable) VALUES
    -- 12 es el piso que el administrador puede fijar (el techo son 25). Antes se
    -- sembraba 10, por debajo de ese piso: la fila habría nacido fuera del rango
    -- que su propia pantalla acepta.
    ('PASSWORD_MIN_LENGTH', 'Longitud mínima de contraseña',
     '12', 'INTEGER',
     'Cantidad mínima de caracteres que debe tener la contraseña de un usuario', TRUE),
    ('LOGIN_MAX_ATTEMPTS', 'Intentos de acceso antes de bloquear',
     '5', 'INTEGER',
     'Número de intentos fallidos que bloquean temporalmente el inicio de sesión', TRUE),
    ('CAMPUS_TOTAL_HECTARES', 'Hectáreas del campus',
     '41', 'DECIMAL',
     'Extensión total del campus en hectáreas', TRUE);