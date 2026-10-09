package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvWriter;
import pe.edu.pucp.hesperides.modules.imports.repository.SpecimenExportRepository;
import pe.edu.pucp.hesperides.modules.imports.specimens.SpecimenCsvSchema;

/**
 * Exporta los ejemplares en el mismo estándar con que se cargan (SPEC-103 D-10):
 * se corrige el archivo y se vuelve a cargar, y cada fila con código actualiza.
 */
@Service
@RequiredArgsConstructor
public class SpecimenExportService {

    private final SpecimenExportRepository repository;

    public byte[] export() {
        return CsvWriter.write(SpecimenCsvSchema.EXPORT_COLUMNS, repository.all());
    }
}
