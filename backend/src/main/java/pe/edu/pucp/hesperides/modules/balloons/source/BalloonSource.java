package pe.edu.pucp.hesperides.modules.balloons.source;

import pe.edu.pucp.hesperides.engine.balloons.BalloonKind;

import java.util.List;

/**
 * Una fuente de globos (SPEC-113 D-01). Cada módulo dueño de los datos la implementa en
 * su propio paquete; el módulo de globos solo conoce esta interfaz. Agregar un tipo de
 * globo es agregar una fuente: nada más cambia.
 */
public interface BalloonSource {

    /** Los tipos que aporta: si la fuente falla, se avisan como no disponibles. */
    List<BalloonKind> kinds();

    /** Los globos vigentes ahora, cada uno con todas sus anclas. */
    List<BalloonDraft> drafts();
}
