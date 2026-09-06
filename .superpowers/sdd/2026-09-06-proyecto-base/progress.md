# SDD ledger — plan: docs/superpowers/plans/2026-09-06-proyecto-base.md

Spec: docs/superpowers/specs/2026-09-06-proyecto-base-design.md (legible, autoridad vinculante)
Repo: sin git al inicio; Task 1 hace `git init`. No hay worktree del que aislarse.
Ruling (setup): ejecutar en `main` — el usuario aprobo explicitamente publicar main y develop
en https://github.com/BotaniPUCP/Hesperides.git. Costo si es erroneo: commits en la rama
equivocada de un repo vacio, revertible con `git branch -m`.

## Preflight — escaneo de conflictos

### Pares que comparten archivo o interfaz

| Par | Produce -> Consume | Hallazgo |
|---|---|---|
| T1 -> T2..T6 | arbol de carpetas, git init, remoto | OK |
| T2 -> T3 | sobre {ok,message,data} Java -> ApiResponse<T> TS | OK, campos y tipos coinciden |
| T2 -> T5 | backend/Dockerfile -> servicio backend | OK |
| T2 -> T6 | ./mvnw verify -> ci-backend.yml | OK, wrapper existe antes del CI |
| T3 -> T5 | frontend/Dockerfile -> servicio frontend | OK |
| T3 -> T6 | npm ci + cache -> ci-frontend.yml | CONFLICTO: package-lock.json no declarado |
| T4 -> T5 | services/Dockerfile -> servicio data-service | OK |
| T4 -> T6 | pytest -> ci-data-service.yml | OK |
| T5 -> T6 | compose validado | OK, sin solape de archivos |
| T1 <-> T6 | ambas tocan specs/ | OK, T1 mueve/crea y T6 edita SPEC-000 |

### Coherencia interna por tarea

| Tarea | Tests vs codigo especificado | Archivos creados vs tocados | Hallazgo |
|---|---|---|---|
| T1 | sin tests (estructura) | consistente | OK |
| T2 | handleResourceNotFound/handleBusinessRule/handleUnexpected existen con esas firmas; errorWithData declarado en Interfaces y usado | consistente | OK |
| T3 | apiClient.get y ApiError exportados; test de red cubierto por try/catch | falta package-lock.json | ver conflicto |
| T4 | create_app y /health coinciden con el test | consistente | OK |
| T5 | sin tests (validacion por compose config) | consistente | OK |
| T6 | grep del Step 5 cubre los renames del Step 4 | consistente | OK |

Ruling (preflight): package-lock.json lo genera `npm install` en T3 Step 4 y debe commitearse
en T3 Step 10; se anade explicitamente a los archivos de T3. Costo si es erroneo: ci-frontend
falla en el primer PR con "npm ci requires package-lock.json", visible y trivial de corregir.

## Progreso

