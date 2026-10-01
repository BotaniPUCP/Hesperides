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

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * El access token vive aquí, en memoria del módulo, y en ningún otro sitio:
 * `localStorage` y `sessionStorage` están prohibidos para tokens porque
 * cualquier XSS los leería (SPEC-000, SPEC-001 §2.4).
 *
 * Que se pierda al recargar la página no es un problema, es el diseño: la
 * cookie httpOnly de refresh sobrevive a la recarga, y la primera petición que
 * reciba un 401 la usa para reponer el token sin volver a pedir contraseña
 * (SPEC-001 §5.1).
 */
let accessToken: string | null = null;

/** La llama AuthContext al iniciar sesión y con null al cerrarla. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

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

        // El token nuevo se guarda aquí y no en quien llamó: si no, el
        // reintento de más abajo saldría con el token viejo y volvería a 401.
        const envelope = (await response.json()) as ApiResponse<{ accessToken?: string }>;
        accessToken = envelope.data?.accessToken ?? null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/** Endpoints de sesión: un 401 aquí ya es la respuesta, no algo que reintentar. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

async function doFetch(
  method: HttpMethod,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...extraHeaders };

  // El backend lee el access token del header y nunca de la cookie
  // (SPEC-001 §5.1): la cookie solo sirve para /auth/refresh y /auth/logout.
  if (accessToken !== null) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    // La cookie httpOnly de refresh viaja igual: es lo que permite recuperar la
    // sesión tras recargar, cuando el token en memoria ya no está.
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * Envía la petición y, ante un 401, refresca la sesión y la reintenta una sola
 * vez. Devuelve la respuesta cruda: interpretarla le toca a quien llama.
 */
async function send(
  method: HttpMethod,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  let response: Response;

  try {
    response = await doFetch(method, path, body, extraHeaders);
  } catch {
    throw new ApiError(0, 'Sin conexión. Verifique su red.');
  }

  if (response.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    try {
      await refreshSession();
    } catch {
      const failed = (await response.json()) as ApiResponse<unknown>;
      throw new ApiError(401, failed.message ?? 'Session expired', failed.data);
    }

    // Un único reintento: si el token nuevo tampoco sirve, se propaga el error
    // en vez de encolar otro refresh y entrar en bucle.
    try {
      response = await doFetch(method, path, body, extraHeaders);
    } catch {
      throw new ApiError(0, 'Sin conexión. Verifique su red.');
    }
  }

  return response;
}

async function unwrap<T>(response: Response): Promise<T> {
  const envelope = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !envelope.ok) {
    throw new ApiError(response.status, envelope.message ?? 'Unexpected error', envelope.data);
  }

  return envelope.data as T;
}

/**
 * The only place in the web app that calls fetch. Components must never
 * call it directly.
 */
async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const response = await send(method, path, body);

  if (response.status === 204) {
    return null as T;
  }

  return unwrap<T>(response);
}

export type ConditionalResult<T> = { changed: false } | { changed: true; data: T; etag: string | null };

/**
 * GET condicional: con la etiqueta de la copia local, el servidor responde 304
 * si nada cambió y el cliente sigue con su copia (SPEC-102 §5.1). Un 304 no
 * trae cuerpo, por eso no pasa por el sobre {ok, message, data}.
 */
async function getIfChanged<T>(path: string, etag: string | null): Promise<ConditionalResult<T>> {
  const response = await send('GET', path, undefined, etag ? { 'If-None-Match': etag } : {});

  if (response.status === 304) {
    return { changed: false };
  }

  const data = await unwrap<T>(response);
  return { changed: true, data, etag: response.headers.get('ETag') };
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  getIfChanged,
};

