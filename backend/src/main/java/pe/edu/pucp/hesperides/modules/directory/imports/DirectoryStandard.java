package pe.edu.pucp.hesperides.modules.directory.imports;

import java.util.List;
import pe.edu.pucp.hesperides.modules.directory.imports.ImportDtos.DirectoryReport;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvRow;
import tools.jackson.core.type.TypeReference;

/**
 * Las reglas de un tipo de carga del Directorio: sus columnas, cómo revisa cada
 * fila y cómo la crea. El ciclo del lote es de {@link DirectoryImportHandler}.
 */
interface DirectoryStandard<T> {

    /** El {@code kind} de la URL y del lote: {@code organizations} o {@code contacts}. */
    String kind();

    List<String> columns();

    /** Columnas que el archivo puede traer pero no necesita; vacío si todas son obligatorias. */
    default List<String> optionalColumns() {
        return List.of();
    }

    /** Revisa sin escribir nada. */
    List<Planned<T>> plan(List<CsvRow> rows);

    /** Crea con las mismas reglas y auditoría que el alta individual, deja la marca del lote y devuelve el código. */
    String create(T request, long batchId);

    /** Para leer el informe guardado con el tipo de su pedido, que el genérico borra. */
    TypeReference<DirectoryReport<T>> reportType();
}
