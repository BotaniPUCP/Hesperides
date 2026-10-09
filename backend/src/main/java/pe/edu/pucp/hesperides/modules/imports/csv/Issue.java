package pe.edu.pucp.hesperides.modules.imports.csv;

/** Un problema de un archivo con su fila (1 = cabecera) y su columna. */
public record Issue(int line, String column, String message) {
}
