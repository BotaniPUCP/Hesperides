package pe.edu.pucp.hesperides.modules.admin.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;
import pe.edu.pucp.hesperides.modules.admin.repository.SystemParametersRepository;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Lectura tipada de un parámetro por su {@code code}. Es el punto único por el
 * que la lógica de negocio de otros módulos consume estos valores: sin él, cada
 * servicio tendría su propia idea de cómo convertir la cadena, y un fallo de
 * conversión se ignoraría de forma distinta en cada sitio.
 *
 * La ausencia de la fila se resuelve con un fallback explícito del llamador: un
 * parámetro borrado lógicamente o inexistente no debe tumbar al resto del sistema.
 */
@Component
@RequiredArgsConstructor
public class SystemParameterReader {

    private final SystemParametersRepository repository;

    @Transactional(readOnly = true)
    public Optional<String> read(String code) {
        return repository.findByCode(code)
                .map(SystemParameter::getValue)
                .filter(value -> value != null && !value.isBlank());
    }

    @Transactional(readOnly = true)
    public Optional<Integer> readInt(String code) {
        return read(code).map(this::asInt);
    }

    @Transactional(readOnly = true)
    public Optional<BigDecimal> readDecimal(String code) {
        return read(code).map(this::asDecimal);
    }

    /** Fallback cómodo para el consumo operativo: nunca manda Optional al llamador. */
    public int readInt(String code, int fallback) {
        return readInt(code).orElse(fallback);
    }

    /** Fallback cómodo para el consumo operativo. */
    public String readString(String code, String fallback) {
        return read(code).orElse(fallback);
    }

    /**
     * Una fila mal escrita no debe ser un error: el admin que la digitó vería un
     * 400 en medio de un login, que es lo que menos ayuda a corregirla. Nulo es
     * el señal que hace caer al fallback.
     */
    private Integer asInt(String value) {
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal asDecimal(String value) {
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}