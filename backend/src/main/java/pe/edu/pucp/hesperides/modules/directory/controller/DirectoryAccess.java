package pe.edu.pucp.hesperides.modules.directory.controller;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Quién usa el Directorio (SPEC-106 §9.1) y los límites de página comunes a sus listas. */
final class DirectoryAccess {

    /** El capataz solo ve y busca: ejecuta, no mantiene los registros básicos. */
    static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    static final String MAINTAINERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private static final int MAX_PAGE_SIZE = 50;

    private DirectoryAccess() {
    }

    static void checkPage(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new ValidationException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
    }
}
