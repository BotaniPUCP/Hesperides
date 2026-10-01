package pe.edu.pucp.hesperides.engine.proximity;

/**
 * Dónde está un punto, en el vocabulario del personal.
 *
 * @param section      sección que contiene el punto, o nulo si está fuera de las áreas verdes
 * @param building     edificio elegido, o nulo si no hay edificios
 * @param buildingName nombre con que se lo describe (puede venir de una referencia)
 * @param distanceM    distancia del punto al edificio; 0 si está dentro
 */
public record LocationDescription(SectionCandidate section, BuildingCandidate building,
                                  String buildingName, BuildingRelation relation,
                                  double distanceM, String text) {
}
