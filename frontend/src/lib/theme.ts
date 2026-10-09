/**
 * Reglas del tema claro/oscuro, sin tocar el DOM ni el almacenamiento: quien
 * las aplica es theme-store (persistencia) y ThemeSync (la clase en <html>).
 */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'hesperides.theme';
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';
export const DARK_CLASS = 'dark';

/**
 * Claro por defecto y no "sistema": el modo oscuro es una opción que cada
 * persona activa, no un cambio que aparece solo a quien tiene el SO en oscuro.
 */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'light';

function isThemePreference(value: string | null): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value);
}

/** localStorage es editable por cualquiera: un valor ajeno vuelve al defecto. */
export function parseThemePreference(stored: string | null): ThemePreference {
  return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/**
 * Corre en <head> antes del primer pintado para que quien eligió oscuro no vea
 * un destello blanco mientras React hidrata. Repite parseThemePreference y
 * resolveTheme en ES5 porque no puede importar nada; los tests ejecutan este
 * mismo texto para que no se desvíe de ellas.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(${JSON.stringify(THEME_PREFERENCES)}.indexOf(p)<0)p=${JSON.stringify(DEFAULT_THEME_PREFERENCE)};
var d=p==="dark"||(p==="system"&&window.matchMedia(${JSON.stringify(DARK_SCHEME_QUERY)}).matches);
var r=document.documentElement;r.classList.toggle(${JSON.stringify(DARK_CLASS)},d);r.style.colorScheme=d?"dark":"light";
}catch(e){}})()`;
