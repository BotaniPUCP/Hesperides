# Brief — Task 4

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

