package pe.edu.pucp.hesperides.modules.imports.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.imports.csv.CsvWriter;
import pe.edu.pucp.hesperides.modules.imports.repository.SpeciesExportRepository;
import pe.edu.pucp.hesperides.modules.imports.species.SpeciesCsvSchema;

/**
 * Exporta el catálogo de especies botánicas en el mismo estándar CSV con que
 * se cargan: permite editar el catálogo en hoja de cálculo y volver a subirlo.
 */
@Service
@RequiredArgsConstructor
public class SpeciesExportService {

    private final SpeciesExportRepository repository;

    public byte[] export() {
        return CsvWriter.write(SpeciesCsvSchema.EXPORT_COLUMNS, repository.all());
    }
}
