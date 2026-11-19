package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

import java.util.UUID;

/**
 * Una regla vigente que planifica. {@code ruleKey} es la regla (compartida por sus
 * versiones), a la que apuntan las asignaciones; {@code campusWide} si es la de todo el campus.
 */
public record PlanningRule(long activityTypeItemId, String activityLabel, UUID ruleKey, boolean campusWide, FrequencyRule rule) {
}
