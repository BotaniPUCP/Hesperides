package pe.edu.pucp.hesperides.modules.balloons.dto;

import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;

import java.time.Instant;
import java.util.List;

/** Respuesta de {@code GET /api/v1/map/balloons} (SPEC-113 §3). */
public final class BalloonDtos {

    private BalloonDtos() {
    }

    /** Una línea de la ficha, ya en español: el navegador no interpreta estados (§3.1). */
    public record CardLine(String label, String value) {
    }

    public record CardProgress(int done, int total) {
    }

    /** La ficha corta. {@code progress} y {@code photoUrl} son nulos cuando no aplican. */
    public record BalloonCard(String title, String status, List<CardLine> lines, CardProgress progress,
                              String photoUrl, String href) {
        public BalloonCard {
            lines = List.copyOf(lines);
        }
    }

    /**
     * Un globo ya partido en su minigrupo. {@code id} es estable entre consultas mientras
     * el origen no cambie; {@code sectorId} es nulo si el ancla no cae en ninguna sección.
     */
    public record BalloonResponse(String id, BalloonKind kind, String variant, boolean attention,
                                  double latitude, double longitude, Long sectorId, int memberCount,
                                  BalloonCard card) {
    }

    /**
     * Un aviso de todo el campus para la franja de arriba del mapa (SPEC-114 D-06), como «Hoy es
     * feriado: Fiestas Patrias». {@code typeCode} es el del evento: BLOCKING u HOLIDAY.
     */
    public record CampusNotice(String typeCode, String text) {
    }

    /** {@code truncated}: había más de los que caben y se recortó por urgencia. */
    public record BalloonsResponse(Instant generatedAt, List<BalloonResponse> balloons,
                                   List<BalloonKind> unavailableKinds, boolean truncated,
                                   List<CampusNotice> campusNotices) {
    }
}
