# Brief — Task 5

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

