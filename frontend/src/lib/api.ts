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
