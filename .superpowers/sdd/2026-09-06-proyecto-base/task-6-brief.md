# Brief — Task 6

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

