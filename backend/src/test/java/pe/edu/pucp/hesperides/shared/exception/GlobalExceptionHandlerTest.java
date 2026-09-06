package pe.edu.pucp.hesperides.shared.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

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
}
