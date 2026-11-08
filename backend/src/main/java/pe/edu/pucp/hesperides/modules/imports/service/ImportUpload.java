package pe.edu.pucp.hesperides.modules.imports.service;

import java.util.function.Supplier;

/**
 * Lo que se subió para una carga. El ZIP llega como proveedor: solo lo lee el
 * tipo de carga que trae fotos, y recién con el permiso de {@link ImportLock}.
 */
public record ImportUpload(byte[] csv, String fileName, Supplier<byte[]> zip) {

    public static ImportUpload csvOnly(byte[] csv, String fileName) {
        return new ImportUpload(csv, fileName, () -> null);
    }
}
