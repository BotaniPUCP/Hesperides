package pe.edu.pucp.hesperides.support;

import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Usuarios reales para las pruebas que autentican con un usuario simulado: la auditoría
 * (SPEC-004) guarda en {@code audit_log} el id de quien actúa y, si no existe, revierte la
 * operación. En producción todo usuario autenticado existe; en las pruebas hay que crearlo.
 */
public final class TestUsers {

    private TestUsers() {
    }

    /** Crea el usuario con ese rol si aún no existe; si ya existe, no lo toca. */
    public static void ensure(JdbcTemplate jdbc, String email, String roleCode) {
        jdbc.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                SELECT ?, 'test', 'Usuario', 'Prueba', i.id
                  FROM catalog_items i JOIN catalog_types t ON t.id = i.catalog_type_id
                 WHERE t.code = 'ROLE' AND i.code = ?
                   AND NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL)
                """, email, roleCode, email);
    }
}
