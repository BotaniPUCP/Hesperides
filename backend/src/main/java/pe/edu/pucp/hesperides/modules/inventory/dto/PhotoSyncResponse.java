package pe.edu.pucp.hesperides.modules.inventory.dto;

import java.util.List;

/**
 * Resultado de un lote de descarga de fotos del catastro. {@code remaining}
 * incluye las que fallaron: siguen sin foto guardada y se reintentan.
 */
public record PhotoSyncResponse(int stored, List<Failure> failed, long remaining) {

    public record Failure(String code, String url, String reason) {
    }
}
