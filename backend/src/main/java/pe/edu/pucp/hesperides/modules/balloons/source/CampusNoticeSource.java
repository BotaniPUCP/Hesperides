package pe.edu.pucp.hesperides.modules.balloons.source;

import pe.edu.pucp.hesperides.modules.balloons.dto.BalloonDtos.CampusNotice;

import java.util.List;

/**
 * Una fuente de avisos de todo el campus para la franja del mapa (SPEC-114 D-06). Un evento de
 * todo el campus no tiene dónde clavarse: no es un globo, es un aviso.
 */
public interface CampusNoticeSource {

    List<CampusNotice> notices();
}
