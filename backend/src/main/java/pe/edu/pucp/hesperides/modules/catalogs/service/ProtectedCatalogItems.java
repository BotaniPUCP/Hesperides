package pe.edu.pucp.hesperides.modules.catalogs.service;

import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.Map;
import java.util.Set;

/**
 * Los ítems de los que depende una decisión del backend (SPEC-003 §8). No todo
 * ítem de un tipo de sistema está protegido: solo aquellos cuyo code se compara
 * en código para decidir una transición de estado o un permiso.
 *
 * Desactivarlos responde 409 y no 403: el ADMIN tiene el permiso de sobra; lo
 * que falla es que la operación entra en conflicto con lógica que depende de
 * ese valor.
 */
final class ProtectedCatalogItems {

    private static final Map<String, Set<String>> BY_TYPE = Map.of(
            "ROLE", Set.of("ADMIN", "COORDINADOR", "SUPERVISOR", "OPERARIO"),
            "INTERVENTION_STATUS", Set.of("ASSIGNED", "IN_PROGRESS", "COMPLETED", "VALIDATED"),
            "EVIDENCE_MOMENT", Set.of("BEFORE", "AFTER"),
            "CONTRACT_STATUS", Set.of("DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"),
            "EXECUTION_STATUS", Set.of("PLANNED", "EXECUTED", "MISSED", "OBSERVED"),
            "INCIDENT_STATUS", Set.of("REPORTED", "IN_REVIEW", "IN_PROGRESS", "RESOLVED"),
            "URGENCY_LEVEL", Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL"));

    private ProtectedCatalogItems() {
    }

    static boolean covers(CatalogItem item) {
        return BY_TYPE.getOrDefault(item.getCatalogType().getCode(), Set.of())
                .contains(item.getCode());
    }
}
