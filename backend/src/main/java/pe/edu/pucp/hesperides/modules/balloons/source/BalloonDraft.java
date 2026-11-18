package pe.edu.pucp.hesperides.modules.balloons.source;

import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;
import pe.edu.pucp.hesperides.engine.balloons.GeoPoint;
import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.BalloonCard;

import java.util.List;

/**
 * Lo que una fuente aporta antes de partirlo en minigrupos: un origen (una incidencia,
 * una intervención, un conjunto) con todas sus anclas. {@code sourceId} identifica el
 * origen dentro de su tipo y forma el id del globo.
 */
public record BalloonDraft(BalloonKind kind, String variant, String sourceId, BalloonCard card,
                           List<GeoPoint> anchors) {

    public BalloonDraft {
        anchors = List.copyOf(anchors);
    }
}
