'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient, ApiError, setAccessToken } from './api';

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: { id: number; code: string; label: string };
  isActive: boolean;
  lastLogin: string | null;
  /**
   * El backend ya lo enviaba (SPEC-100 §5.2) y este tipo lo descartaba. Sin él
   * el frontend no puede saber que la clave vigente es la temporal, y RouteGuard
   * dejaría entrar a pantallas donde el backend responde 403 a todo.
   */
  mustChangePassword: boolean;
}

interface LoginPayload {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Vuelve a leer /auth/me. Lo necesita el cambio obligatorio de contraseña:
   * al terminar, `mustChangePassword` ya es false en el servidor pero la copia
   * de esta sesión sigue en true, y RouteGuard devolvería a la persona a la
   * misma pantalla que acaba de completar.
   */
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, se pregunta por la sesión: la cookie httpOnly viaja sola, así
  // que recargar la página no obliga a volver a iniciar sesión.
  useEffect(() => {
    apiClient
      .get<SessionUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await apiClient.post<LoginPayload>('/auth/login', { email, password });

    // El token va a memoria antes que el usuario: si se hiciera al revés, un
    // render intermedio podría lanzar una petición sin credencial.
    setAccessToken(payload.accessToken);
    setUser(payload.user);
  }, []);

  const refreshSession = useCallback(async () => {
    // Un fallo aquí deja la sesión en null y el guard lleva a login: es lo
    // correcto, porque si /auth/me no responde no hay forma de saber qué
    // permisos tiene quien está delante.
    const actual = await apiClient.get<SessionUser>('/auth/me').catch(() => null);
    setUser(actual);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Si el logout falla en el servidor, la sesión local se cierra igual:
      // dejar al usuario "dentro" tras pulsar salir sería peor.
      if (!(error instanceof ApiError)) throw error;
    } finally {
      // El token se borra pase lo que pase: dejarlo en memoria tras cerrar
      // sesión permitiría seguir operando la API desde la misma pestaña.
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshSession }),
    [user, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  return context;
}
