package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.data.jpa.domain.Specification;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.List;

/**
 * Qué usuarios entran en el listado de quien pregunta. Buscar y filtrar por rol, estado o
 * cuadrilla se hace en el navegador sobre esta lista completa (SPEC-119).
 *
 * Vive aparte de UsersServiceImpl para no mezclar dos responsabilidades —
 * orquestar reglas de negocio y traducir una consulta.
 */
public final class UserSpecifications {

    private UserSpecifications() {
    }

    /**
     * @param scopeUserIds null significa "sin restricción de alcance"; una lista vacía
     *                     significa "no ve a nadie", que es lo correcto para un supervisor
     *                     sin cuadrilla. Son dos casos distintos y no deben confundirse.
     */
    public static Specification<User> visibleTo(List<Long> scopeUserIds) {
        // Las filas dadas de baja lógica no existen para ningún listado.
        Specification<User> live = (root, query, cb) -> cb.isNull(root.get("deletedAt"));
        if (scopeUserIds == null) {
            return live;
        }
        return live.and((root, query, cb) ->
                scopeUserIds.isEmpty() ? cb.disjunction() : root.get("id").in(scopeUserIds));
    }
}
