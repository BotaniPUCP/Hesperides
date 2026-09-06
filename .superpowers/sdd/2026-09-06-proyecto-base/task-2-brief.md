# Brief — Task 2

## Global Constraints (del plan, valores exactos)

- Monorepo: un solo repositorio, carpetas hermanas. Remoto `https://github.com/BotaniPUCP/Hesperides.git`.
- Paquete Java base: `pe.edu.pucp.hesperides`. Nunca `pe.edu.pucp.proyecto`.
- Java 17 como target de compilación (el entorno local tiene JDK 21; compilar a 17).
- Maven Wrapper (`mvnw`) obligatorio: `mvn` no está instalado en el entorno.
- Nombre de BD: `hesperides`. Contenedores: `hesperides-db`, `hesperides-backend`, `hesperides-frontend`, `hesperides-data-service`.
- Puertos: backend 8080, frontend 3000, Flask 5001, PostgreSQL 5432.
- Sobre de respuesta único en TODA respuesta del backend: `{ "ok": boolean, "message": string, "data": T | null }`. El código HTTP acompaña al sobre; nunca 200 en error.
- Idioma: código e identificadores en **inglés**; specs, commits y documentación en **español**.
- Commits: Conventional Commits con alcance, en español. Ej.: `feat(backend): agrega sobre de respuesta ApiResponse`.
- Cero credenciales en el código. Toda configuración por variables de entorno con la forma `${ENV_VAR:default}`.
- Soft delete: `deleted_at TIMESTAMP NULL`. Nunca DELETE físico.
- Catálogos configurables (`catalog_types` / `catalog_items`), nunca enums Java ni constantes TypeScript para roles, estados, prioridades o categorías.
- Flyway: fundacionales `V001`-`V099`. Este plan solo crea `V001__create_catalog_tables.sql`. La tabla `users` pertenece a SPEC-001; NO crearla aquí.
- Sin `System.out.println` ni `console.log` de depuración. SLF4J con `@Slf4j` en backend.
- Ramas: `main` y `develop`. No hacer push hasta la tarea final.

---

### Task 2: Backend Spring Boot con sobre de respuesta y manejo de errores

**Files:**
- Create: `backend/pom.xml`, `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/HesperidesApplication.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/ApiResponse.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/ResourceNotFoundException.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/DuplicateResourceException.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/BusinessRuleException.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/UnauthorizedException.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/config/HealthController.java`
- Create: `backend/src/main/resources/application.yml`, `application-dev.yml`, `application-prod.yml`
- Create: `backend/src/main/resources/db/migration/V001__create_catalog_tables.sql`
- Create: `backend/Dockerfile`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/config/HealthControllerTest.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/shared/exception/GlobalExceptionHandlerTest.java`

**Interfaces:**
- Consumes: la estructura de carpetas de Task 1.
- Produces:
  - `ApiResponse<T>` con factorías estáticas `ApiResponse.ok(String message, T data)`, `ApiResponse.error(String message)` y `ApiResponse.errorWithData(String message, T data)`; getters `isOk()`, `getMessage()`, `getData()`. Serializa como `{"ok":bool,"message":str,"data":obj|null}`.
  - `GET /api/v1/health` → 200 con `{"ok":true,"message":"Service is healthy","data":{"status":"UP"}}`.
  - Las cuatro excepciones custom, cada una con constructor `(String message)`.
  - Tablas `catalog_types` y `catalog_items`.

- [ ] **Step 1: Crear `pom.xml` y el Maven Wrapper**

Parent `spring-boot-starter-parent` 3.3.5. `<java.version>17</java.version>`, `groupId` `pe.edu.pucp`, `artifactId` `hesperides-backend`. Dependencias: `spring-boot-starter-web`, `spring-boot-starter-validation`, `spring-boot-starter-data-jpa`, `flyway-core`, `flyway-database-postgresql`, `postgresql` (runtime), `lombok` (optional), `spring-boot-starter-test` (test), `h2` (test). Plugins: `spring-boot-maven-plugin` y `jacoco-maven-plugin` 0.8.12 con ejecuciones `prepare-agent` y `report` ligada a `verify`.

El wrapper (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`) se genera con `mvn wrapper:wrapper` si hay Maven disponible; si no, escribir `maven-wrapper.properties` apuntando a Maven 3.9.9 y al `maven-wrapper.jar` de la distribución oficial — el script se descarga el jar en su primera ejecución.

- [ ] **Step 2: Escribir el test del handler de errores (FALLA)**

`backend/src/test/java/pe/edu/pucp/hesperides/shared/exception/GlobalExceptionHandlerTest.java`:

```java
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
```

- [ ] **Step 3: Escribir el test del health endpoint (FALLA)**

`backend/src/test/java/pe/edu/pucp/hesperides/config/HealthControllerTest.java`:

```java
package pe.edu.pucp.hesperides.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HealthController.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void health_returns200WithSuccessEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.message").value("Service is healthy"))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }
}
```

- [ ] **Step 4: Correr los tests y verificar que fallan**

Run: `cd backend && ./mvnw -q test`
Expected: FAIL — error de compilación: no existen `ApiResponse`, `GlobalExceptionHandler` ni `HealthController`.

- [ ] **Step 5: Implementar `ApiResponse<T>`**

```java
package pe.edu.pucp.hesperides.shared.exception;

/**
 * Standard response envelope for every endpoint, successful or failed.
 * The HTTP status code always accompanies this envelope: never return 200 on error.
 */
public class ApiResponse<T> {

    private final boolean ok;
    private final String message;
    private final T data;

    private ApiResponse(boolean ok, String message, T data) {
        this.ok = ok;
        this.message = message;
        this.data = data;
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null);
    }

    /** Error envelope that still carries a payload, such as field validation errors. */
    public static <T> ApiResponse<T> errorWithData(String message, T data) {
        return new ApiResponse<>(false, message, data);
    }

    public boolean isOk() {
        return ok;
    }

    public String getMessage() {
        return message;
    }

    public T getData() {
        return data;
    }
}
```

**Nota sobre la serialización:** Jackson serializa el getter `isOk()` como la propiedad `ok`, que es exactamente lo que exige el contrato. No hace falta anotación.

- [ ] **Step 6: Implementar las cuatro excepciones custom**

Cada una extiende `RuntimeException` con un constructor `(String message)` que delega en `super(message)`:

```java
package pe.edu.pucp.hesperides.shared.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

Repetir idéntico, cambiando solo el nombre de la clase, para `DuplicateResourceException`, `BusinessRuleException` y `UnauthorizedException`.

- [ ] **Step 7: Implementar `GlobalExceptionHandler`**

```java
package pe.edu.pucp.hesperides.shared.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.Map;

/**
 * Single exit point for every exception. Keeps the response envelope uniform
 * and prevents stack traces from reaching clients.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicate(DuplicateResourceException ex) {
        log.warn("Duplicate resource: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessRule(BusinessRuleException ex) {
        log.warn("Business rule violated: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnauthorized(UnauthorizedException ex) {
        log.warn("Unauthorized access: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleValidation(MethodArgumentNotValidException ex) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()))
                .toList();
        log.warn("Validation failed with {} field error(s)", errors.size());
        return ResponseEntity.badRequest()
                .body(ApiResponse.errorWithData("Validation failed", Map.of("errors", errors)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Unexpected server error"));
    }
}
```

- [ ] **Step 8: Implementar `HealthController` y `HesperidesApplication`**

```java
package pe.edu.pucp.hesperides.config;

import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Liveness probe. Also the reference example of the response envelope. */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {
        return ResponseEntity.ok(ApiResponse.ok("Service is healthy", Map.of("status", "UP")));
    }
}
```

```java
package pe.edu.pucp.hesperides;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HesperidesApplication {

    public static void main(String[] args) {
        SpringApplication.run(HesperidesApplication.class, args);
    }
}
```

- [ ] **Step 9: Escribir la configuración YAML**

`application.yml` — ninguna credencial literal, todo por variables de entorno:

```yaml
spring:
  application:
    name: hesperides-backend
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${POSTGRES_DB:hesperides}
    username: ${POSTGRES_USER:hesperides}
    password: ${POSTGRES_PASSWORD:}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
server:
  port: ${BACKEND_PORT:8080}
```

`application-dev.yml`: `spring.jpa.show-sql: true` y `logging.level.pe.edu.pucp.hesperides: DEBUG`.
`application-prod.yml`: `spring.jpa.show-sql: false` y `logging.level.root: INFO`.

`ddl-auto: validate` es deliberado: Flyway es el único dueño del esquema, y Hibernate solo comprueba que las entidades concuerden.

- [ ] **Step 10: Escribir la migración `V001__create_catalog_tables.sql`**

```sql
CREATE TABLE catalog_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_type_id BIGINT NOT NULL REFERENCES catalog_types(id),
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (catalog_type_id, code)
);

CREATE INDEX idx_catalog_types_code ON catalog_types(code);
CREATE INDEX idx_catalog_items_catalog_type_id ON catalog_items(catalog_type_id);

INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ROLE', 'Roles del sistema', 'Roles asignables a los usuarios', TRUE);

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'ADMIN', 'Administrador', 1),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'USER', 'Usuario', 2);
```

**Nota:** se añade `deleted_at` a ambas tablas por coherencia con la convención de soft delete de la sección 5.4 del SPEC-000, aunque el fragmento de la sección 7 no lo muestre.

- [ ] **Step 11: Correr los tests y verificar que pasan**

Run: `cd backend && ./mvnw -q test`
Expected: PASS — 4 tests, 0 fallos.

- [ ] **Step 12: Escribir `backend/Dockerfile`**

Multi-stage. Etapa de build: `maven:3.9-eclipse-temurin-17`, copiar `pom.xml`, `mvn dependency:go-offline`, copiar `src/`, `mvn -B package -DskipTests`. Etapa de runtime: `eclipse-temurin:17-jre-alpine`, usuario no root, copiar el jar, `EXPOSE 8080`, `ENTRYPOINT ["java","-jar","/app/app.jar"]`.

- [ ] **Step 13: Commit**

```bash
git add backend/
git commit -m "feat(backend): agrega Spring Boot con sobre de respuesta, manejo de errores y migracion de catalogos"
```

