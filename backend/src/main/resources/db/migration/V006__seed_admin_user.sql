-- Sin autorregistro y con el alta reservada a un ADMIN, el sistema sería
-- inaccesible sin una cuenta inicial. Este es el punto de entrada.
--
-- El hash corresponde a la contraseña 'Hesperides2026', generada con BCrypt
-- (fuerza 10). DEBE cambiarse en el primer ingreso de cualquier despliegue
-- real: es pública en el repositorio y no es un secreto.

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
