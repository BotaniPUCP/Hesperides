package pe.edu.pucp.hesperides.modules.admin.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.admin.dto.PasswordPolicyResponse;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.admin.entity.SystemParameter;
import pe.edu.pucp.hesperides.modules.admin.repository.SystemParametersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemParametersServiceTest {

    @Mock private SystemParametersRepository repository;
    @Mock private AuditService auditService;
    @Mock private SystemParameterReader systemParameterReader;
    @Mock private RestrictedParameters restrictedParameters;

    @InjectMocks private SystemParametersService service;

    private SystemParameter parameter(String code, String value, String valueType) {
        SystemParameter parameter = new SystemParameter();
        parameter.setCode(code);
        parameter.setLabel(code);
        parameter.setValue(value);
        parameter.setValueType(valueType);
        parameter.setEditable(true);
        return parameter;
    }

    // ---------- lectura ----------

    @Test
    void findAllMapsTheLiveRows() {
        when(repository.findAllLive()).thenReturn(
                List.of(parameter("CAMPUS_TOTAL_HECTARES", "41", "DECIMAL")));

        List<SystemParameterResponse> result = service.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("CAMPUS_TOTAL_HECTARES");
        assertThat(result.get(0).value()).isEqualTo("41");
        assertThat(result.get(0).isEditable()).isTrue();
    }

    @Test
    void findAllAppendsTheRestrictedParametersAfterTheEditableOnes() {
        SystemParameterResponse sender = new SystemParameterResponse(
                "SMTP_FROM", "Correo remitente", "soporte@pucp.edu.pe", "STRING", "desc", false);
        when(repository.findAllLive()).thenReturn(
                List.of(parameter("CAMPUS_TOTAL_HECTARES", "41", "DECIMAL")));
        when(restrictedParameters.all()).thenReturn(List.of(sender));

        List<SystemParameterResponse> result = service.findAll();

        assertThat(result).extracting(SystemParameterResponse::code)
                .containsExactly("CAMPUS_TOTAL_HECTARES", "SMTP_FROM");
    }

    @Test
    void getPasswordPolicyReturnsTheConfiguredMinimum() {
        when(systemParameterReader.readInt("PASSWORD_MIN_LENGTH", 12)).thenReturn(20);

        PasswordPolicyResponse result = service.getPasswordPolicy();

        assertThat(result.minLength()).isEqualTo(20);
    }

    @Test
    void getPasswordPolicyFallsBackToTheSeedWhenTheRowIsMissingOrMalformed() {
        // readInt resuelve la ausencia y los valores no numéricos con el
        // fallback: una fila borrada o mal escrita no debe tumbar el checklist.
        when(systemParameterReader.readInt("PASSWORD_MIN_LENGTH", 12)).thenReturn(12);

        PasswordPolicyResponse result = service.getPasswordPolicy();

        assertThat(result.minLength()).isEqualTo(12);
    }

    // ---------- validaciones ----------

    @Test
    void anEmptyMapIsRejected() {
        assertThatThrownBy(() -> service.update(Map.of()))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("No se recibieron");
    }

    @Test
    void anUnknownCodeIsRejected() {
        assertThatThrownBy(() -> service.update(Map.of("PARAMETRO_INVENTADO", "1")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void aNonEditableParameterIsRejected() {
        SystemParameter locked = parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER");
        locked.setEditable(false);
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(Optional.of(locked));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "12")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("no es editable");

        verify(auditService, never()).record(any(), any(), any(), any());
    }

    @Test
    void aRestrictedParameterIsRejectedWithoutTouchingTheTable() {
        // No vive en la tabla: sin este rechazo explícito respondería 404
        // "no existe", que contradice lo que la pantalla le acaba de mostrar.
        when(restrictedParameters.contains("SMTP_FROM")).thenReturn(true);

        assertThatThrownBy(() -> service.update(Map.of("SMTP_FROM", "otro@pucp.edu.pe")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("no es editable");

        verify(repository, never()).findByCode(any());
        verify(auditService, never()).record(any(), any(), any(), any());
    }

    @Test
    void aBlankValueIsRejected() {
        when(repository.findByCode("CAMPUS_TOTAL_HECTARES")).thenReturn(
                Optional.of(parameter("CAMPUS_TOTAL_HECTARES", "41", "DECIMAL")));

        assertThatThrownBy(() -> service.update(Map.of("CAMPUS_TOTAL_HECTARES", "  ")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("no puede estar vacío");
    }

    @Test
    void anIntegerParameterRejectsNonNumericValues() {
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "doce")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("número entero");
    }

    @Test
    void thePasswordMinimumCannotDropBelowTheFloor() {
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "4")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("entre 12 y 25");
    }

    @Test
    void thePasswordMinimumCannotExceedTheCeiling() {
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "12", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "80")))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void thePasswordMinimumCannotReachTheBcryptLimit() {
        // El caso que se colo al probar la pantalla: 72 pasaba la validacion por
        // ser el maximo tecnico de BCrypt, y dejaba una politica imposible de
        // cumplir -- minimo 72 y maximo 72 admiten una sola longitud.
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "12", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "72")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("entre 12 y 25");
    }

    @Test
    void theLoginAttemptsParameterIsBounded() {
        when(repository.findByCode("LOGIN_MAX_ATTEMPTS")).thenReturn(
                Optional.of(parameter("LOGIN_MAX_ATTEMPTS", "5", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("LOGIN_MAX_ATTEMPTS", "0")))
                .isInstanceOf(ValidationException.class);

        assertThatThrownBy(() -> service.update(Map.of("LOGIN_MAX_ATTEMPTS", "500")))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void negativeCampusHectaresAreRejected() {
        when(repository.findByCode("CAMPUS_TOTAL_HECTARES")).thenReturn(
                Optional.of(parameter("CAMPUS_TOTAL_HECTARES", "41", "DECIMAL")));

        assertThatThrownBy(() -> service.update(Map.of("CAMPUS_TOTAL_HECTARES", "-1")))
                .isInstanceOf(ValidationException.class);
    }

    // ---------- escritura ----------

    @Test
    void aValidUpdatePersistsAndAuditsEachChangeWithItsBeforeAndAfter() {
        SystemParameter passwordLength = parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER");
        SystemParameter loginAttempts = parameter("LOGIN_MAX_ATTEMPTS", "5", "INTEGER");

        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(Optional.of(passwordLength));
        when(repository.findByCode("LOGIN_MAX_ATTEMPTS")).thenReturn(Optional.of(loginAttempts));
        when(repository.save(passwordLength)).thenReturn(passwordLength);
        when(repository.save(loginAttempts)).thenReturn(loginAttempts);
        when(repository.findAllLive())
                .thenReturn(List.of(passwordLength, loginAttempts));

        List<SystemParameterResponse> result = service.update(Map.of(
                "PASSWORD_MIN_LENGTH", "12",
                "LOGIN_MAX_ATTEMPTS", "3"));

        assertThat(result).hasSize(2);
        assertThat(passwordLength.getValue()).isEqualTo("12");
        assertThat(loginAttempts.getValue()).isEqualTo("3");

        verify(auditService).record(eq(AuditActionCode.SYSTEM_PARAMETER_CHANGED),
                eq("SystemParameter"), any(),
                eq(Map.of("code", "PASSWORD_MIN_LENGTH",
                        "value", Map.of("before", "10", "after", "12"))));
        verify(auditService).record(eq(AuditActionCode.SYSTEM_PARAMETER_CHANGED),
                eq("SystemParameter"), any(),
                eq(Map.of("code", "LOGIN_MAX_ATTEMPTS",
                        "value", Map.of("before", "5", "after", "3"))));
    }

    @Test
    void anIntegerValueIsNormalizedToItsCanonicalForm() {
        SystemParameter passwordLength = parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER");
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(Optional.of(passwordLength));
        when(repository.save(passwordLength)).thenReturn(passwordLength);
        when(repository.findAllLive()).thenReturn(List.of(passwordLength));

        service.update(Map.of("PASSWORD_MIN_LENGTH", "014"));

        assertThat(passwordLength.getValue()).isEqualTo("14");
    }

    @Test
    void aPartialUpdateOnlyTouchesWhatArrived() {
        SystemParameter passwordLength = parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER");
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(Optional.of(passwordLength));
        when(repository.save(passwordLength)).thenReturn(passwordLength);
        when(repository.findAllLive()).thenReturn(List.of(passwordLength));

        service.update(Map.of("PASSWORD_MIN_LENGTH", "13"));

        assertThat(passwordLength.getValue()).isEqualTo("13");
        verify(auditService).record(eq(AuditActionCode.SYSTEM_PARAMETER_CHANGED),
                eq("SystemParameter"), any(), any());
    }

    @Test
    void aDecimalValueIsStoredInItsCanonicalForm() {
        SystemParameter hectares = parameter("CAMPUS_TOTAL_HECTARES", "41", "DECIMAL");
        when(repository.findByCode("CAMPUS_TOTAL_HECTARES")).thenReturn(Optional.of(hectares));
        when(repository.save(hectares)).thenReturn(hectares);
        when(repository.findAllLive()).thenReturn(List.of(hectares));

        service.update(Map.of("CAMPUS_TOTAL_HECTARES", "42.50"));

        // Los ceros a la derecha se descartan: "42.50" y "42.5" son el mismo dato
        // y guardar ambos haria que el historial de auditoria mostrara un cambio
        // donde no hubo ninguno.
        assertThat(hectares.getValue()).isEqualTo("42.5");
    }
}