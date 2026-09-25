package pe.edu.pucp.hesperides.modules.admin.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.dto.PasswordPolicyResponse;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;
import pe.edu.pucp.hesperides.modules.admin.repository.SystemParametersRepository;
import pe.edu.pucp.hesperides.modules.users.service.PasswordPolicy;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Lee y actualiza parámetros generales (SPEC-001 Anexo A: solo ADMIN). La
 * escritura valida contra el {@code value_type} de cada fila —Bean Validation no
 * puede, porque el tipo vive en la base— y aplica los rangos de negocio que cada
 * parámetro conoce: la longitud mínima de contraseña se fija entre 12 y 25, y los
 * intentos de acceso entre 1 y 50.
 *
 * <p>El remitente de correo NO está aquí y no debe volver: solo es válido si el
 * proveedor lo tiene verificado, algo que esta aplicación no puede comprobar.
 * Vive en {@code SMTP_FROM}, con el resto de la configuración del proveedor.
 */
@Service
@RequiredArgsConstructor
public class SystemParametersService {

    /**
     * Rango que el administrador puede fijar como longitud mínima: 12 a 25.
     *
     * <p>El techo NO es el límite técnico. BCrypt trunca a 72 bytes, y dejar que
     * el mínimo llegara hasta ahí producía una política imposible de cumplir: con
     * mínimo 72 y máximo 72, la única contraseña válida tendría exactamente esa
     * longitud. Se vio en la práctica al probar la pantalla.
     *
     * <p>25 es una decisión de producto, no una constante derivada: por encima de
     * eso la política deja de ser exigente y empieza a ser inusable, y la gente
     * termina apuntando la contraseña en un papel.
     */
    private static final int PASSWORD_MIN_LENGTH_FLOOR = 12;
    private static final int PASSWORD_MIN_LENGTH_CEILING = 25;

    private static final int MAX_LOGIN_ATTEMPTS = 50;
    private static final BigDecimal MAX_CAMPUS_HECTARES = new BigDecimal("100000");

    /**
     * Fallback de la longitud mínima cuando la fila falta o está mal escrita.
     * Coincide con el piso configurable: quien borró la fila o la dejó con
     * un texto no numérico no debe derribar el checklist del frontend, pero sí
     * quedarse con la política con la que arrancó el sistema.
     */
    private static final int PASSWORD_MIN_LENGTH_DEFAULT = PASSWORD_MIN_LENGTH_FLOOR;


    private final SystemParametersRepository repository;
    private final AuditService auditService;
    private final SystemParameterReader systemParameterReader;

    @Transactional(readOnly = true)
    public List<SystemParameterResponse> findAll() {
        return repository.findAllLive().stream()
                .map(SystemParameterResponse::from)
                .toList();
    }

    /**
     * La pieza de la política visible en vivo: solo la longitud mínima se edita
     * ({@code PASSWORD_MIN_LENGTH}); los demás requisitos son reglas fijas de
     * SPEC-100 §9.1 que el frontend ya conoce. A diferencia de {@link
     * #findAll()}, este endpoint no es solo ADMIN: cualquier usuario autenticado
     * necesita la pista para cumplir la política, no para administrarla.
     */
    @Transactional(readOnly = true)
    public PasswordPolicyResponse getPasswordPolicy() {
        int minLength = systemParameterReader.readInt(
                SystemParameterCodes.PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_DEFAULT);
        // El máximo sale de PasswordPolicy, que es quien lo aplica al validar. Se
        // sirve en vez de dejar que el frontend lo repita: una constante copiada
        // en dos capas acaba desincronizándose sin que nadie lo note.
        return new PasswordPolicyResponse(minLength, PasswordPolicy.MAX_LENGTH);
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
                && (value < PASSWORD_MIN_LENGTH_FLOOR || value > PASSWORD_MIN_LENGTH_CEILING)) {
            throw new ValidationException(
                    "La longitud mínima de contraseña debe estar entre "
                            + PASSWORD_MIN_LENGTH_FLOOR + " y " + PASSWORD_MIN_LENGTH_CEILING);
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

    /**
     * Hoy ningún parámetro de texto tiene reglas propias, pero el tipo STRING
     * sigue soportado: el sitio donde añadirlas es este.
     *
     * <p>Aquí vivía la validación de {@code MAIL_FROM}, y se quitó junto al
     * parámetro. Era el caso que enseñó el límite de validar texto: el regex
     * aceptaba cualquier «algo@algo.algo», así que pasaban tanto un dominio
     * inexistente como un buzón que nadie lee. Un remitente solo vale si el
     * proveedor lo tiene verificado, y eso no se deduce de su forma.
     */
    private String validateString(String code, String raw) {
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