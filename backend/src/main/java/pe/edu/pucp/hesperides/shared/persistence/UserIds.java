package pe.edu.pucp.hesperides.shared.persistence;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** El id de la cuenta de la sesión, que el principal solo identifica por su correo. */
@Repository
@RequiredArgsConstructor
public class UserIds {

    private final JdbcTemplate jdbc;

    /** Una sesión válida siempre tiene cuenta: si no la hay, es un error del sistema, no del usuario. */
    public long of(String email) {
        Long id = jdbc.queryForObject("SELECT id FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL",
                Long.class, email);
        if (id == null) {
            throw new IllegalStateException("Usuario de la sesión inexistente: " + email);
        }
        return id;
    }
}
