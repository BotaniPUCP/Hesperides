package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Las reglas vigentes indexadas: por regla, para las asignaciones, y la de todo el campus de cada actividad. */
final class RuleCatalog {

    private final Map<UUID, PlanningRule> byKey = new HashMap<>();
    private final Map<Long, PlanningRule> general = new HashMap<>();

    private RuleCatalog() {
    }

    static RuleCatalog of(List<PlanningRule> rules) {
        var catalog = new RuleCatalog();
        for (PlanningRule r : rules) {
            catalog.byKey.put(r.ruleKey(), r);
            if (r.campusWide()) catalog.general.put(r.activityTypeItemId(), r);
        }
        return catalog;
    }

    /** La regla asignada, si sigue vigente y planifica; nula si la asignación quedó sin frecuencia. */
    PlanningRule byKey(UUID ruleKey) {
        return ruleKey == null ? null : byKey.get(ruleKey);
    }

    FrequencyRule generalRule(long activity) {
        PlanningRule r = general.get(activity);
        return r == null ? null : r.rule();
    }
}
