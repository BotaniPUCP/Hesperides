import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY, parseThemePreference } from './theme';
import type { ThemePreference } from './theme';

/**
 * La preferencia vive en localStorage, por navegador y no por usuario: es una
 * comodidad visual que no merece una columna en la base ni una petición más.
 * La forma subscribe/read es la que pide useSyncExternalStore.
 */
const listeners = new Set<() => void>();

/**
 * En modo privado o con el almacenamiento bloqueado `setItem` lanza; entonces
 * la elección se recuerda aquí hasta recargar en vez de romper el botón.
 */
let unsavedPreference: ThemePreference | null = null;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function readThemePreference(): ThemePreference {
  if (unsavedPreference) return unsavedPreference;
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
    unsavedPreference = null;
  } catch {
    unsavedPreference = preference;
  }
  notifyListeners();
}

export function subscribeToThemePreference(listener: () => void): () => void {
  // El evento storage solo llega a las otras pestañas: así cambiar el tema en
  // una lo cambia en todas las que estén abiertas.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  listeners.add(listener);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
