package pe.edu.pucp.hesperides.shared.storage;

import java.time.LocalDateTime;
import java.time.Period;

/** Cuánto se guardan los archivos de una foto dada de baja antes de borrarlos. */
public final class PhotoRetention {

    /**
     * Cuatro meses: margen para notar una baja equivocada y restaurar la fila a
     * mano mientras los archivos siguen ahí.
     */
    public static final Period AFTER_DELETION = Period.ofMonths(4);

    /** Fotos por tabla y por pasada: una pasada larga no debe trabar el backend. */
    public static final int BATCH_SIZE = 500;

    private PhotoRetention() {
    }

    /** Las dadas de baja antes de este instante ya pueden perder sus archivos. */
    public static LocalDateTime cutoff(LocalDateTime now) {
        return now.minus(AFTER_DELETION);
    }
}
