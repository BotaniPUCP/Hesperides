package pe.edu.pucp.hesperides.modules.users.service;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.users.entity.TeamMember;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Traduce los parámetros del listado a predicados de JPA. Un parámetro ausente
 * no añade condición (SPEC-C03 §6.1).
 *
 * Vive aparte de UsersServiceImpl para no mezclar dos responsabilidades —
 * orquestar reglas de negocio y traducir una consulta — y para no empujar ese
 * servicio por encima de su límite de tamaño.
 */
public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<User> withFilters(
            String search, String roleCode, Boolean isActive, Long teamId, List<Long> scopeUserIds) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Las filas dadas de baja lógica no existen para ningún listado.
            predicates.add(cb.isNull(root.get("deletedAt")));

            // Sin el parámetro explícito se muestran solo los activos: es lo que
            // se necesita el 95% de las veces (SPEC-100 §5.5).
            predicates.add(cb.equal(root.get("active"), isActive == null ? Boolean.TRUE : isActive));

            if (search != null && !search.isBlank()) {
                predicates.add(searchPredicate(root, cb, search));
            }

            if (roleCode != null && !roleCode.isBlank()) {
                predicates.add(cb.equal(root.get("roleItem").get("code"), roleCode));
            }

            if (teamId != null) {
                predicates.add(membershipPredicate(root, query, cb, teamId));
            }

            // null significa "sin restricción de alcance"; una lista vacía
            // significa "no ve a nadie", que es lo correcto para un supervisor
            // sin cuadrilla. Son dos casos distintos y no deben confundirse.
            if (scopeUserIds != null) {
                predicates.add(
                        scopeUserIds.isEmpty() ? cb.disjunction() : root.get("id").in(scopeUserIds));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Busca en nombre, apellido y correo. Usa `unaccent` de PostgreSQL para que
     * "nunez" encuentre a "Núñez": quien busca no escribe las tildes.
     */
    private static Predicate searchPredicate(Root<User> root, CriteriaBuilder cb, String search) {
        String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";

        return cb.or(
                cb.like(unaccentLower(cb, root.get("firstName")), unaccentLiteral(cb, pattern)),
                cb.like(unaccentLower(cb, root.get("lastName")), unaccentLiteral(cb, pattern)),
                cb.like(cb.lower(root.get("email")), pattern));
    }

    private static Expression<String> unaccentLower(CriteriaBuilder cb, Expression<String> field) {
        return cb.function("unaccent", String.class, cb.lower(field));
    }

    private static Expression<String> unaccentLiteral(CriteriaBuilder cb, String value) {
        return cb.function("unaccent", String.class, cb.literal(value));
    }

    /**
     * Subconsulta en vez de join: un join duplicaría la fila del usuario si
     * perteneciera a varias cuadrillas, y el listado mostraría la misma persona
     * dos veces.
     */
    private static Predicate membershipPredicate(
            Root<User> root, CriteriaQuery<?> query, CriteriaBuilder cb, Long teamId) {

        Subquery<Long> subquery = query.subquery(Long.class);
        Root<TeamMember> member = subquery.from(TeamMember.class);
        subquery.select(member.get("userId"))
                .where(cb.and(
                        cb.equal(member.get("team").get("id"), teamId),
                        cb.isNull(member.get("leftAt")),
                        cb.isNull(member.get("deletedAt"))));

        return root.get("id").in(subquery);
    }
}
