package pe.edu.pucp.hesperides.modules.imports.dto;

import java.time.LocalDateTime;

/**
 * La parte común de toda vista previa de carga: el lote que se confirmará,
 * cuánto trae y si se puede confirmar. Cada tipo agrega lo suyo (especies,
 * fotos, organizaciones…) en su propio registro, que es lo que se serializa.
 */
public interface ImportPreview {

    long batchId();

    String kind();

    int totalRows();

    int toCreate();

    boolean canConfirm();

    LocalDateTime expiresAt();
}
