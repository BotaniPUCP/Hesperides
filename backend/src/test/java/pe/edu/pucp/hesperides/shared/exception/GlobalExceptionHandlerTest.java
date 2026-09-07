package pe.edu.pucp.hesperides.shared.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void resourceNotFound_returns404WithErrorEnvelope() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleResourceNotFound(new ResourceNotFoundException("Catalog type not found"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Catalog type not found");
        assertThat(response.getBody().getData()).isNull();
    }

    @Test
    void businessRule_returns422WithErrorEnvelope() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleBusinessRule(new BusinessRuleException("Invalid state transition"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid state transition");
    }

    @Test
    void unexpectedException_returns500WithoutLeakingDetails() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleUnexpected(new IllegalStateException("connection pool exhausted at line 42"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Unexpected server error");
        assertThat(response.getBody().getMessage()).doesNotContain("connection pool");
    }

    @Test
    void duplicateResource_returns409WithErrorEnvelope() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleDuplicate(new DuplicateResourceException("Catalog type already exists"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Catalog type already exists");
        assertThat(response.getBody().getData()).isNull();
    }

    @Test
    void unauthorized_returns401WithErrorEnvelope() {
        ResponseEntity<ApiResponse<Void>> response =
                handler.handleUnauthorized(new UnauthorizedException("Invalid credentials"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Invalid credentials");
        assertThat(response.getBody().getData()).isNull();
    }

    @Test
    void validationFailure_returns400WithFieldErrorsInData() {
        FieldError fieldError = new FieldError("catalogTypeRequest", "name", "must not be blank");
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ApiResponse<Map<String, Object>>> response = handler.handleValidation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Validation failed");

        Map<String, Object> data = response.getBody().getData();
        assertThat(data).containsKey("errors");

        @SuppressWarnings("unchecked")
        List<Map<String, String>> errors = (List<Map<String, String>>) data.get("errors");
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0)).containsEntry("field", "name").containsEntry("message", "must not be blank");
    }

    @Test
    void noHandlerFound_returns404NotGeneric500() {
        NoHandlerFoundException ex =
                new NoHandlerFoundException("GET", "/api/v1/unknown", HttpHeaders.EMPTY);

        ResponseEntity<ApiResponse<Void>> response = handler.handleNoHandlerFound(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isOk()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo("Endpoint not found");
    }
}
