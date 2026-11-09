package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Las reglas vigentes indexadas: la general de cada actividad y la propia de cada conjunto. */
final class RuleCatalog {

    private final Map<Long, PlanningRule> general = new HashMap<>();
    private final Map<String, PlanningRule> own = new HashMap<>();

    private RuleCatalog() {
    }

    static RuleCatalog of(List<PlanningRule> rules) {
        var catalog = new RuleCatalog();
        for (PlanningRule r : rules) {
            if (r.setId() == null) catalog.general.put(r.activityTypeItemId(), r);
            else catalog.own.put(key(r.activityTypeItemId(), r.setId()), r);
        }
        return catalog;
    }

    /** D-07: la propia del conjunto reemplaza a la general solo para ese conjunto. */
    PlanningRule forSet(long activity, long setId) {
        PlanningRule mine = ownRule(activity, setId);
        return mine != null ? mine : general.get(activity);
    }

    PlanningRule ownRule(long activity, long setId) {
        return own.get(key(activity, setId));
    }

    FrequencyRule generalRule(long activity) {
        PlanningRule r = general.get(activity);
        return r == null ? null : r.rule();
    }

    private static String key(long activity, long setId) {
        return activity + ":" + setId;
    }
}
