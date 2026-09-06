# Brief — Task 3

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

