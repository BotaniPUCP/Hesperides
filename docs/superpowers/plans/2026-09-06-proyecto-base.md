# Proyecto base Hesperides — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el monorepo Hesperides listo para desarrollar features: un comando levanta los cuatro servicios, tres comandos corren los tests, y el CI valida cada PR.

**Architecture:** Monorepo con `backend/` (Spring Boot 3, Java 17, Maven), `frontend/` (Next.js 14 App Router, TypeScript, Tailwind), `services/` (Flask 3), `shared/types/` (TypeScript compartido web + móvil), `mobile/` (placeholder fase 2) y `specs/`. Orquestación con Docker Compose. Cada servicio incluye el mínimo código que demuestra las convenciones y pasa un test; nada de lógica de negocio.

**Tech Stack:** Java 17 + Spring Boot 3.3 + Maven Wrapper + Flyway + PostgreSQL 16 + JUnit 5 + JaCoCo · Next.js 14 + TypeScript 5 + Tailwind 3 + Jest + React Testing Library · Python 3.11 + Flask 3 + pytest · Docker Compose · GitHub Actions

**Spec:** `docs/superpowers/specs/2026-09-06-proyecto-base-design.md`

## Global Constraints

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

### Task 1: Estructura del monorepo, git y documentación de specs

**Files:**
- Create: `.gitignore`, `.env.example`, `README.md`
- Create: `specs/_plantilla.md`, `specs/REGISTRO.md`
- Create: `specs/features/.gitkeep`, `specs/compartidos/.gitkeep`
- Create: `mobile/README.md`
- Move: `SPEC-000-arquitectura-general.md` → `specs/fundacionales/SPEC-000-arquitectura-general.md`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: repositorio git inicializado con rama `main`, remoto `origin` configurado, y el árbol de carpetas donde las tareas siguientes escriben.

- [ ] **Step 1: Inicializar git y crear el árbol de carpetas**

```bash
git init -b main
git remote add origin https://github.com/BotaniPUCP/Hesperides.git
mkdir -p specs/fundacionales specs/features specs/compartidos
mkdir -p .github/workflows shared/types mobile
touch specs/features/.gitkeep specs/compartidos/.gitkeep
mv SPEC-000-arquitectura-general.md specs/fundacionales/
```

- [ ] **Step 2: Escribir `.gitignore`**

```gitignore
# Entorno
.env
.env.local
.env.*.local

# Java / Maven
backend/target/
*.class
*.jar
!backend/.mvn/wrapper/maven-wrapper.jar

# Node
node_modules/
.next/
out/
coverage/
*.tsbuildinfo

# Python
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/

# IDE
.idea/
.vscode/*
!.vscode/extensions.json
*.iml

# SO
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Escribir `.env.example`**

Sin credenciales reales, solo placeholders. El equipo copia a `.env`.

```bash
# PostgreSQL
POSTGRES_DB=hesperides
POSTGRES_USER=hesperides
POSTGRES_PASSWORD=cambiar_en_local
POSTGRES_PORT=5432

# Backend (Spring Boot)
BACKEND_PORT=8080
SPRING_PROFILES_ACTIVE=dev
DB_HOST=db
DB_PORT=5432

# Frontend (Next.js)
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1

# Data service (Flask)
DATA_SERVICE_PORT=5001
DATA_SERVICE_URL=http://data-service:5001
```

- [ ] **Step 4: Extraer la plantilla de spec**

Copiar a `specs/_plantilla.md` el contenido del bloque de la sección 6 del SPEC-000 (lo que va entre la apertura ```` ```markdown ```` y su cierre), reemplazando `pe.edu.pucp.proyecto` por `pe.edu.pucp.hesperides`.

- [ ] **Step 5: Crear `specs/REGISTRO.md`**

```markdown
# Registro de specs

| Spec ID  | Nombre                    | Estado         | Asignado a | Sprint | Fecha cierre |
|----------|---------------------------|----------------|------------|--------|--------------|
| SPEC-000 | Arquitectura general      | ✅ Completado  | —          | S0     | 2026-09-06   |
| SPEC-001 | Autenticación             | ⏳ Pendiente   | —          | S0     |              |
| SPEC-002 | Modelo de datos           | ⏳ Pendiente   | —          | S0     |              |
| SPEC-003 | Catálogos configurables   | ⏳ Pendiente   | —          | S0     |              |
| SPEC-C01 | Componentes UI            | ⏳ Pendiente   | —          | S0     |              |
| SPEC-C02 | Manejo de errores         | ⏳ Pendiente   | —          | S0     |              |
| SPEC-C03 | Patrones de API           | ⏳ Pendiente   | —          | S0     |              |

**Leyenda:** ⏳ Pendiente · 📝 En spec · 👀 En revisión · 🔄 En progreso · ✅ Completado
```

- [ ] **Step 6: Crear `mobile/README.md`**

```markdown
# Móvil (React Native) — Fase 2

La aplicación móvil se desarrolla **después** de que el web esté funcionando.

Cuando arranque, esta carpeta seguirá la estructura de la sección 4 del
SPEC-000 (`navigation/`, `screens/`, `components/`, `hooks/`, `lib/`, `stores/`)
y consumirá los tipos de `shared/types/`, la misma API REST que el web y los
mismos contratos definidos en SPEC-C02 y SPEC-C03.

Requiere su propio spec antes de escribir código.
```

- [ ] **Step 7: Escribir `README.md` raíz**

Debe contener: descripción del proyecto, requisitos (Docker, JDK 17+, Node 20+, Python 3.11+), cómo levantar (`cp .env.example .env` y `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`), tabla de servicios y puertos, cómo correr los tests de cada stack, el flujo SDD resumido (spec → revisión → código → verificación → PR), convención de ramas y commits, y una nota de que el despliegue AWS está pendiente de licencias.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: inicializa monorepo con estructura de specs y configuracion base"
```

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

---

### Task 3: Tipos compartidos y frontend Next.js

**Files:**
- Create: `shared/types/api.ts`, `shared/types/models.ts`, `shared/types/catalog.ts`, `shared/types/index.ts`
- Create: `frontend/package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `jest.config.js`, `jest.setup.js`, `.eslintrc.json`, `Dockerfile`
- Create: `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/styles/globals.css`
- Create: `frontend/src/lib/api.ts`, `frontend/src/lib/constants.ts`
- Test: `frontend/src/app/__tests__/page.test.tsx`, `frontend/src/lib/__tests__/api.test.ts`

**Interfaces:**
- Consumes: el sobre `{ok, message, data}` que produce Task 2.
- Produces:
  - `ApiResponse<T> = { ok: boolean; message: string; data: T | null }`
  - `Page<T> = { content: T[]; page: { number: number; size: number; totalElements: number; totalPages: number } }`
  - `CatalogItem = { id: number; code: string; label: string; sortOrder: number; isActive: boolean; metadata?: Record<string, unknown> }`
  - `apiClient` con métodos `get<T>(path)`, `post<T>(path, body)`, `put<T>(path, body)`, `del<T>(path)`, cada uno devolviendo `Promise<T>` y lanzando `ApiError` en fallo.
  - `ApiError` con propiedades `status: number`, `message: string`, `data: unknown`.

- [ ] **Step 1: Escribir los tipos compartidos**

`shared/types/api.ts`:

```typescript
/** Standard response envelope returned by every backend endpoint. */
export interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T | null;
}

/** Paginated payload. Always travels inside ApiResponse.data. */
export interface Page<T> {
  content: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

/** Shape of ApiResponse.data on a 400 validation failure. */
export interface ValidationErrors {
  errors: FieldError[];
}
```

`shared/types/catalog.ts`:

```typescript
export interface CatalogType {
  id: number;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
}

export interface CatalogItem {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}
```

`shared/types/models.ts`:

```typescript
/**
 * Audit fields present on every table (SPEC-000, section 5.4).
 * Domain entities are defined by SPEC-002 and extend this.
 */
export interface AuditFields {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

`shared/types/index.ts` reexporta los tres módulos.

- [ ] **Step 2: Escribir el test del cliente HTTP (FALLA)**

`frontend/src/lib/__tests__/api.test.ts`:

```typescript
import { apiClient, ApiError } from '../api';

describe('apiClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unwraps data from the response envelope', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, message: 'Service is healthy', data: { status: 'UP' } }),
    }) as unknown as typeof fetch;

    const result = await apiClient.get<{ status: string }>('/health');

    expect(result).toEqual({ status: 'UP' });
  });

  it('throws ApiError carrying status and message on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ ok: false, message: 'Catalog type not found', data: null }),
    }) as unknown as typeof fetch;

    await expect(apiClient.get('/catalogs/NOPE')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Catalog type not found',
    });
  });

  it('throws ApiError with status 0 when the network is unreachable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;

    await expect(apiClient.get('/health')).rejects.toBeInstanceOf(ApiError);
  });
});
```

- [ ] **Step 3: Escribir el test de la home (FALLA)**

`frontend/src/app/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home', () => {
  it('renders the project name', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { name: /hesperides/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Correr los tests y verificar que fallan**

Run: `cd frontend && npm install && npm test`
Expected: FAIL — no se resuelven los módulos `../api` ni `../page`.

- [ ] **Step 5: Implementar `frontend/src/lib/constants.ts` y `api.ts`**

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
```

```typescript
import type { ApiResponse } from '@shared/types';
import { API_BASE_URL } from './constants';

/** Error carrying the HTTP status so callers can react per SPEC-C02. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * The only place in the web app that calls fetch. Components must never
 * call it directly.
 *
 * Session refresh (SPEC-001) plugs in where the 401 branch is marked: that
 * branch should attempt POST /auth/refresh and replay the original request,
 * queueing concurrent requests behind the first refresh so only one runs.
 */
async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sin conexión. Verifique su red.');
  }

  const envelope = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !envelope.ok) {
    // SPEC-001 extension point: on 401, refresh the session and replay.
    throw new ApiError(response.status, envelope.message ?? 'Unexpected error', envelope.data);
  }

  return envelope.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
```

- [ ] **Step 6: Implementar layout, home y estilos**

`layout.tsx` con `<html lang="es">`, metadata `title: 'Hesperides'`, e import de `../styles/globals.css`. `page.tsx` con un `<h1>Hesperides</h1>` y una nota breve de que el proyecto base está operativo, con clases Tailwind. `globals.css` con las tres directivas `@tailwind base/components/utilities`.

- [ ] **Step 7: Escribir las configuraciones del frontend**

`package.json`: Next 14, React 18, TypeScript 5, Tailwind 3, Jest 29, `@testing-library/react`, `@testing-library/jest-dom`, `jest-environment-jsdom`, `eslint-config-next`. Scripts: `dev`, `build`, `start`, `lint`, `test`, `test:coverage`.

`tsconfig.json`: `strict: true`, paths `@/*` → `./src/*` y `@shared/*` → `../shared/*`.

`jest.config.js`: usa `next/jest`, `testEnvironment: 'jest-environment-jsdom'`, `setupFilesAfterEach: ['<rootDir>/jest.setup.js']` con `import '@testing-library/jest-dom'`, y `moduleNameMapper` replicando los mismos paths del tsconfig.

`tailwind.config.ts`: `content` apuntando a `./src/**/*.{ts,tsx}`.

- [ ] **Step 8: Correr los tests y verificar que pasan**

Run: `cd frontend && npm test`
Expected: PASS — 4 tests, 0 fallos.

- [ ] **Step 9: Escribir `frontend/Dockerfile`**

Multi-stage `node:20-alpine`: etapa `deps` con `npm ci`, etapa `builder` con `npm run build`, etapa `runner` con usuario no root y `EXPOSE 3000`.

- [ ] **Step 10: Commit**

```bash
git add shared/ frontend/
git commit -m "feat(frontend): agrega Next.js con cliente HTTP tipado y tipos compartidos"
```

---

### Task 4: Microservicio Flask

**Files:**
- Create: `services/requirements.txt`, `services/Dockerfile`, `services/pytest.ini`
- Create: `services/app/__init__.py`, `services/app/main.py`
- Create: `services/app/routes/__init__.py`, `services/app/routes/health.py`
- Create: `services/app/processors/__init__.py`
- Test: `services/app/tests/__init__.py`, `services/app/tests/test_health.py`

**Interfaces:**
- Consumes: nada de tareas previas.
- Produces: `create_app() -> Flask` como factoría, y `GET /health` → 200 con `{"ok": true, "message": "Data service is healthy", "data": {"status": "UP"}}` — el mismo sobre que el backend Java, para que el contrato sea uniforme entre servicios.

- [ ] **Step 1: Escribir el test (FALLA)**

`services/app/tests/test_health.py`:

```python
from app.main import create_app


def test_health_returns_success_envelope():
    client = create_app().test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json == {
        "ok": True,
        "message": "Data service is healthy",
        "data": {"status": "UP"},
    }
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd services && python -m pytest -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 3: Escribir `requirements.txt` y `pytest.ini`**

```
Flask==3.0.3
pytest==8.3.3
```

`pytest.ini` con `[pytest]` y `testpaths = app/tests` para que `app` sea importable desde la raíz de `services/`.

- [ ] **Step 4: Implementar el blueprint y la app factory**

`services/app/routes/health.py`:

```python
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    """Liveness probe. Mirrors the backend response envelope."""
    return jsonify(ok=True, message="Data service is healthy", data={"status": "UP"})
```

`services/app/main.py`:

```python
import os

from flask import Flask

from app.routes.health import health_bp


def create_app() -> Flask:
    """Application factory. Data processing blueprints register here."""
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=int(os.getenv("DATA_SERVICE_PORT", "5001")))
```

Los `__init__.py` de `app/`, `app/routes/`, `app/processors/` y `app/tests/` van vacíos.

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `cd services && python -m pytest -q`
Expected: PASS — 1 test.

- [ ] **Step 6: Escribir `services/Dockerfile`**

`python:3.11-slim`, `pip install --no-cache-dir -r requirements.txt`, usuario no root, `EXPOSE 5001`, `CMD ["python", "-m", "app.main"]`.

- [ ] **Step 7: Commit**

```bash
git add services/
git commit -m "feat(services): agrega microservicio Flask con endpoint de salud"
```

---

### Task 5: Orquestación con Docker Compose

**Files:**
- Create: `docker-compose.yml`, `docker-compose.dev.yml`

**Interfaces:**
- Consumes: los tres Dockerfiles de Tasks 2, 3 y 4.
- Produces: cuatro servicios (`db`, `backend`, `frontend`, `data-service`) levantables con un comando, en la red `hesperides-net`.

- [ ] **Step 1: Escribir `docker-compose.yml`**

Cuatro servicios con `container_name` `hesperides-db`, `hesperides-backend`, `hesperides-frontend`, `hesperides-data-service`; red `hesperides-net`; volumen `pgdata` para la BD. `db` usa `postgres:16-alpine` con healthcheck `pg_isready -U ${POSTGRES_USER}`. `backend` declara `depends_on: db: condition: service_healthy`. Solo `backend` y `frontend` publican puertos al host. Todos los valores vienen de variables de entorno con default.

- [ ] **Step 2: Escribir `docker-compose.dev.yml`**

Override de desarrollo: publica al host los puertos de `db` (5432) y `data-service` (5001) para poder inspeccionarlos con DBeaver y curl, monta volúmenes de código en `frontend` y `services` para hot reload, y fija `SPRING_PROFILES_ACTIVE=dev` y `FLASK_DEBUG=1`.

- [ ] **Step 3: Validar la sintaxis de ambos archivos**

Run: `docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet`
Expected: sin salida, exit code 0. Los errores de sintaxis y las variables mal referenciadas aparecen aquí.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.dev.yml
git commit -m "feat(infra): agrega orquestacion Docker Compose para los cuatro servicios"
```

---

### Task 6: GitHub Actions, actualización del SPEC-000 y publicación

**Files:**
- Create: `.github/workflows/ci-backend.yml`, `.github/workflows/ci-frontend.yml`, `.github/workflows/ci-data-service.yml`
- Modify: `specs/fundacionales/SPEC-000-arquitectura-general.md`

**Interfaces:**
- Consumes: los comandos de test de Tasks 2, 3 y 4.
- Produces: tres workflows y el SPEC-000 coherente con el código.

- [ ] **Step 1: Escribir `ci-backend.yml`**

Dispara en `push` y `pull_request` contra `main` y `develop`, con filtro `paths:` de `backend/**` y del propio workflow. Runner `ubuntu-latest`. Pasos: `actions/checkout@v4`, `actions/setup-java@v4` con distribución `temurin`, versión `17` y `cache: maven`, y `./mvnw -B verify` en `working-directory: backend`.

- [ ] **Step 2: Escribir `ci-frontend.yml`**

Filtro `paths:` de `frontend/**`, `shared/**` y el propio workflow. `actions/setup-node@v4` con Node 20 y `cache: npm` apuntando a `frontend/package-lock.json`. Pasos: `npm ci`, `npm run lint`, `npm test`, `npm run build`, todos con `working-directory: frontend`.

- [ ] **Step 3: Escribir `ci-data-service.yml`**

Filtro `paths:` de `services/**` y el propio workflow. `actions/setup-python@v5` con Python 3.11. Pasos: `pip install -r requirements.txt` y `python -m pytest -q`, con `working-directory: services`.

- [ ] **Step 4: Actualizar el SPEC-000**

Aplicar los seis cambios de la sección 11 del diseño:

1. `pe.edu.pucp.proyecto` → `pe.edu.pucp.hesperides` en las secciones 4, 5.2, la plantilla de la sección 6 y el checklist de la sección 11. En el Anexo A: `proyecto_pucp` → `hesperides` y `proyecto-db` → `hesperides-db`. `ProyectoApplication.java` → `HesperidesApplication.java`.
2. Raíz del árbol de la sección 4: `pruebaHesperides/` → `Hesperides/`.
3. Sección 5.5: quitar `mobile-api` de los nombres de servicio, dejando `backend`, `frontend`, `db`, `data-service`. En la sección 4, `ci-mobile.yml` → `ci-data-service.yml`.
4. Sección 4: anotar `mobile/` como fase 2, posterior al web.
5. Encabezado y sección 3: despliegue en la nube (AWS, pendiente de licencias) en lugar de on-premise; ajustar el rótulo del diagrama de arquitectura.
6. Añadir Tailwind CSS y JaCoCo al stack de herramientas.

No tocar nada más: convenciones, plantilla, flujo de trabajo, señales de alerta y Definition of Done se mantienen intactos.

- [ ] **Step 5: Verificar que no quedan referencias obsoletas**

Run: `grep -rn "pe.edu.pucp.proyecto\|proyecto_pucp\|pruebaHesperides\|mobile-api\|ProyectoApplication" specs/ backend/ frontend/ services/ README.md`
Expected: sin resultados.

- [ ] **Step 6: Verificación integral antes de publicar**

```bash
cd backend && ./mvnw -q test && cd ..
cd frontend && npm test && cd ..
cd services && python -m pytest -q && cd ..
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
```

Expected: las tres suites en verde y Compose sin errores. Si algo falla, arreglarlo antes de continuar: no se publica en rojo.

- [ ] **Step 7: Commit y publicación**

```bash
git add .github/ specs/
git commit -m "ci: agrega workflows de GitHub Actions y actualiza SPEC-000 con las decisiones del proyecto base"
git branch develop
git push -u origin main
git push -u origin develop
```

**Nota:** `gh` no está instalado; el push va por HTTPS con `git` y puede solicitar credenciales de GitHub.

---

## Verificación final

| Criterio | Cómo verificar |
|----------|----------------|
| El backend compila y pasa sus tests | `cd backend && ./mvnw -q test` → 4 tests en verde |
| El frontend pasa sus tests | `cd frontend && npm test` → 4 tests en verde |
| El servicio Flask pasa su test | `cd services && python -m pytest -q` → 1 test en verde |
| Compose es válido | `docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet` → exit 0 |
| No hay credenciales commiteadas | Revisar que `.env` esté en `.gitignore` y que solo exista `.env.example` con placeholders |
| El SPEC-000 es coherente con el código | El grep del Step 5 de Task 6 no devuelve resultados |
| El repositorio está publicado | Ramas `main` y `develop` visibles en github.com/BotaniPUCP/Hesperides |
