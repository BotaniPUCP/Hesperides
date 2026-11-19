package pe.edu.pucp.hesperides.modules.directory.controller;

/** Quién usa el Directorio (SPEC-106 §9.1). */
final class DirectoryAccess {

    /** El capataz solo ve y busca: ejecuta, no mantiene los registros básicos. */
    static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    static final String MAINTAINERS = "hasAnyAuthority('ADMIN', 'COORDINADOR')";

    private DirectoryAccess() {
    }
}
