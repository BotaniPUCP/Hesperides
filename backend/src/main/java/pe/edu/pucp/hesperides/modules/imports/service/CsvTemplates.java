package pe.edu.pucp.hesperides.modules.imports.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;

/**
 * Las plantillas descargables de cada estándar. Son copia de las de
 * {@code docs/estandares/plantillas/}; un test vigila que no se separen.
 */
@Component
public class CsvTemplates {

    private static final Map<String, String> FILES = Map.of("specimens", "ejemplares.csv");

    public record Template(String fileName, byte[] content) {
    }

    public Template get(String kind) {
        String file = FILES.get(kind);
        if (file == null) {
            throw new ResourceNotFoundException("There is no CSV standard for: " + kind);
        }
        try {
            return new Template(file, new ClassPathResource("imports/templates/" + file).getContentAsByteArray());
        } catch (IOException e) {
            throw new UncheckedIOException("Template missing from the build: " + file, e);
        }
    }
}
