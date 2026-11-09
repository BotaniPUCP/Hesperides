package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;

/** Una regla vigente que planifica: de todo el campus ({@code setId} nulo) o propia de un conjunto. */
public record PlanningRule(long activityTypeItemId, String activityLabel, Long setId, FrequencyRule rule) {
}
