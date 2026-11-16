package pe.edu.pucp.hesperides.modules.incidents.service;

import pe.edu.pucp.hesperides.engine.incidents.AgentSuggestion;
import pe.edu.pucp.hesperides.engine.incidents.HeightClass;

import java.util.LinkedHashMap;
import java.util.Map;

/** La sugerencia del agente tal como se guarda en `prefill_suggestion` (JSONB). */
final class PrefillSuggestions {
    private PrefillSuggestions() {
    }

    static Map<String, Object> toMap(AgentSuggestion s) {
        var map = new LinkedHashMap<String, Object>();
        map.put("title", s.title());
        map.put("typeCode", s.typeCode());
        map.put("zoneId", s.zoneId());
        map.put("reference", s.reference());
        map.put("thirdParty", s.thirdParty());
        map.put("heightClass", s.height().name());
        map.put("imminentRisk", s.imminentRisk());
        map.put("imminentReason", s.imminentReason());
        map.put("plan", s.plan());
        map.put("justification", s.justification());
        map.put("confidence", s.confidence());
        return map;
    }

    static AgentSuggestion fromMap(Map<String, Object> map) {
        return new AgentSuggestion(text(map, "title"), text(map, "typeCode"), number(map, "zoneId"),
                text(map, "reference"), Boolean.TRUE.equals(map.get("thirdParty")),
                HeightClass.fromCode(text(map, "heightClass")), Boolean.TRUE.equals(map.get("imminentRisk")),
                text(map, "imminentReason"), text(map, "plan"), text(map, "justification"),
                map.get("confidence") instanceof Number n ? n.doubleValue() : 0);
    }

    private static String text(Map<String, Object> map, String key) {
        return map.get(key) instanceof String s && !s.isBlank() ? s : null;
    }

    private static Long number(Map<String, Object> map, String key) {
        return map.get(key) instanceof Number n ? n.longValue() : null;
    }
}
