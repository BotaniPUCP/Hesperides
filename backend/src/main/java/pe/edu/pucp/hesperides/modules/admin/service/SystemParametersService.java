package pe.edu.pucp.hesperides.modules.admin.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;
import pe.edu.pucp.hesperides.modules.admin.repository.SystemParametersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Lee y actualiza parámetros generales (SPEC-001 Anexo A: solo ADMIN). La
 * escritura valida contra el {@code value_type} de cada fila —Bean Validation no
 * puede, porque el tipo vive en la base— y aplica los rangos de negocio que cada
 * parámetro conoce (la clave no puede bajar de 8 porque es un límite de
 * seguridad; tampoco superar los 72 bytes que BCrypt trunca).
 */
@Service
@RequiredArgsConstructor
public class SystemParametersService {

    /**
     * BCrypt trunca en silencio a 72 bytes (PasswordPolicy.MAX_LENGTH): permitir
     * una longitud mínima mayor al máximo real produciría una política imposible.
     */
    private static final int PASSWORD_MIN_LENGTH_FLOOR = 8;
    private static final int PASSWORD_MAX_LENGTH = 72;
    private static final int MAX_LOGIN_ATTEMPTS = 50;
    private static final BigDecimal MAX_CAMPUS_HECTARES = new BigDecimal("100000");
    private static final int MAX_MAIL_FROM_LENGTH = 255;

    private static final Pattern MAIL_FROM =
            Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final SystemParametersRepository repository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<SystemParameterResponse> findAll() {
        return repository.findAllLive().stream()
                .map(SystemParameterResponse::from)
                .toList();
    }

    /**
     * Actualización parcial: solo se tocan las claves presentes. Devuelve la
     * lista completa (como GET) para que el frontend refresque sin una segunda
     * llamada. Cada cambio se audita por separado con su antes/después (SPEC-004).
     */
    @Transactional
    public List<SystemParameterResponse> update(Map<String, String> values) {
        if (values == null || values.isEmpty()) {
            throw new ValidationException("No se recibieron parámetros para actualizar");
        }

        for (Map.Entry<String, String> entry : values.entrySet()) {
            SystemParameter parameter = require(entry.getKey());

            if (!parameter.isEditable()) {
                throw new ValidationException(
                        "El parámetro " + entry.getKey() + " no es editable");
            }

            String before = parameter.getValue();
            String after = validateAndNormalize(parameter, entry.getValue());

            parameter.setValue(after);
            repository.save(parameter);

            auditService.record(AuditActionCode.SYSTEM_PARAMETER_CHANGED, "SystemParameter",
                    parameter.getId(), Map.of(
                            "code", parameter.getCode(),
                            "value", Map.of("before", before, "after", after)));
        }

        return findAll();
    }

    /**
     * Transforma y valida el valor crudo del cliente contra el tipo y los límites
     * del parámetro. Devuelve la forma canónica a persistir ("010" pasa a "10").
     */
    private String validateAndNormalize(SystemParameter parameter, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new ValidationException(
                    "El valor del parámetro " + parameter.getCode() + " no puede estar vacío");
        }
        String trimmed = rawValue.trim();

        return switch (parameter.getValueType().toUpperCase()) {
            case "INTEGER" -> validateInteger(parameter.getCode(), trimmed);
            case "DECIMAL" -> validateDecimal(parameter.getCode(), trimmed);
            case "STRING" -> validateString(parameter.getCode(), trimmed);
            default -> throw new ValidationException(
                    "El parámetro " + parameter.getCode()
                            + " tiene un tipo de valor no soportado: " + parameter.getValueType());
        };
    }

    private String validateInteger(String code, String raw) {
        Integer value = parseInt(code, raw);
        if (value == null) {
            throw new ValidationException(
                    "El parámetro " + code + " debe ser un número entero");
        }

        if (code.equals(SystemParameterCodes.PASSWORD_MIN_LENGTH)
                && (value < PASSWORD_MIN_LENGTH_FLOOR || value > PASSWORD_MAX_LENGTH)) {
            throw new ValidationException(
                    "La longitud mínima de contraseña debe estar entre "
                            + PASSWORD_MIN_LENGTH_FLOOR + " y " + PASSWORD_MAX_LENGTH);
        }
        if (code.equals(SystemParameterCodes.LOGIN_MAX_ATTEMPTS)
                && (value < 1 || value > MAX_LOGIN_ATTEMPTS)) {
            throw new ValidationException(
                    "El número de intentos de acceso debe estar entre 1 y " + MAX_LOGIN_ATTEMPTS);
        }

        return value.toString();
    }

    private String validateDecimal(String code, String raw) {
        BigDecimal value = parseDecimal(code, raw);
        if (value == null) {
            throw new ValidationException(
                    "El parámetro " + code + " debe ser un número decimal válido");
        }
        if (code.equals(SystemParameterCodes.CAMPUS_TOTAL_HECTARES)
                && (value.signum() < 0 || value.compareTo(MAX_CAMPUS_HECTARES) > 0)) {
            throw new ValidationException(
                    "Las hectáreas del campus deben estar entre 0 y " + MAX_CAMPUS_HECTARES);
        }
        return value.stripTrailingZeros().toPlainString();
    }

    private String validateString(String code, String raw) {
        if (code.equals(SystemParameterCodes.MAIL_FROM)) {
            if (raw.length() > MAX_MAIL_FROM_LENGTH || !MAIL_FROM.matcher(raw).matches()) {
                throw new ValidationException(
                        "El correo remitente debe ser una dirección de correo válida");
            }
        }
        return raw;
    }

    private Integer parseInt(String code, String raw) {
        try {
            return Integer.valueOf(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private BigDecimal parseDecimal(String code, String raw) {
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private SystemParameter require(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe el parámetro de sistema " + code));
    }
}