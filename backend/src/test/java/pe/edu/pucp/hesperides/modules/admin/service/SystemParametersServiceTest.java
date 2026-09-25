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
        when(repository.findAllLive()).thenReturn(List.of(parameter("MAIL_FROM", "a@b.pe", "STRING")));

        List<SystemParameterResponse> result = service.findAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).code()).isEqualTo("MAIL_FROM");
        assertThat(result.get(0).value()).isEqualTo("a@b.pe");
        assertThat(result.get(0).isEditable()).isTrue();
    }

    @Test
    void getPasswordPolicyReturnsTheConfiguredMinimum() {
        when(systemParameterReader.readInt("PASSWORD_MIN_LENGTH", 10)).thenReturn(12);

        PasswordPolicyResponse result = service.getPasswordPolicy();

        assertThat(result.minLength()).isEqualTo(12);
    }

    @Test
    void getPasswordPolicyFallsBackToTheSeedWhenTheRowIsMissingOrMalformed() {
        // readInt resuelve la ausencia y los valores no numéricos con el
        // fallback: una fila borrada o mal escrita no debe tumbar el checklist.
        when(systemParameterReader.readInt("PASSWORD_MIN_LENGTH", 10)).thenReturn(10);

        PasswordPolicyResponse result = service.getPasswordPolicy();

        assertThat(result.minLength()).isEqualTo(10);
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
    void aBlankValueIsRejected() {
        when(repository.findByCode("MAIL_FROM")).thenReturn(
                Optional.of(parameter("MAIL_FROM", "a@b.pe", "STRING")));

        assertThatThrownBy(() -> service.update(Map.of("MAIL_FROM", "  ")))
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
    void thePasswordMinimumCannotDropBelowEight() {
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "4")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("entre 8 y 72");
    }

    @Test
    void thePasswordMinimumCannotExceedTheBcryptLimit() {
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(
                Optional.of(parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER")));

        assertThatThrownBy(() -> service.update(Map.of("PASSWORD_MIN_LENGTH", "80")))
                .isInstanceOf(ValidationException.class);
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
    void aMalformedSenderEmailIsRejected() {
        when(repository.findByCode("MAIL_FROM")).thenReturn(
                Optional.of(parameter("MAIL_FROM", "a@b.pe", "STRING")));

        assertThatThrownBy(() -> service.update(Map.of("MAIL_FROM", "no-es-un-correo")))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("dirección de correo válida");
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

        service.update(Map.of("PASSWORD_MIN_LENGTH", "010"));

        assertThat(passwordLength.getValue()).isEqualTo("10");
    }

    @Test
    void aPartialUpdateOnlyTouchesWhatArrived() {
        SystemParameter passwordLength = parameter("PASSWORD_MIN_LENGTH", "10", "INTEGER");
        when(repository.findByCode("PASSWORD_MIN_LENGTH")).thenReturn(Optional.of(passwordLength));
        when(repository.save(passwordLength)).thenReturn(passwordLength);
        when(repository.findAllLive()).thenReturn(List.of(passwordLength));

        service.update(Map.of("PASSWORD_MIN_LENGTH", "11"));

        assertThat(passwordLength.getValue()).isEqualTo("11");
        verify(auditService).record(eq(AuditActionCode.SYSTEM_PARAMETER_CHANGED),
                eq("SystemParameter"), any(), any());
    }

    @Test
    void theSenderEmailSurvivesAsIs() {
        SystemParameter mailFrom = parameter("MAIL_FROM", "a@b.pe", "STRING");
        when(repository.findByCode("MAIL_FROM")).thenReturn(Optional.of(mailFrom));
        when(repository.save(mailFrom)).thenReturn(mailFrom);
        when(repository.findAllLive()).thenReturn(List.of(mailFrom));

        service.update(Map.of("MAIL_FROM", "nuevo@hesperides.pucp.edu.pe"));

        assertThat(mailFrom.getValue()).isEqualTo("nuevo@hesperides.pucp.edu.pe");
    }
}