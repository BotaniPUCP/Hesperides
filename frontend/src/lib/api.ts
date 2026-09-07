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
 * Promesa compartida del refresh en curso. Si tres peticiones fallan con 401
 * a la vez, solo la primera dispara POST /auth/refresh y las otras dos esperan
 * a esa misma promesa. Sin esto, las dos rezagadas llegarían con un refresh
 * token ya rotado, el backend lo interpretaría como reuso y cerraría la
 * sesión (SPEC-001 §4.2).
 */
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (refreshPromise === null) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status, 'Session expired');
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Endpoints de sesión: un 401 aquí ya es la respuesta, no algo que reintentar. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

async function doFetch(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * The only place in the web app that calls fetch. Components must never
 * call it directly.
 *
 * Ante un 401 refresca la sesión y reintenta la petición una sola vez.
 */
async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await doFetch(method, path, body);
  } catch {
    throw new ApiError(0, 'Sin conexión. Verifique su red.');
  }

  if (response.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    try {
      await refreshSession();
    } catch {
      const failed = (await response.json()) as ApiResponse<T>;
      throw new ApiError(401, failed.message ?? 'Session expired', failed.data);
    }

    // Un único reintento: si el token nuevo tampoco sirve, se propaga el error
    // en vez de encolar otro refresh y entrar en bucle.
    try {
      response = await doFetch(method, path, body);
    } catch {
      throw new ApiError(0, 'Sin conexión. Verifique su red.');
    }
  }

  const envelope = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !envelope.ok) {
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
