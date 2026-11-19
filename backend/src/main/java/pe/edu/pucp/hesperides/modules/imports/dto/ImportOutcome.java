package pe.edu.pucp.hesperides.modules.imports.dto;

/** La parte común del resumen de una carga confirmada; cada tipo agrega lo suyo. */
public interface ImportOutcome {

    long batchId();

    int created();
}
