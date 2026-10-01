package pe.edu.pucp.hesperides.modules.map.dto;

/**
 * Dónde está un punto. {@code text} es lo que se guardará en una incidencia
 * (SPEC-102 D-05); los demás campos permiten mostrarlo o enlazarlo.
 *
 * @param sectionCode nulo si el punto está fuera de las áreas verdes
 * @param relation    INSIDE, ADJACENT_TO_SECTION o NEAREST; nulo si no hay edificios
 */
public record LocationDescriptionResponse(String sectionCode, String sectionName, String buildingName,
                                          String relation, double distanceM, String text) {
}
