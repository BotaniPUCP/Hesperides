package pe.edu.pucp.hesperides.modules.balloons.placement;

import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;

/**
 * El jardín donde se posa un globo: {@code gardenId} nulo si se queda donde está (sobre un
 * ejemplar suelto o lejos de todo jardín); {@code inside} si ya caía dentro; {@code center}, un
 * punto dentro del jardín, alrededor del cual se reparten los globos que lo comparten.
 */
public record GardenSpot(Long gardenId, boolean inside, GeoPoint center) {
}
