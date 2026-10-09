package pe.edu.pucp.hesperides.modules.imports;

/** Una fila de una vista previa que se escribirá: la decisión de duplicado va por su línea. */
public interface PlannedLine {

    int line();

    boolean isPossibleDuplicate();
}
