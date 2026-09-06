# Brief — Task 1

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

