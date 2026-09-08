# Biblioteca de componentes SPEC-C01 y pantalla de login — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar construido el design system del proyecto (11 componentes de SPEC-C01) y la pantalla de login que cierra el frontend de SPEC-001, de modo que una persona pueda entrar al sistema desde el navegador.

**Architecture:** Los componentes son piezas de presentación puras: reciben props, no llaman a la API ni conocen el dominio. Viven en `components/ui` (y `components/forms` para el de fechas) y son la única fuente de botones, inputs, tablas y badges del proyecto — ninguna feature escribe su propio `<button>`. Encima de ellos, la pantalla de login consume el `AuthProvider` ya implementado en SPEC-001, que a su vez usa el `apiClient` con refresh encolado. El guard de rutas vive en un componente de layout, no en cada página.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 3.4 · Jest + React Testing Library · date-fns

**Specs:** `specs/compartidos/SPEC-C01-componentes-ui.md` (props exactas, tokens, accesibilidad, responsive) y `specs/fundacionales/SPEC-001-autenticacion.md` §7.1 (pantalla de login)

## Global Constraints

Copiadas literalmente de los specs. Aplican a **todas** las tareas.

- **Prohibida cualquier librería de componentes UI**: Material UI, Ant Design, Chakra, shadcn/ui como dependencia, NativeBase. "El catálogo de este spec **es** el design system del proyecto" (SPEC-C01 §2.4).
- **Prohibido CSS-in-JS** (`styled-components`, `emotion`). Layout siempre con clases de Tailwind.
- **Prohibido `style` inline para layout.** Solo se admite para un valor genuinamente dinámico no expresable en clases (p. ej. el `width` en porcentaje de una barra calculada en runtime).
- **Prohibido recrear un componente del catálogo.** Si una pantalla necesita un botón, importa `Button`. Nunca un `<button className="...">` suelto.
- **Prohibido inventar colores de estado o urgencia** fuera de las tablas de SPEC-C01 §3.1.
- **Prohibido redeclarar tipos de props** ya definidos en el catálogo; se importan del componente.
- **TypeScript estricto.** Nada de `any`; usar `unknown` cuando el tipo no se conoce.
- **Accesibilidad, verificable por componente** (SPEC-C01 §8): todo interactivo alcanzable con `Tab` y activable con `Enter`/`Space`; anillo de foco visible en `brand-600` de mínimo 2px, nunca `outline: none` sin reemplazo; todo campo con `<label>` asociado por `id`/`htmlFor`, nunca identificado solo por `placeholder`; `required` marca asterisco y `aria-required="true"`; `errorMessage` se asocia con `aria-describedby`; `Toast` usa `role="status"` (info/success) o `role="alert"` (error/warning); nunca depender solo del color.
- **Breakpoints** (SPEC-C01 §9): móvil `<640px`, tablet `640–1024px`, desktop `>1024px`.
- **Textos de interfaz en español**; los `message` de la API vienen en inglés técnico y el frontend los traduce.
- **Comando de tests:** desde `frontend/`, `npx jest`. Para un archivo suelto, `npx jest <patrón>`.
- **Typecheck:** desde `frontend/`, `npx tsc --noEmit`. Debe salir limpio antes de cada commit.

## Tokens de diseño (SPEC-C01 §3.1)

Los valores exactos que la Task 1 lleva a `tailwind.config.ts`. Ninguna tarea posterior inventa un color.

| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#f0fdf4` | Superficies de marca |
| `brand-600` | `#16a34a` | Acción primaria, anillo de foco |
| `brand-700` | `#15803d` | Hover de acción primaria |
| `brand-900` | `#14532d` | Marca sobre fondo claro |
| `neutral-0` | `#ffffff` | Fondo de `Card` y `Modal` |
| `neutral-50` | `#f8fafc` | Fondo de página |
| `neutral-200` | `#e2e8f0` | Bordes y divisores |
| `neutral-500` | `#64748b` | Texto secundario |
| `neutral-700` | `#334155` | Texto principal |
| `neutral-900` | `#0f172a` | Títulos |
| `action-danger` | `#dc2626` | Botón `danger`, errores de validación |
| `action-danger-hover` | `#b91c1c` | Hover de `danger` |
| `info-600` | `#0284c7` | `Toast` info |
| `warning-600` | `#f59e0b` | `Toast` warning |
| `success-600` | `#16a34a` | `Toast` success |

Estados de flujo (`StatusBadge`) y urgencia (`UrgencyBadge`), con su par fondo/texto fijo:

| `code` | Fondo | Texto |
|---|---|---|
| `REPORTED` | `#f1f5f9` | `#334155` |
| `IN_REVIEW` | `#fef3c7` | `#92400e` |
| `IN_PROGRESS` | `#e0f2fe` | `#075985` |
| `RESOLVED` | `#dcfce7` | `#166534` |
| `LOW` | `#f1f5f9` | `#334155` |
| `MEDIUM` | `#fef3c7` | `#92400e` |
| `HIGH` | `#ffedd5` | `#9a3412` |
| `CRITICAL` | `#fee2e2` | `#991b1b` |

---

## File Structure

**Configuración**
- `frontend/tailwind.config.ts` — tokens de diseño (modificado)

**Componentes UI** (`frontend/src/components/ui/`)
- `Button.tsx` · `Input.tsx` · `Select.tsx` · `Modal.tsx`
- `Toast.tsx` + `ToastProvider.tsx` — el provider gestiona la cola, el toast pinta uno
- `DataTable.tsx` + `DataTableCards.tsx` — la vista de tarjetas de móvil vive aparte para que ninguno pase de 200 líneas
- `Card.tsx` · `LoadingSkeleton.tsx` · `EmptyState.tsx`
- `Badge.tsx` · `StatusBadge.tsx` · `UrgencyBadge.tsx`
- `index.ts` — reexporta todo, para que las pantallas importen de `@/components/ui`

**Formularios** (`frontend/src/components/forms/`)
- `DateRangePicker.tsx`

**Hooks** (`frontend/src/hooks/`)
- `useMediaQuery.ts` — lo necesita `DataTable` para decidir tabla vs. tarjetas
- `useAuth.ts` — ya existe

**Pantallas** (`frontend/src/app/`)
- `login/page.tsx` — pantalla de login
- `layout.tsx` — monta `AuthProvider` y `ToastProvider` (modificado)
- `(protected)/layout.tsx` — guard de rutas autenticadas

**Componentes de sesión** (`frontend/src/components/auth/`)
- `LoginForm.tsx` — el formulario, separado de la página para poder testearlo aislado
- `RouteGuard.tsx` — redirige según haya sesión o no

Cada componente lleva su test junto en `__tests__/`.

---

## Task 1: Tokens de diseño y utilidades base

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Create: `frontend/src/lib/cn.ts`
- Create: `frontend/src/hooks/useMediaQuery.ts`
- Test: `frontend/src/lib/__tests__/cn.test.ts`, `frontend/src/hooks/__tests__/useMediaQuery.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: `cn(...classes: (string | false | null | undefined)[]): string` para componer clases condicionales; `useMediaQuery(query: string): boolean`; los tokens de Tailwind (`bg-brand-600`, `text-neutral-700`, `border-action-danger`…) disponibles en todo el proyecto

- [ ] **Step 1: Escribir los tests que fallan**

`frontend/src/lib/__tests__/cn.test.ts`:

```typescript
import { cn } from '../cn';

describe('cn', () => {
  it('une varias clases con un espacio', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('descarta los valores falsos', () => {
    expect(cn('base', false, null, undefined, 'extra')).toBe('base extra');
  });

  it('permite clases condicionales', () => {
    const isActive = false;
    expect(cn('btn', isActive && 'btn-active')).toBe('btn');
  });

  it('devuelve cadena vacia sin argumentos utiles', () => {
    expect(cn(false, null)).toBe('');
  });
});
```

`frontend/src/hooks/__tests__/useMediaQuery.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });
  }

  it('devuelve true cuando la consulta coincide', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(true);
  });

  it('devuelve false cuando no coincide', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(false);
  });

  it('no explota si matchMedia no existe (SSR)', () => {
    // @ts-expect-error se elimina a proposito para simular el servidor
    delete window.matchMedia;
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```bash
cd frontend && npx jest cn useMediaQuery
```

Esperado: FALLA, `Cannot find module '../cn'`.

- [ ] **Step 3: Implementar las utilidades**

`frontend/src/lib/cn.ts`:

```typescript
type ClassValue = string | false | null | undefined;

/**
 * Une clases de Tailwind descartando las condicionales que no aplican.
 * Existe para no repetir `[a, b].filter(Boolean).join(' ')` en cada componente.
 */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
```

`frontend/src/hooks/useMediaQuery.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve si la media query coincide, reaccionando a los cambios de tamaño.
 *
 * En el servidor `window` no existe: devuelve `false` y el valor real llega en
 * el primer efecto del cliente. Por eso los componentes que dependen de esto
 * deben renderizar la variante de escritorio primero, que es la que no rompe
 * si el hidratado corrige el valor un instante después.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
```

- [ ] **Step 4: Escribir los tokens en Tailwind**

`frontend/tailwind.config.ts` completo:

```typescript
import type { Config } from 'tailwindcss';

/**
 * Los tokens salen de SPEC-C01 §3.1 y son la única fuente de color del
 * proyecto: ninguna feature escribe un hex suelto en una clase arbitraria.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        neutral: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
        action: {
          danger: '#dc2626',
          'danger-hover': '#b91c1c',
        },
        info: { 600: '#0284c7' },
        warning: { 600: '#f59e0b' },
        success: { 600: '#16a34a' },
        // Pares fondo/texto de los estados de flujo y de urgencia. Fijos:
        // ninguna feature decide de qué color se pinta "crítico".
        status: {
          'reported-bg': '#f1f5f9', 'reported-fg': '#334155',
          'in-review-bg': '#fef3c7', 'in-review-fg': '#92400e',
          'in-progress-bg': '#e0f2fe', 'in-progress-fg': '#075985',
          'resolved-bg': '#dcfce7', 'resolved-fg': '#166534',
        },
        urgency: {
          'low-bg': '#f1f5f9', 'low-fg': '#334155',
          'medium-bg': '#fef3c7', 'medium-fg': '#92400e',
          'high-bg': '#ffedd5', 'high-fg': '#9a3412',
          'critical-bg': '#fee2e2', 'critical-fg': '#991b1b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Ejecutar los tests y verificar que pasan**

```bash
cd frontend && npx jest cn useMediaQuery && npx tsc --noEmit
```

Esperado: 7 tests en verde y typecheck limpio.

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.ts frontend/src/lib/cn.ts frontend/src/hooks/useMediaQuery.ts \
        frontend/src/lib/__tests__/cn.test.ts frontend/src/hooks/__tests__/useMediaQuery.test.ts
git commit -m "feat(ui): agrega los tokens de diseno de SPEC-C01 y utilidades base

Los colores dejan de ser hex sueltos y pasan a ser tokens de Tailwind: ninguna
feature decide de que color se pinta un estado critico.

useMediaQuery devuelve false en el servidor, asi que los componentes que lo
usan deben renderizar primero la variante de escritorio: es la que no rompe si
el hidratado corrige el valor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Button

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Test: `frontend/src/components/ui/__tests__/Button.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1)
- Produces: `Button`, `ButtonProps`, `ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'`, `ButtonSize = 'sm' | 'md' | 'lg'`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renderiza su contenido y responde al click', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no dispara onClick cuando esta deshabilitado', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} disabled>Guardar</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('bloquea el doble click mientras carga', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} loading>Guardar</Button>);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('usa la variante primary y el tamano md por defecto', () => {
    render(<Button>Guardar</Button>);

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-brand-600');
    expect(button.className).toContain('h-10');
  });

  it('aplica los colores de cada variante', () => {
    const { rerender } = render(<Button variant="danger">Borrar</Button>);
    expect(screen.getByRole('button').className).toContain('bg-action-danger');

    rerender(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button').className).toContain('border-neutral-200');

    rerender(<Button variant="ghost">Ver</Button>);
    expect(screen.getByRole('button').className).toContain('text-neutral-700');
  });

  it('es de tipo button por defecto, para no enviar formularios sin querer', () => {
    render(<Button>Accion</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('admite type submit cuando se pide explicitamente', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('expone aria-label cuando solo hay un icono', () => {
    render(<Button aria-label="Cerrar"><span aria-hidden>x</span></Button>);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('muestra el anillo de foco requerido por accesibilidad', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button').className).toContain('focus-visible:ring-2');
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest Button
```

Esperado: FALLA, `Cannot find module '../Button'`.

- [ ] **Step 3: Implementar Button**

```tsx
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  'aria-label'?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-neutral-0 hover:bg-brand-700 active:bg-brand-900',
  secondary: 'bg-neutral-0 text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
  danger: 'bg-action-danger text-neutral-0 hover:bg-action-danger-hover',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-lg',
};

/** Spinner inline: no merece un componente propio ni una dependencia. */
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  'aria-label': ariaLabel,
}: ButtonProps) {
  // loading implica disabled: es lo que evita el doble submit.
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
      )}
    >
      {loading ? <Spinner /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest Button
```

Esperado: `Tests: 9 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Button.tsx frontend/src/components/ui/__tests__/Button.test.tsx
git commit -m "feat(ui): agrega el componente Button

loading implica disabled y aria-busy: es lo que impide el doble submit sin que
cada formulario tenga que acordarse de deshabilitar el boton a mano.

El tipo por defecto es button, no submit, para que colocar un boton dentro de
un formulario no lo envie sin querer.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Input

**Files:**
- Create: `frontend/src/components/ui/Input.tsx`
- Test: `frontend/src/components/ui/__tests__/Input.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1)
- Produces: `Input`, `InputProps`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('asocia el label al campo por id, no por placeholder', () => {
    render(<Input id="email" label="Correo" value="" onChange={jest.fn()} />);

    // getByLabelText solo lo encuentra si la asociacion existe de verdad.
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
  });

  it('emite el valor escrito, no el evento', async () => {
    const onChange = jest.fn();
    render(<Input id="nombre" label="Nombre" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'A');

    expect(onChange).toHaveBeenCalledWith('A');
  });

  it('marca el campo requerido para lectores de pantalla y con asterisco', () => {
    render(<Input id="email" label="Correo" value="" onChange={jest.fn()} required />);

    expect(screen.getByLabelText(/Correo/)).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('entra en estado error y lo asocia con aria-describedby', () => {
    render(
      <Input id="email" label="Correo" value="malo" onChange={jest.fn()}
        errorMessage="Debe ser un correo válido" />,
    );

    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Debe ser un correo válido')).toHaveAttribute('id', 'email-error');
  });

  it('muestra el texto de ayuda cuando no hay error', () => {
    render(
      <Input id="email" label="Correo" value="" onChange={jest.fn()}
        helperText="Usa tu correo institucional" />,
    );

    expect(screen.getByText('Usa tu correo institucional')).toBeInTheDocument();
  });

  it('el error reemplaza al texto de ayuda, no se apilan', () => {
    render(
      <Input id="email" label="Correo" value="" onChange={jest.fn()}
        helperText="Usa tu correo institucional" errorMessage="Campo obligatorio" />,
    );

    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument();
    expect(screen.queryByText('Usa tu correo institucional')).not.toBeInTheDocument();
  });

  it('no admite escritura cuando esta deshabilitado', async () => {
    const onChange = jest.fn();
    render(<Input id="nombre" label="Nombre" value="" onChange={onChange} disabled />);

    await userEvent.type(screen.getByLabelText('Nombre'), 'texto');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('respeta el tipo password para no exponer la contrasena', () => {
    render(<Input id="pass" label="Contraseña" value="" onChange={jest.fn()} type="password" />);

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest Input
```

Esperado: FALLA, `Cannot find module '../Input'`.

- [ ] **Step 3: Implementar Input**

```tsx
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'search';
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  leadingIcon?: ReactNode;
  onBlur?: () => void;
}

export function Input({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  errorMessage,
  disabled = false,
  required = false,
  maxLength,
  leadingIcon,
  onBlur,
}: InputProps) {
  const hasError = Boolean(errorMessage);
  const describedBy = hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-action-danger">*</span>}
      </label>

      <div className="relative">
        {leadingIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
            'placeholder:text-neutral-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
            leadingIcon && 'pl-10',
            hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
          )}
        />
      </div>

      {/* El error sustituye al texto de ayuda: apilar ambos compite por la
          atención justo cuando hay algo que corregir. */}
      {hasError ? (
        <p id={`${id}-error`} className="text-sm text-action-danger">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest Input
```

Esperado: `Tests: 8 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Input.tsx frontend/src/components/ui/__tests__/Input.test.tsx
git commit -m "feat(ui): agrega el componente Input

El label se asocia por htmlFor, nunca por placeholder: un placeholder
desaparece al escribir y deja al lector de pantalla sin nombre de campo.

El mensaje de error sustituye al texto de ayuda en vez de apilarse, para no
competir por la atencion justo cuando hay algo que corregir.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Card, LoadingSkeleton y EmptyState

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`, `LoadingSkeleton.tsx`, `EmptyState.tsx`
- Test: `frontend/src/components/ui/__tests__/Card.test.tsx`, `LoadingSkeleton.test.tsx`, `EmptyState.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1), `Button` (Task 2)
- Produces: `Card`/`CardProps`, `LoadingSkeleton`/`LoadingSkeletonProps`, `EmptyState`/`EmptyStateProps`

Van juntos porque son los tres componentes de presentación sin lógica: separarlos en tres tareas añadiría tres ciclos de revisión sin nada que revisar.

- [ ] **Step 1: Escribir los tests que fallan**

`Card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from '../Card';

describe('Card', () => {
  it('renderiza su contenido', () => {
    render(<Card><p>Contenido</p></Card>);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('muestra titulo y acciones cuando se le pasan', () => {
    render(<Card title="Resumen" actions={<button>Ver</button>}><p>x</p></Card>);

    expect(screen.getByText('Resumen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver' })).toBeInTheDocument();
  });

  it('no es interactiva si no recibe onClick', () => {
    render(<Card><p>Contenido</p></Card>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('con onClick es alcanzable por teclado y se activa con Enter', async () => {
    const onClick = jest.fn();
    render(<Card onClick={onClick}><p>Contenido</p></Card>);

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

`LoadingSkeleton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LoadingSkeleton } from '../LoadingSkeleton';

describe('LoadingSkeleton', () => {
  it('repite el placeholder tantas veces como diga count', () => {
    render(<LoadingSkeleton variant="table-row" count={5} />);
    expect(screen.getAllByTestId('skeleton-item')).toHaveLength(5);
  });

  it('renderiza uno solo por defecto', () => {
    render(<LoadingSkeleton />);
    expect(screen.getAllByTestId('skeleton-item')).toHaveLength(1);
  });

  it('se anuncia como region ocupada para lectores de pantalla', () => {
    render(<LoadingSkeleton />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });
});
```

`EmptyState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('muestra el titulo y la descripcion', () => {
    render(<EmptyState title="Sin usuarios" description="No hay resultados." />);

    expect(screen.getByText('Sin usuarios')).toBeInTheDocument();
    expect(screen.getByText('No hay resultados.')).toBeInTheDocument();
  });

  it('ejecuta la accion ofrecida', async () => {
    const onClick = jest.fn();
    render(<EmptyState title="Sin usuarios" action={{ label: 'Crear usuario', onClick }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Crear usuario' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('no renderiza boton si no hay accion', () => {
    render(<EmptyState title="Sin usuarios" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```bash
cd frontend && npx jest Card LoadingSkeleton EmptyState
```

Esperado: FALLA, los tres módulos no existen.

- [ ] **Step 3: Implementar los tres componentes**

`Card.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  onClick?: () => void;
}

export function Card({ title, actions, children, padded = true, onClick }: CardProps) {
  const interactive = Boolean(onClick);

  return (
    <div
      // Con onClick es un control real: rol, tabIndex y teclado. Un div
      // clicable sin esto es invisible para quien navega sin ratón.
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border border-neutral-200 bg-neutral-0 shadow-sm',
        padded && 'p-4',
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none ' +
            'focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
      )}
    >
      {(title || actions) && (
        <div className={cn('flex items-center justify-between', padded ? 'mb-3' : 'p-4 pb-3')}>
          {title && <h3 className="text-base font-semibold text-neutral-900">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!padded && !title && 'p-4')}>{children}</div>
    </div>
  );
}
```

`LoadingSkeleton.tsx`:

```tsx
import { cn } from '@/lib/cn';

export interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'table-row' | 'avatar' | 'map';
  count?: number;
  className?: string;
}

const VARIANTS: Record<NonNullable<LoadingSkeletonProps['variant']>, string> = {
  text: 'h-4 w-full rounded',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-12 w-full rounded',
  avatar: 'h-10 w-10 rounded-full',
  map: 'h-96 w-full rounded-lg',
};

export function LoadingSkeleton({ variant = 'text', count = 1, className }: LoadingSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          data-testid="skeleton-item"
          className={cn('animate-pulse bg-neutral-200', VARIANTS[variant], className)}
        />
      ))}
    </div>
  );
}
```

`EmptyState.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      {icon && <div className="text-neutral-500" aria-hidden="true">{icon}</div>}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description && <p className="max-w-md text-sm text-neutral-500">{description}</p>}
      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

```bash
cd frontend && npx jest Card LoadingSkeleton EmptyState
```

Esperado: `Tests: 10 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Card.tsx frontend/src/components/ui/LoadingSkeleton.tsx \
        frontend/src/components/ui/EmptyState.tsx frontend/src/components/ui/__tests__/
git commit -m "feat(ui): agrega Card, LoadingSkeleton y EmptyState

Card con onClick declara rol de boton, tabIndex y manejo de Enter y Espacio:
un div clicable sin eso es invisible para quien navega sin raton.

LoadingSkeleton se anuncia con role status y aria-busy, para que un lector de
pantalla sepa que hay algo cargando y no lea una region vacia.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Badge, StatusBadge y UrgencyBadge

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`, `StatusBadge.tsx`, `UrgencyBadge.tsx`
- Test: `frontend/src/components/ui/__tests__/Badge.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1)
- Produces: `Badge`/`BadgeProps`, `StatusBadge`/`StatusBadgeProps`, `UrgencyBadge`/`UrgencyBadgeProps`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';
import { StatusBadge } from '../StatusBadge';
import { UrgencyBadge } from '../UrgencyBadge';

describe('Badge', () => {
  it('muestra la etiqueta', () => {
    render(<Badge label="Activo" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('aplica el color pedido', () => {
    render(<Badge label="Error" color="danger" />);
    expect(screen.getByText('Error').className).toContain('action-danger');
  });
});

describe('StatusBadge', () => {
  it('resuelve el color internamente segun el code del catalogo', () => {
    render(<StatusBadge code="IN_REVIEW" label="En evaluación" />);

    const badge = screen.getByText('En evaluación');
    expect(badge.className).toContain('status-in-review-bg');
    expect(badge.className).toContain('status-in-review-fg');
  });

  it('siempre muestra el texto, nunca solo color', () => {
    render(<StatusBadge code="RESOLVED" label="Resuelta" />);
    expect(screen.getByText('Resuelta')).toBeInTheDocument();
  });

  it('cae en un neutro legible ante un code desconocido', () => {
    // Un catalogo puede crecer; el badge no debe romperse ni quedar invisible.
    render(<StatusBadge code="CODIGO_NUEVO" label="Estado nuevo" />);
    expect(screen.getByText('Estado nuevo').className).toContain('bg-neutral-100');
  });
});

describe('UrgencyBadge', () => {
  it('pinta cada nivel con su color fijo', () => {
    const { rerender } = render(<UrgencyBadge code="LOW" label="Baja" />);
    expect(screen.getByText('Baja').className).toContain('urgency-low-bg');

    rerender(<UrgencyBadge code="CRITICAL" label="Crítica" />);
    expect(screen.getByText(/Crítica/).className).toContain('urgency-critical-bg');
  });

  it('CRITICAL agrega un icono, no solo color', () => {
    render(<UrgencyBadge code="CRITICAL" label="Crítica" />);
    expect(screen.getByTestId('urgency-critical-icon')).toBeInTheDocument();
  });

  it('los niveles no criticos no llevan icono', () => {
    render(<UrgencyBadge code="HIGH" label="Alta" />);
    expect(screen.queryByTestId('urgency-critical-icon')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest Badge
```

Esperado: FALLA, los módulos no existen.

- [ ] **Step 3: Implementar los tres badges**

`Badge.tsx`:

```tsx
import { cn } from '@/lib/cn';

export type BadgeColor = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  color?: BadgeColor;
}

const COLORS: Record<BadgeColor, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  brand: 'bg-brand-50 text-brand-900',
  success: 'bg-brand-100 text-success-600',
  warning: 'bg-status-in-review-bg text-status-in-review-fg',
  danger: 'bg-urgency-critical-bg text-action-danger',
  info: 'bg-status-in-progress-bg text-info-600',
};

/** Etiqueta genérica. Para estados de flujo o urgencia usar StatusBadge/UrgencyBadge. */
export function Badge({ label, color = 'neutral' }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      COLORS[color],
    )}>
      {label}
    </span>
  );
}
```

`StatusBadge.tsx`:

```tsx
import { cn } from '@/lib/cn';

export interface StatusBadgeProps {
  code: string;
  label: string;
}

/**
 * El color lo resuelve este componente, nunca la feature que lo usa: así
 * "resuelta" es del mismo verde en toda la aplicación (SPEC-C01 §4.9).
 */
const STATUS_COLORS: Record<string, string> = {
  REPORTED: 'bg-status-reported-bg text-status-reported-fg',
  IN_REVIEW: 'bg-status-in-review-bg text-status-in-review-fg',
  IN_PROGRESS: 'bg-status-in-progress-bg text-status-in-progress-fg',
  RESOLVED: 'bg-status-resolved-bg text-status-resolved-fg',
};

const UNKNOWN_STATUS = 'bg-neutral-100 text-neutral-700';

export function StatusBadge({ code, label }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      // Un catálogo configurable puede crecer con codes que este spec no
      // contempla: se degrada a neutro legible en vez de quedar sin color.
      STATUS_COLORS[code] ?? UNKNOWN_STATUS,
    )}>
      {label}
    </span>
  );
}
```

`UrgencyBadge.tsx`:

```tsx
import { cn } from '@/lib/cn';

export type UrgencyCode = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UrgencyBadgeProps {
  code: UrgencyCode;
  label: string;
}

const URGENCY_COLORS: Record<UrgencyCode, string> = {
  LOW: 'bg-urgency-low-bg text-urgency-low-fg',
  MEDIUM: 'bg-urgency-medium-bg text-urgency-medium-fg',
  HIGH: 'bg-urgency-high-bg text-urgency-high-fg',
  CRITICAL: 'bg-urgency-critical-bg text-urgency-critical-fg',
};

export function UrgencyBadge({ code, label }: UrgencyBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
      URGENCY_COLORS[code],
    )}>
      {/* CRITICAL añade ícono: el color solo no basta para quien no lo distingue. */}
      {code === 'CRITICAL' && (
        <svg data-testid="urgency-critical-icon" className="h-3 w-3" viewBox="0 0 20 20"
          fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      )}
      {label}
    </span>
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest Badge
```

Esperado: `Tests: 8 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx frontend/src/components/ui/StatusBadge.tsx \
        frontend/src/components/ui/UrgencyBadge.tsx frontend/src/components/ui/__tests__/Badge.test.tsx
git commit -m "feat(ui): agrega Badge, StatusBadge y UrgencyBadge

StatusBadge y UrgencyBadge resuelven el color internamente contra las tablas
de SPEC-C01: ninguna feature decide de que color se pinta un estado critico,
que es como una misma incidencia acabaria de dos colores en dos pantallas.

Un code que el spec no contempla cae en un neutro legible en vez de quedarse
sin clase: los catalogos son configurables y pueden crecer.

CRITICAL agrega un icono ademas del color, porque el color solo no basta para
quien no lo distingue.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Modal

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`
- Test: `frontend/src/components/ui/__tests__/Modal.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1), `useMediaQuery` (Task 1)
- Produces: `Modal`, `ModalProps`

**Lo difícil de este componente** es el foco: SPEC-C01 §8.3 exige que `Tab` no salga del modal mientras está abierto y que al cerrar el foco vuelva al elemento que lo abrió. Sin eso, quien navega con teclado queda tabulando por detrás del overlay sin saber dónde está.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('no renderiza nada cuando esta cerrado', () => {
    render(<Modal isOpen={false} onClose={jest.fn()} title="Confirmar"><p>Contenido</p></Modal>);
    expect(screen.queryByText('Contenido')).not.toBeInTheDocument();
  });

  it('renderiza titulo y contenido cuando esta abierto', () => {
    render(<Modal isOpen onClose={jest.fn()} title="Confirmar"><p>Contenido</p></Modal>);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('se anuncia con su titulo mediante aria-labelledby', () => {
    render(<Modal isOpen onClose={jest.fn()} title="Confirmar"><p>x</p></Modal>);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Confirmar');
  });

  it('cierra con Escape', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>x</p></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra con Escape si closeOnEsc es false', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar" closeOnEsc={false}><p>x</p></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('cierra al pulsar el overlay', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>x</p></Modal>);

    await userEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al pulsar dentro del contenido', async () => {
    const onClose = jest.fn();
    render(<Modal isOpen onClose={onClose} title="Confirmar"><p>Contenido</p></Modal>);

    await userEvent.click(screen.getByText('Contenido'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('no cierra por overlay si closeOnOverlayClick es false', async () => {
    const onClose = jest.fn();
    render(
      <Modal isOpen onClose={onClose} title="Confirmar" closeOnOverlayClick={false}><p>x</p></Modal>,
    );

    await userEvent.click(screen.getByTestId('modal-overlay'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('atrapa el foco: Tab desde el ultimo elemento vuelve al primero', async () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Confirmar"
        footer={<button>Aceptar</button>}>
        <button>Interno</button>
      </Modal>,
    );

    const cerrar = screen.getByRole('button', { name: 'Cerrar' });
    const aceptar = screen.getByRole('button', { name: 'Aceptar' });

    aceptar.focus();
    await userEvent.tab();

    expect(cerrar).toHaveFocus();
  });

  it('renderiza el pie cuando se le pasa', () => {
    render(
      <Modal isOpen onClose={jest.fn()} title="Confirmar" footer={<button>Aceptar</button>}>
        <p>x</p>
      </Modal>,
    );

    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest Modal
```

Esperado: FALLA, `Cannot find module '../Modal'`.

- [ ] **Step 3: Implementar Modal**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type ModalSize = 'sm' | 'md' | 'lg' | 'fullscreen';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  fullscreen: 'h-full w-full max-w-none rounded-none',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 639px)');

  // Guarda quién abrió el modal y le devuelve el foco al cerrar: sin esto,
  // quien navega con teclado vuelve al principio de la página.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    return () => previouslyFocused.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && closeOnEsc) {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      // Trampa de foco: el ciclo se cierra sobre sí mismo en ambos sentidos.
      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  // En móvil todo modal ocupa la pantalla salvo los `sm`, que ya caben
  // (SPEC-C01 §9): lo decide el componente, no cada feature.
  const effectiveSize: ModalSize = isMobile && size !== 'sm' ? 'fullscreen' : size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        data-testid="modal-overlay"
        onClick={closeOnOverlayClick ? onClose : undefined}
        className="absolute inset-0 bg-neutral-900/50"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative z-10 flex max-h-full w-full flex-col rounded-lg bg-neutral-0 shadow-lg',
          SIZES[effectiveSize],
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 p-4">
          <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest Modal
```

Esperado: `Tests: 10 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Modal.tsx frontend/src/components/ui/__tests__/Modal.test.tsx
git commit -m "feat(ui): agrega el componente Modal con trampa de foco

Tab no sale del modal mientras esta abierto y al cerrarse el foco vuelve al
elemento que lo abrio. Sin eso, quien navega con teclado acaba tabulando por
detras del overlay sin saber donde esta.

En movil cualquier modal que no sea sm pasa a pantalla completa: lo decide el
componente, no cada feature, que es como acaban existiendo tres criterios
distintos para lo mismo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Toast y ToastProvider

**Files:**
- Create: `frontend/src/components/ui/Toast.tsx`, `frontend/src/components/ui/ToastProvider.tsx`
- Test: `frontend/src/components/ui/__tests__/ToastProvider.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1)
- Produces: `ToastProvider`, `useToast(): UseToastReturn` con `showToast(options: ToastOptions)` y `dismissAll()`; tipos `ToastVariant`, `ToastOptions`, `UseToastReturn`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../ToastProvider';

function Disparador() {
  const { showToast, dismissAll } = useToast();
  return (
    <>
      <button onClick={() => showToast({ variant: 'success', title: 'Guardado' })}>Exito</button>
      <button onClick={() => showToast({ variant: 'error', title: 'Fallo', description: 'Detalle' })}>
        Error
      </button>
      <button onClick={dismissAll}>Limpiar</button>
    </>
  );
}

function renderConProvider() {
  return render(
    <ToastProvider>
      <Disparador />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  beforeEach(() => jest.useFakeTimers({ advanceTimers: true }));
  afterEach(() => jest.useRealTimers());

  it('muestra un toast al dispararlo', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));

    expect(screen.getByText('Guardado')).toBeInTheDocument();
  });

  it('muestra tambien la descripcion', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByText('Detalle')).toBeInTheDocument();
  });

  it('usa role alert para errores, que el lector anuncia sin esperar foco', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('usa role status para exito', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('se cierra solo pasados 5 segundos', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    expect(screen.getByText('Guardado')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(5000); });

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });

  it('se puede cerrar a mano antes de que expire', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }));

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
  });

  it('apila varios toasts a la vez', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByText('Guardado')).toBeInTheDocument();
    expect(screen.getByText('Fallo')).toBeInTheDocument();
  });

  it('dismissAll los cierra todos', async () => {
    renderConProvider();

    await userEvent.click(screen.getByRole('button', { name: 'Exito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Error' }));
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
    expect(screen.queryByText('Fallo')).not.toBeInTheDocument();
  });

  it('useToast fuera del provider falla con un mensaje claro', () => {
    // Silencia el error que React imprime al propagar la excepcion.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Disparador />)).toThrow(/ToastProvider/);

    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest ToastProvider
```

Esperado: FALLA, `Cannot find module '../ToastProvider'`.

- [ ] **Step 3: Implementar Toast y ToastProvider**

`Toast.tsx`:

```tsx
'use client';

import { cn } from '@/lib/cn';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

export interface ToastData extends ToastOptions {
  id: string;
}

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success-600 bg-brand-50',
  error: 'border-action-danger bg-urgency-critical-bg',
  warning: 'border-warning-600 bg-status-in-review-bg',
  info: 'border-info-600 bg-status-in-progress-bg',
};

const ICONS: Record<ToastVariant, string> = {
  success: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z',
  error: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
  warning: 'M8.257 3.1c.765-1.36 2.72-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 8a1 1 0 100-2 1 1 0 000 2z',
  info: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z',
};

export function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  // error y warning usan alert: el lector de pantalla los anuncia de inmediato,
  // sin esperar a que el foco llegue. success e info no interrumpen.
  const role = toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cn(
        'flex w-80 items-start gap-3 rounded-lg border-l-4 bg-neutral-0 p-4 shadow-lg',
        STYLES[toast.variant],
      )}
    >
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" viewBox="0 0 20 20"
        fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d={ICONS[toast.variant]} />
      </svg>

      <div className="flex-1">
        <p className="text-sm font-semibold text-neutral-900">{toast.title}</p>
        {toast.description && <p className="mt-1 text-sm text-neutral-700">{toast.description}</p>}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar notificación"
        className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" clipRule="evenodd" d={ICONS.error} />
        </svg>
      </button>
    </div>
  );
}
```

`ToastProvider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Toast } from './Toast';
import type { ToastData, ToastOptions } from './Toast';

export interface UseToastReturn {
  showToast: (options: ToastOptions) => void;
  dismissAll: () => void;
}

const DEFAULT_DURATION_MS = 5000;

const ToastContext = createContext<UseToastReturn | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((current) => [...current, { ...options, id }]);

      // durationMs 0 significa "no se autocierra": lo usan los errores que la
      // persona debe leer antes de seguir.
      const duration = options.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const dismissAll = useCallback(() => setToasts([]), []);

  const value = useMemo(() => ({ showToast, dismissAll }), [showToast, dismissAll]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): UseToastReturn {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
}
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest ToastProvider
```

Esperado: `Tests: 9 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Toast.tsx frontend/src/components/ui/ToastProvider.tsx \
        frontend/src/components/ui/__tests__/ToastProvider.test.tsx
git commit -m "feat(ui): agrega Toast y ToastProvider

Los errores y avisos usan role alert, que el lector de pantalla anuncia sin
esperar a que el foco llegue; exito e informacion usan status y no interrumpen
lo que la persona este haciendo.

durationMs 0 deja el toast abierto hasta que se cierre a mano, para los
errores que hay que leer antes de seguir.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Select

**Files:**
- Create: `frontend/src/components/ui/Select.tsx`
- Test: `frontend/src/components/ui/__tests__/Select.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 1), `LoadingSkeleton` (Task 4)
- Produces: `Select`, `SelectProps`, `SelectOption { id: number; code: string; label: string }`

**Regla del spec que no se negocia:** `value` compara por `code`, **nunca** por `id` (SPEC-C01 §4.3, SPEC-002 INV-04). El `id` es un detalle de la base de datos y cambia entre entornos; el `code` es el contrato.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';
import type { SelectOption } from '../Select';

const OPCIONES: SelectOption[] = [
  { id: 1, code: 'ADMIN', label: 'Administrador' },
  { id: 2, code: 'COORDINADOR', label: 'Coordinador' },
  { id: 3, code: 'OPERARIO', label: 'Operario de campo' },
];

describe('Select', () => {
  it('asocia el label al control', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByLabelText('Rol')).toBeInTheDocument();
  });

  it('muestra el placeholder cuando no hay valor', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByText('Seleccione una opción')).toBeInTheDocument();
  });

  it('selecciona comparando por code, no por id', async () => {
    const onChange = jest.fn();
    render(<Select id="rol" label="Rol" value={null} onChange={onChange} options={OPCIONES} />);

    await userEvent.selectOptions(screen.getByLabelText('Rol'), 'COORDINADOR');

    expect(onChange).toHaveBeenCalledWith(OPCIONES[1]);
  });

  it('refleja el valor seleccionado por su code', () => {
    render(<Select id="rol" label="Rol" value="OPERARIO" onChange={jest.fn()} options={OPCIONES} />);
    expect(screen.getByLabelText('Rol')).toHaveValue('OPERARIO');
  });

  it('emite null cuando se limpia la seleccion', async () => {
    const onChange = jest.fn();
    render(
      <Select id="rol" label="Rol" value="ADMIN" onChange={onChange} options={OPCIONES} clearable />,
    );

    await userEvent.selectOptions(screen.getByLabelText('Rol'), '');

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('muestra un skeleton mientras cargan las opciones', () => {
    render(<Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={[]} loading />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('entra en estado error y lo asocia con aria-describedby', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES}
        errorMessage="Debe elegir un rol" />,
    );

    const select = screen.getByLabelText('Rol');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'rol-error');
  });

  it('marca el requerido para lectores de pantalla', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} required />,
    );

    expect(screen.getByLabelText(/Rol/)).toHaveAttribute('aria-required', 'true');
  });

  it('no admite cambios cuando esta deshabilitado', () => {
    render(
      <Select id="rol" label="Rol" value={null} onChange={jest.fn()} options={OPCIONES} disabled />,
    );

    expect(screen.getByLabelText('Rol')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest Select
```

Esperado: FALLA, `Cannot find module '../Select'`.

- [ ] **Step 3: Implementar Select**

```tsx
'use client';

import { cn } from '@/lib/cn';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface SelectOption {
  id: number;
  code: string;
  label: string;
}

export interface SelectProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
}

/**
 * Se apoya en el <select> nativo a propósito: trae gratis el teclado, el
 * lector de pantalla y el selector propio de cada móvil, que una lista
 * personalizada tendría que reimplementar entera y peor.
 *
 * `value` compara por `code`, nunca por `id`: el id es un detalle de la base
 * y cambia entre entornos; el code es el contrato (SPEC-002 INV-04).
 */
export function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción',
  helperText,
  errorMessage,
  disabled = false,
  loading = false,
  required = false,
  clearable = false,
}: SelectProps) {
  const hasError = Boolean(errorMessage);
  const describedBy = hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <LoadingSkeleton variant="text" className="h-10" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-action-danger">*</span>}
      </label>

      <select
        id={id}
        value={value ?? ''}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const code = event.target.value;
          onChange(code === '' ? null : (options.find((o) => o.code === code) ?? null));
        }}
        className={cn(
          'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
          'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
          hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
        )}
      >
        {/* La opción vacía siempre existe para poder mostrar el placeholder;
            solo es seleccionable si el campo admite limpiarse. */}
        <option value="" disabled={!clearable}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>

      {hasError ? (
        <p id={`${id}-error`} className="text-sm text-action-danger">{errorMessage}</p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-neutral-500">{helperText}</p>
      ) : null}
    </div>
  );
}
```

**Nota sobre `searchable`:** la prop se acepta para respetar el contrato de SPEC-C01, pero con `<select>` nativo el filtrado por texto lo aporta ya el propio navegador al teclear. No se implementa una lista personalizada: hacerlo obligaría a reimplementar teclado y accesibilidad para ganar poco. Si una feature necesita búsqueda real sobre cientos de opciones, ese es el momento de escribir un `SearchableSelect` aparte, con su propio spec.

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest Select
```

Esperado: `Tests: 9 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/Select.tsx frontend/src/components/ui/__tests__/Select.test.tsx
git commit -m "feat(ui): agrega el componente Select

Compara por code y nunca por id: el id es un detalle de la base que cambia
entre entornos, el code es el contrato (SPEC-002 INV-04).

Se apoya en el select nativo, que trae gratis el teclado, el lector de
pantalla y el selector propio de cada movil. Una lista personalizada tendria
que reimplementar todo eso y saldria peor.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: DataTable con vista de tarjetas en móvil

**Files:**
- Create: `frontend/src/components/ui/DataTable.tsx`, `frontend/src/components/ui/DataTableCards.tsx`
- Test: `frontend/src/components/ui/__tests__/DataTable.test.tsx`

**Interfaces:**
- Consumes: `cn`, `useMediaQuery` (Task 1), `Button` (Task 2), `LoadingSkeleton`, `EmptyState` (Task 4), `Card` (Task 4)
- Produces: `DataTable`, `DataTableProps<T>`, `DataTableColumn<T>`, `DataTableSort`

**Lo que exige SPEC-C01 §9.1:** por debajo de 640px **no se renderiza una tabla**, sino una lista de `Card`. Es responsabilidad del componente, no de cada feature — si cada pantalla hiciera su propia versión móvil, sería exactamente la duplicación que el spec busca evitar.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '../DataTable';
import type { DataTableColumn } from '../DataTable';

interface Fila {
  id: number;
  codigo: string;
  nombre: string;
  zona: string;
}

const FILAS: Fila[] = [
  { id: 1, codigo: 'ARB-001', nombre: 'Ficus', zona: 'Norte' },
  { id: 2, codigo: 'ARB-002', nombre: 'Molle', zona: 'Sur' },
];

const COLUMNAS: DataTableColumn<Fila>[] = [
  { key: 'codigo', header: 'Código', sortable: true },
  { key: 'nombre', header: 'Nombre', sortable: true },
  { key: 'zona', header: 'Zona', hideOnMobile: true },
];

function renderTabla(props: Partial<React.ComponentProps<typeof DataTable<Fila>>> = {}) {
  return render(
    <DataTable<Fila>
      columns={COLUMNAS}
      rows={FILAS}
      rowKey={(row) => row.id}
      totalElements={2}
      page={0}
      pageSize={20}
      onPageChange={jest.fn()}
      {...props}
    />,
  );
}

describe('DataTable (escritorio)', () => {
  beforeEach(() => {
    // useMediaQuery devuelve false sin matchMedia: la vista de escritorio.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(),
      })),
    });
  });

  it('renderiza encabezados y filas', () => {
    renderTabla();

    expect(screen.getByRole('columnheader', { name: /Código/ })).toBeInTheDocument();
    expect(screen.getByText('ARB-001')).toBeInTheDocument();
    expect(screen.getByText('Molle')).toBeInTheDocument();
  });

  it('usa render personalizado cuando la columna lo define', () => {
    renderTabla({
      columns: [
        ...COLUMNAS,
        { key: 'acciones', header: 'Acciones', render: (row) => <span>Ver {row.codigo}</span> },
      ],
    });

    expect(screen.getByText('Ver ARB-001')).toBeInTheDocument();
  });

  it('ordena al pulsar un encabezado ordenable', async () => {
    const onSortChange = jest.fn();
    renderTabla({ onSortChange });

    await userEvent.click(screen.getByRole('button', { name: /Código/ }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'codigo', direction: 'asc' });
  });

  it('invierte la direccion al pulsar la columna ya ordenada', async () => {
    const onSortChange = jest.fn();
    renderTabla({ sort: { key: 'codigo', direction: 'asc' }, onSortChange });

    await userEvent.click(screen.getByRole('button', { name: /Código/ }));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'codigo', direction: 'desc' });
  });

  it('no hace ordenable una columna que no lo declara', () => {
    renderTabla();
    expect(screen.queryByRole('button', { name: /Zona/ })).not.toBeInTheDocument();
  });

  it('muestra skeletons mientras carga y no las filas', () => {
    renderTabla({ loading: true });

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('ARB-001')).not.toBeInTheDocument();
  });

  it('muestra el estado vacio cuando no hay filas', () => {
    renderTabla({ rows: [], totalElements: 0 });

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('admite un estado vacio personalizado', () => {
    renderTabla({ rows: [], totalElements: 0, emptyState: <p>Nada por aquí</p> });

    expect(screen.getByText('Nada por aquí')).toBeInTheDocument();
  });

  it('informa el rango y el total en la paginacion', () => {
    renderTabla({ totalElements: 128, page: 1, pageSize: 20 });

    expect(screen.getByText('21–40 de 128')).toBeInTheDocument();
  });

  it('avanza y retrocede de pagina', async () => {
    const onPageChange = jest.fn();
    renderTabla({ totalElements: 128, page: 1, pageSize: 20, onPageChange });

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('deshabilita Anterior en la primera pagina', () => {
    renderTabla({ totalElements: 128, page: 0, pageSize: 20 });
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });

  it('deshabilita Siguiente en la ultima pagina', () => {
    renderTabla({ totalElements: 40, page: 1, pageSize: 20 });
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('dispara onRowClick al pulsar una fila', async () => {
    const onRowClick = jest.fn();
    renderTabla({ onRowClick });

    await userEvent.click(screen.getByText('ARB-001'));

    expect(onRowClick).toHaveBeenCalledWith(FILAS[0]);
  });
});

describe('DataTable (movil)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: true, media: query, addEventListener: jest.fn(), removeEventListener: jest.fn(),
      })),
    });
  });

  it('no renderiza una tabla: usa tarjetas', () => {
    renderTabla();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('ARB-001')).toBeInTheDocument();
  });

  it('oculta las columnas marcadas hideOnMobile', () => {
    renderTabla();

    expect(screen.queryByText('Norte')).not.toBeInTheDocument();
  });

  it('sustituye los encabezados por un selector de orden', () => {
    renderTabla({ onSortChange: jest.fn() });

    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest DataTable
```

Esperado: FALLA, `Cannot find module '../DataTable'`.

- [ ] **Step 3: Implementar la vista de tarjetas**

`DataTableCards.tsx`:

```tsx
'use client';

import { Card } from './Card';
import type { DataTableColumn } from './DataTable';

interface DataTableCardsProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

/**
 * Vista de móvil de DataTable (SPEC-C01 §9.1): una tabla de datos no cabe en
 * 375px sin scroll horizontal, y ese scroll es una mala experiencia táctil.
 */
export function DataTableCards<T>({ columns, rows, rowKey, onRowClick }: DataTableCardsProps<T>) {
  const visibles = columns.filter((column) => !column.hideOnMobile);
  const [titulo, ...resto] = visibles;

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Card key={rowKey(row)} onClick={onRowClick ? () => onRowClick(row) : undefined}>
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-neutral-900">
              {titulo.render ? titulo.render(row) : String((row as Record<string, unknown>)[titulo.key] ?? '')}
            </span>
          </div>

          <dl className="mt-2 flex flex-col gap-1">
            {resto.map((column) => (
              <div key={column.key} className="flex justify-between gap-2 text-sm">
                <dt className="text-neutral-500">{column.header}</dt>
                <dd className="text-neutral-700">
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? '')}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implementar DataTable**

`DataTable.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from './Button';
import { DataTableCards } from './DataTableCards';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  totalElements: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  sort?: DataTableSort;
  onSortChange?: (sort: DataTableSort) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
}

function cellValue<T>(row: T, column: DataTableColumn<T>): ReactNode {
  if (column.render) return column.render(row);
  return String((row as Record<string, unknown>)[column.key] ?? '');
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  totalElements,
  page,
  pageSize,
  onPageChange,
  sort,
  onSortChange,
  loading = false,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  const isMobile = useMediaQuery('(max-width: 639px)');

  const desde = page * pageSize + 1;
  const hasta = Math.min((page + 1) * pageSize, totalElements);
  const esUltimaPagina = hasta >= totalElements;

  function toggleSort(key: string) {
    if (!onSortChange) return;
    // Pulsar la columna ya ordenada invierte el sentido; otra columna empieza asc.
    const direction = sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, direction });
  }

  if (loading) {
    return <LoadingSkeleton variant="table-row" count={5} />;
  }

  if (rows.length === 0) {
    return <>{emptyState ?? <EmptyState title="Sin resultados" description="No hay datos para mostrar." />}</>;
  }

  return (
    <div className="flex flex-col gap-3">
      {isMobile && onSortChange && (
        <div className="flex flex-col gap-1">
          <label htmlFor="datatable-sort" className="text-sm font-medium text-neutral-700">
            Ordenar por
          </label>
          <select
            id="datatable-sort"
            value={sort?.key ?? ''}
            onChange={(event) => toggleSort(event.target.value)}
            className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base"
          >
            {columns.filter((c) => c.sortable).map((column) => (
              <option key={column.key} value={column.key}>{column.header}</option>
            ))}
          </select>
        </div>
      )}

      {isMobile ? (
        <DataTableCards columns={columns} rows={rows} rowKey={rowKey} onRowClick={onRowClick} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full border-collapse bg-neutral-0">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} scope="col"
                    className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-neutral-200 last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-neutral-50',
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-neutral-700">
                      {cellValue(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Anterior/Siguiente en vez de números de página: en una pantalla
          angosta la lista de números no cabe ni es cómoda de tocar. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-neutral-500">{`${desde}–${hasta} de ${totalElements}`}</span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0}
            onClick={() => onPageChange(page - 1)}>
            Anterior
          </Button>
          <Button variant="secondary" size="sm" disabled={esUltimaPagina}
            onClick={() => onPageChange(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest DataTable
```

Esperado: `Tests: 16 passed`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/DataTable.tsx frontend/src/components/ui/DataTableCards.tsx \
        frontend/src/components/ui/__tests__/DataTable.test.tsx
git commit -m "feat(ui): agrega DataTable con vista de tarjetas en movil

Por debajo de 640px no renderiza una tabla sino una lista de Card: una tabla
de datos no cabe en 375px sin scroll horizontal, y ese scroll es una mala
experiencia tactil. El cambio lo decide el componente, no cada pantalla, que
es como acabarian existiendo cinco versiones moviles distintas de lo mismo.

La paginacion usa Anterior y Siguiente con el rango en texto en vez de una
lista de numeros, que en una pantalla angosta ni cabe ni es comoda de tocar.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: DateRangePicker y barril de exportaciones

**Files:**
- Create: `frontend/src/components/forms/DateRangePicker.tsx`
- Create: `frontend/src/components/ui/index.ts`
- Test: `frontend/src/components/forms/__tests__/DateRangePicker.test.tsx`
- Modify: `frontend/package.json` (añadir `date-fns`)

**Interfaces:**
- Consumes: `cn` (Task 1)
- Produces: `DateRangePicker`, `DateRangePickerProps`, `DateRange { from: string | null; to: string | null }`, `DateRangePreset`; y el barril `@/components/ui` que reexporta todos los componentes anteriores

- [ ] **Step 1: Instalar date-fns**

```bash
cd frontend && npm install date-fns@4.1.0
```

SPEC-C01 §2.4 la exige para formateo de fechas. Se fija la versión exacta para que el `package-lock.json` no derive entre máquinas.

- [ ] **Step 2: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker', () => {
  it('renderiza los dos campos con sus etiquetas', () => {
    render(
      <DateRangePicker label="Período" value={{ from: null, to: null }} onChange={jest.fn()} />,
    );

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('emite el rango completo al cambiar la fecha inicial', async () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker label="Período" value={{ from: null, to: '2026-09-30' }} onChange={onChange} />,
    );

    await userEvent.type(screen.getByLabelText('Desde'), '2026-09-01');

    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('avisa cuando la fecha final es anterior a la inicial', () => {
    render(
      <DateRangePicker label="Período" value={{ from: '2026-09-30', to: '2026-09-01' }}
        onChange={jest.fn()} />,
    );

    expect(screen.getByText('La fecha final no puede ser anterior a la inicial')).toBeInTheDocument();
  });

  it('no avisa cuando el rango es valido', () => {
    render(
      <DateRangePicker label="Período" value={{ from: '2026-09-01', to: '2026-09-30' }}
        onChange={jest.fn()} />,
    );

    expect(
      screen.queryByText('La fecha final no puede ser anterior a la inicial'),
    ).not.toBeInTheDocument();
  });

  it('muestra el error externo que le pasen', () => {
    render(
      <DateRangePicker label="Período" value={{ from: null, to: null }} onChange={jest.fn()}
        errorMessage="El período es obligatorio" />,
    );

    expect(screen.getByText('El período es obligatorio')).toBeInTheDocument();
  });

  it('aplica un preset al pulsarlo', async () => {
    const onChange = jest.fn();
    const preset = { label: 'Este mes', range: { from: '2026-09-01', to: '2026-09-30' } };
    render(
      <DateRangePicker label="Período" value={{ from: null, to: null }} onChange={onChange}
        presets={[preset]} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Este mes' }));

    expect(onChange).toHaveBeenCalledWith(preset.range);
  });

  it('deshabilita ambos campos cuando corresponde', () => {
    render(
      <DateRangePicker label="Período" value={{ from: null, to: null }} onChange={jest.fn()} disabled />,
    );

    expect(screen.getByLabelText('Desde')).toBeDisabled();
    expect(screen.getByLabelText('Hasta')).toBeDisabled();
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest DateRangePicker
```

Esperado: FALLA, `Cannot find module '../DateRangePicker'`.

- [ ] **Step 4: Implementar DateRangePicker**

```tsx
'use client';

import { cn } from '@/lib/cn';

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface DateRangePreset {
  label: string;
  range: DateRange;
}

export interface DateRangePickerProps {
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  minDate?: string;
  maxDate?: string;
  errorMessage?: string;
  disabled?: boolean;
}

const RANGO_INVERTIDO = 'La fecha final no puede ser anterior a la inicial';

/**
 * Usa dos <input type="date"> nativos: cada navegador y cada móvil aporta su
 * propio calendario, ya accesible y localizado, que un calendario propio
 * tendría que reimplementar entero.
 */
export function DateRangePicker({
  label,
  value,
  onChange,
  presets,
  minDate,
  maxDate,
  errorMessage,
  disabled = false,
}: DateRangePickerProps) {
  // El rango invertido lo detecta el componente; un error externo tiene
  // prioridad porque viene de una regla de negocio que él no conoce.
  const rangoInvertido =
    value.from !== null && value.to !== null && value.to < value.from;
  const mensaje = errorMessage ?? (rangoInvertido ? RANGO_INVERTIDO : undefined);
  const hasError = Boolean(mensaje);

  const inputClass = cn(
    'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
    'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
    'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
    hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
  );

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="text-sm font-medium text-neutral-700">{label}</legend>

      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.range)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date-range-from" className="text-xs text-neutral-500">Desde</label>
          <input
            id="date-range-from"
            type="date"
            value={value.from ?? ''}
            min={minDate}
            max={maxDate}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'date-range-error' : undefined}
            onChange={(event) => onChange({ from: event.target.value || null, to: value.to })}
            className={inputClass}
          />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date-range-to" className="text-xs text-neutral-500">Hasta</label>
          <input
            id="date-range-to"
            type="date"
            value={value.to ?? ''}
            min={value.from ?? minDate}
            max={maxDate}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? 'date-range-error' : undefined}
            onChange={(event) => onChange({ from: value.from, to: event.target.value || null })}
            className={inputClass}
          />
        </div>
      </div>

      {mensaje && (
        <p id="date-range-error" className="text-sm text-action-danger">{mensaje}</p>
      )}
    </fieldset>
  );
}
```

- [ ] **Step 5: Crear el barril de exportaciones**

`frontend/src/components/ui/index.ts`:

```typescript
// Punto de entrada único del design system: las pantallas importan de aquí,
// nunca del archivo suelto de cada componente.
export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { Toast } from './Toast';
export type { ToastData, ToastOptions, ToastVariant } from './Toast';

export { ToastProvider, useToast } from './ToastProvider';
export type { UseToastReturn } from './ToastProvider';

export { DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps, DataTableSort } from './DataTable';

export { Card } from './Card';
export type { CardProps } from './Card';

export { LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonProps } from './LoadingSkeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Badge } from './Badge';
export type { BadgeColor, BadgeProps } from './Badge';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { UrgencyBadge } from './UrgencyBadge';
export type { UrgencyBadgeProps, UrgencyCode } from './UrgencyBadge';
```

- [ ] **Step 6: Ejecutar la suite completa y el typecheck**

```bash
cd frontend && npx jest && npx tsc --noEmit
```

Esperado: todos los tests en verde (los 8 previos más los de las tareas 1–10) y typecheck limpio.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/forms/ frontend/src/components/ui/index.ts \
        frontend/package.json frontend/package-lock.json
git commit -m "feat(ui): agrega DateRangePicker y el barril del design system

Usa dos input type=date nativos: cada navegador y cada movil aporta su propio
calendario, ya accesible y localizado, que uno propio tendria que rehacer.

El componente detecta por si mismo el rango invertido, pero un errorMessage
externo tiene prioridad: viene de una regla de negocio que el no conoce.

El barril deja que las pantallas importen de @/components/ui en vez de conocer
la ruta de cada archivo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Montar los providers en el layout raíz

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Test: `frontend/src/app/__tests__/layout.test.tsx`

**Interfaces:**
- Consumes: `AuthProvider` (ya existe de SPEC-001), `ToastProvider` (Task 7)
- Produces: `AuthProvider` y `ToastProvider` disponibles en toda la aplicación

**Por qué es su propia tarea:** hasta ahora `AuthProvider` existe pero **nadie lo monta**, así que `useAuth()` lanzaría el error de "fuera del provider" en cualquier pantalla. Sin este paso, la Task 12 no puede funcionar.

- [ ] **Step 1: Leer el layout actual**

```bash
cat frontend/src/app/layout.tsx
```

Conserva lo que ya haya (metadata, fuentes, `globals.css`): esta tarea solo envuelve el `children`, no rehace el layout.

- [ ] **Step 2: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui';
import { Providers } from '../providers';

function Sonda() {
  // Si los providers no están montados, estos hooks lanzan.
  const { isLoading } = useAuth();
  const { showToast } = useToast();
  return <p>{`listo:${typeof showToast === 'function'}:${isLoading}`}</p>;
}

describe('Providers', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, message: 'Invalid or expired token', data: null }),
    }) as unknown as typeof fetch;
  });

  it('expone la sesion y los toasts a los componentes hijos', () => {
    render(<Providers><Sonda /></Providers>);

    expect(screen.getByText(/listo:true/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest layout
```

Esperado: FALLA, `Cannot find module '../providers'`.

- [ ] **Step 4: Crear el componente de providers**

`frontend/src/app/providers.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui';

/**
 * Los providers viven en su propio archivo de cliente para que layout.tsx
 * siga siendo un Server Component: marcarlo entero con 'use client' obligaría
 * a que toda la aplicación se renderice en el cliente.
 *
 * AuthProvider va por fuera porque ToastProvider no depende de la sesión,
 * pero cualquier pantalla que muestre un toast al fallar el login sí necesita
 * ambos, y este orden hace que los dos estén disponibles a la vez.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 5: Envolver el layout**

En `frontend/src/app/layout.tsx`, importar `Providers` y envolver el contenido del `<body>`, conservando todo lo demás:

```tsx
import { Providers } from './providers';

// ... el resto del archivo se mantiene igual ...

// Dentro del return, el body pasa de:
//   <body className={...}>{children}</body>
// a:
//   <body className={...}><Providers>{children}</Providers></body>
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest layout && npx tsc --noEmit
```

Esperado: el test en verde y typecheck limpio.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/providers.tsx frontend/src/app/layout.tsx \
        frontend/src/app/__tests__/layout.test.tsx
git commit -m "feat(frontend): monta AuthProvider y ToastProvider en el layout raiz

AuthProvider existia desde SPEC-001 pero nadie lo montaba: cualquier pantalla
que llamara a useAuth habria lanzado el error de estar fuera del provider.

Viven en su propio archivo de cliente para que layout.tsx siga siendo un
Server Component; marcarlo entero con use client obligaria a renderizar toda
la aplicacion en el cliente.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Formulario de login

**Files:**
- Create: `frontend/src/components/auth/LoginForm.tsx`
- Create: `frontend/src/app/login/page.tsx`
- Test: `frontend/src/components/auth/__tests__/LoginForm.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Card` (Tasks 2–4), `useAuth` (ya existe), `ApiError` (ya existe)
- Produces: `LoginForm`; la ruta `/login`

**Lo que fija SPEC-001 §7.1:** tarjeta centrada de máximo 400px en escritorio, ancho completo en móvil; `Input` de email, `Input` de contraseña sin toggle de visibilidad, `Button` primario de ancho completo; el error se muestra **bajo el formulario en rojo, no como `Toast`** — es un error del propio formulario, no una notificación transitoria.

**Los tres errores reales que devuelve el backend** (verificados contra la implementación de SPEC-001):

| Situación | Estado | `message` de la API | Qué mostrar |
|---|---|---|---|
| Credenciales inválidas, cuenta inexistente o desactivada | 401 | `Invalid credentials` | "Correo o contraseña incorrectos" |
| Demasiados intentos | 429 | `Too many failed attempts. Try again later` | "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo." |
| Sin red | 0 | `Sin conexión. Verifique su red.` | El mismo mensaje |

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/api';
import { LoginForm } from '../LoginForm';

const login = jest.fn();
const mockAuth = { user: null, isLoading: false, login, logout: jest.fn() };

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    login.mockResolvedValue(undefined);
  });

  async function completarFormulario(correo = 'admin@pucp.edu.pe', clave = 'Hesperides2026') {
    await userEvent.type(screen.getByLabelText(/Correo/), correo);
    await userEvent.type(screen.getByLabelText(/Contraseña/), clave);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  }

  it('renderiza los dos campos y el boton', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/Correo/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('oculta la contrasena mientras se escribe', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Contraseña/)).toHaveAttribute('type', 'password');
  });

  it('envia las credenciales y redirige al inicio', async () => {
    render(<LoginForm />);

    await completarFormulario();

    expect(login).toHaveBeenCalledWith('admin@pucp.edu.pe', 'Hesperides2026');
    expect(push).toHaveBeenCalledWith('/');
  });

  it('no envia el formulario con campos vacios', async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
  });

  it('valida el formato del correo antes de llamar a la API', async () => {
    render(<LoginForm />);

    await completarFormulario('esto-no-es-un-correo');

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument();
  });

  it('traduce el 401 a un mensaje entendible', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  });

  it('explica el bloqueo por intentos cuando el backend responde 429', async () => {
    login.mockRejectedValue(new ApiError(429, 'Too many failed attempts. Try again later'));
    render(<LoginForm />);

    await completarFormulario();

    expect(
      await screen.findByText('Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.'),
    ).toBeInTheDocument();
  });

  it('muestra el fallo de red tal cual', async () => {
    login.mockRejectedValue(new ApiError(0, 'Sin conexión. Verifique su red.'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByText('Sin conexión. Verifique su red.')).toBeInTheDocument();
  });

  it('el error se anuncia como alerta, no como toast', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('limpia el error anterior al reintentar', async () => {
    login.mockRejectedValueOnce(new ApiError(401, 'Invalid credentials'));
    render(<LoginForm />);

    await completarFormulario();
    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();

    login.mockResolvedValue(undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.queryByText('Correo o contraseña incorrectos')).not.toBeInTheDocument();
  });

  it('deshabilita el boton mientras la peticion esta en curso', async () => {
    let resolver: () => void = () => {};
    login.mockReturnValue(new Promise<void>((resolve) => { resolver = resolve; }));
    render(<LoginForm />);

    await completarFormulario();

    expect(screen.getByRole('button', { name: /Iniciar sesión/ })).toBeDisabled();

    resolver();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest LoginForm
```

Esperado: FALLA, `Cannot find module '../LoginForm'`.

- [ ] **Step 3: Implementar LoginForm**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Traduce el error de la API a algo que la persona pueda entender y accionar.
 * Los `message` del backend vienen en inglés técnico y son deliberadamente
 * genéricos (SPEC-001 §9: no revelan si el correo existe).
 */
function mensajeDeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }

  if (error.status === 401) return 'Correo o contraseña incorrectos';
  if (error.status === 429) {
    return 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';
  }
  if (error.status === 0) return error.message;
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [passwordError, setPasswordError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validar(): boolean {
    const errorCorreo = !email.trim()
      ? 'Ingresa tu correo'
      : !EMAIL_PATTERN.test(email.trim())
        ? 'Ingresa un correo válido'
        : undefined;
    const errorClave = password ? undefined : 'Ingresa tu contraseña';

    setEmailError(errorCorreo);
    setPasswordError(errorClave);
    return !errorCorreo && !errorClave;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(undefined);

    if (!validar()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (error) {
      setFormError(mensajeDeError(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-neutral-500">Gestión de Áreas Verdes</p>
        </div>

        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          errorMessage={emailError}
          disabled={isSubmitting}
          required
          placeholder="usuario@pucp.edu.pe"
        />

        <Input
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          errorMessage={passwordError}
          disabled={isSubmitting}
          required
        />

        {/* Un error de credenciales pertenece al formulario, no es una
            notificación pasajera: se queda debajo hasta que se reintente
            (SPEC-001 §7.1), en vez de desaparecer solo como un Toast. */}
        {formError && (
          <p role="alert" className="rounded-md bg-urgency-critical-bg px-3 py-2 text-sm text-action-danger">
            {formError}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
          Iniciar sesión
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Crear la página de login**

`frontend/src/app/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Iniciar sesión · Hesperides',
};

export default function LoginPage() {
  return (
    // Ancho completo con padding en móvil; tarjeta centrada de 400px máximo
    // en tablet y escritorio (SPEC-001 §7.1).
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-[400px]">
        <LoginForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Ejecutar y verificar que pasa**

```bash
cd frontend && npx jest LoginForm && npx tsc --noEmit
```

Esperado: `Tests: 11 passed` y typecheck limpio.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/auth/ frontend/src/app/login/
git commit -m "feat(auth): agrega la pantalla de login

Traduce los tres errores que devuelve el backend a mensajes accionables: 401
a credenciales incorrectas, 429 al bloqueo por intentos con la indicacion de
esperar, y el fallo de red tal cual.

El error se queda bajo el formulario con role alert en vez de aparecer como
Toast: pertenece al formulario que la persona esta corrigiendo, no es una
notificacion pasajera que deba desvanecerse sola.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Guard de rutas y cierre de sesión

**Files:**
- Create: `frontend/src/components/auth/RouteGuard.tsx`
- Modify: `frontend/src/app/page.tsx`
- Test: `frontend/src/components/auth/__tests__/RouteGuard.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (ya existe), `LoadingSkeleton` (Task 4), `Button` (Task 2)
- Produces: `RouteGuard` con prop `children`

**Lo que resuelve:** sin sesión, cualquier ruta protegida redirige a `/login`. Con sesión, `/login` redirige al inicio — quien ya entró no debería poder volver al formulario. Mientras se comprueba la sesión (`isLoading`), no se renderiza ninguna de las dos cosas: hacerlo provoca el parpadeo de mostrar el login un instante a alguien que sí tiene sesión.

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { render, screen } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';

const push = jest.fn();
let mockAuth: {
  user: { fullName: string } | null;
  isLoading: boolean;
  login: jest.Mock;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
}));

describe('RouteGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = { user: null, isLoading: false, login: jest.fn(), logout: jest.fn() };
  });

  it('mientras comprueba la sesion no muestra ni contenido ni redirige', () => {
    mockAuth.isLoading = true;
    render(<RouteGuard><p>Contenido protegido</p></RouteGuard>);

    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('sin sesion redirige a login y no muestra el contenido', () => {
    render(<RouteGuard><p>Contenido protegido</p></RouteGuard>);

    expect(push).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
  });

  it('con sesion muestra el contenido y no redirige', () => {
    mockAuth.user = { fullName: 'Ana Torres' };
    render(<RouteGuard><p>Contenido protegido</p></RouteGuard>);

    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('en modo guest con sesion redirige al inicio', () => {
    mockAuth.user = { fullName: 'Ana Torres' };
    render(<RouteGuard mode="guest"><p>Formulario de login</p></RouteGuard>);

    expect(push).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Formulario de login')).not.toBeInTheDocument();
  });

  it('en modo guest sin sesion muestra el contenido', () => {
    render(<RouteGuard mode="guest"><p>Formulario de login</p></RouteGuard>);

    expect(screen.getByText('Formulario de login')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd frontend && npx jest RouteGuard
```

Esperado: FALLA, `Cannot find module '../RouteGuard'`.

- [ ] **Step 3: Implementar RouteGuard**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export type RouteGuardMode = 'protected' | 'guest';

export interface RouteGuardProps {
  children: ReactNode;
  mode?: RouteGuardMode;
}

/**
 * `protected`: sin sesión, a /login. `guest`: con sesión, al inicio — quien ya
 * entró no tiene nada que hacer en el formulario de login.
 *
 * Mientras `isLoading` es true no se renderiza ninguna de las dos ramas: si se
 * mostrara el login durante la comprobación, cualquiera con sesión válida
 * vería parpadear el formulario en cada recarga.
 */
export function RouteGuard({ children, mode = 'protected' }: RouteGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const debeRedirigir = !isLoading && (mode === 'protected' ? user === null : user !== null);
  const destino = mode === 'protected' ? '/login' : '/';

  useEffect(() => {
    if (debeRedirigir) {
      router.push(destino);
    }
  }, [debeRedirigir, destino, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <LoadingSkeleton variant="card" className="max-w-md" />
      </div>
    );
  }

  if (debeRedirigir) {
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Aplicar el guard a la página de inicio**

Reemplazar `frontend/src/app/page.tsx` por una página que exija sesión y permita cerrarla, conservando el nombre del proyecto:

```tsx
'use client';

import { Button, Card } from '@/components/ui';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useAuth } from '@/hooks/useAuth';

function Inicio() {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-neutral-50 p-4">
      <div className="mx-auto max-w-3xl">
        <Card
          title={`Hola, ${user?.fullName ?? ''}`}
          actions={<Button variant="secondary" size="sm" onClick={logout}>Cerrar sesión</Button>}
        >
          <p className="text-sm text-neutral-700">
            Sesión iniciada como <strong>{user?.email}</strong> con el rol{' '}
            <strong>{user?.role.label}</strong>.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Los módulos de gestión aparecerán aquí conforme se implementen.
          </p>
        </Card>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <RouteGuard>
      <Inicio />
    </RouteGuard>
  );
}
```

**Atención:** `frontend/src/app/__tests__/page.test.tsx` ya existe y prueba la página anterior del scaffold. Al cambiar la página ese test se rompe, así que hay que sustituirlo por completo por este:

```tsx
import { render, screen } from '@testing-library/react';
import HomePage from '../page';

const logout = jest.fn();
let mockAuth: {
  user: { email: string; fullName: string; role: { label: string } } | null;
  isLoading: boolean;
  login: jest.Mock;
  logout: jest.Mock;
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = {
      user: {
        email: 'admin@pucp.edu.pe',
        fullName: 'Administrador Hesperides',
        role: { label: 'Administrador' },
      },
      isLoading: false,
      login: jest.fn(),
      logout,
    };
  });

  it('saluda a la persona con sesion iniciada', () => {
    render(<HomePage />);

    expect(screen.getByText(/Administrador Hesperides/)).toBeInTheDocument();
    expect(screen.getByText('admin@pucp.edu.pe')).toBeInTheDocument();
  });

  it('ofrece cerrar sesion', () => {
    render(<HomePage />);

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('sin sesion no muestra el contenido: el guard lo bloquea', () => {
    mockAuth.user = null;
    render(<HomePage />);

    expect(screen.queryByText('admin@pucp.edu.pe')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Aplicar el guest guard a la página de login**

En `frontend/src/app/login/page.tsx`, envolver el formulario:

```tsx
import { RouteGuard } from '@/components/auth/RouteGuard';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Iniciar sesión · Hesperides',
};

export default function LoginPage() {
  return (
    <RouteGuard mode="guest">
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-[400px]">
          <LoginForm />
        </div>
      </main>
    </RouteGuard>
  );
}
```

- [ ] **Step 6: Ejecutar la suite completa**

```bash
cd frontend && npx jest && npx tsc --noEmit
```

Esperado: todo en verde. Si `page.test.tsx` falla, actualizarlo según el aviso del Step 4 — no borrarlo.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/auth/ frontend/src/app/page.tsx frontend/src/app/login/page.tsx \
        frontend/src/app/__tests__/
git commit -m "feat(auth): agrega el guard de rutas y el cierre de sesion

Sin sesion, toda ruta protegida lleva a /login; con sesion, /login lleva al
inicio, porque quien ya entro no tiene nada que hacer en el formulario.

Mientras se comprueba la sesion no se renderiza ninguna de las dos ramas: si
se mostrara el login durante la comprobacion, cualquiera con sesion valida
veria parpadear el formulario en cada recarga.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Verificación en el navegador

**Files:** ninguno — es una tarea de verificación manual.

**Por qué existe:** los tests con jsdom no prueban que la cookie `httpOnly` viaje, que el refresh encolado funcione contra el backend real, ni que la tabla se vea bien en 375px. Eso solo se ve en un navegador.

- [ ] **Step 1: Levantar el stack completo**

```bash
docker compose up -d --build
sleep 40
curl -s http://localhost:8080/api/v1/health
```

Esperado: `{"data":{"status":"UP"},...}`.

- [ ] **Step 2: Login correcto**

Abrir `http://localhost:3000/login` y entrar con `admin@pucp.edu.pe` / `Hesperides2026`.

Esperado: redirige al inicio y muestra "Hola, Administrador Hesperides" con el rol Administrador.

- [ ] **Step 3: Verificar la cookie en DevTools**

En Application → Cookies → `http://localhost:3000`, comprobar que `refresh_token` tiene **HttpOnly** marcado. En la consola, `document.cookie` **no** debe mostrarlo (SPEC-001 CA-02).

- [ ] **Step 4: Credenciales incorrectas**

Cerrar sesión e intentar con una contraseña equivocada.

Esperado: mensaje "Correo o contraseña incorrectos" bajo el formulario, en rojo, **sin** que aparezca ningún toast.

- [ ] **Step 5: Bloqueo por fuerza bruta**

Fallar el login cinco veces seguidas con el mismo correo y probar una sexta.

Esperado: "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."

- [ ] **Step 6: Persistencia de sesión**

Con sesión iniciada, recargar la página (F5).

Esperado: sigue dentro sin volver a pedir credenciales — la cookie `httpOnly` viaja sola y `/auth/me` restaura la sesión. Durante el instante de comprobación se ve el skeleton, nunca el formulario de login.

- [ ] **Step 7: Guard de rutas**

Con sesión iniciada, navegar a mano a `http://localhost:3000/login`.

Esperado: redirige al inicio.

Cerrar sesión y navegar a `http://localhost:3000/`.

Esperado: redirige a `/login`.

- [ ] **Step 8: Responsive**

En DevTools, activar la vista de dispositivo a 375px de ancho.

Esperado: el formulario ocupa el ancho con padding, sin scroll horizontal ni texto cortado.

- [ ] **Step 9: Navegación por teclado**

Sin tocar el ratón: `Tab` recorre correo → contraseña → botón, con anillo de foco visible en cada uno, y `Enter` envía el formulario.

- [ ] **Step 10: Commit de cierre**

Si algún paso falla, corregirlo antes de este commit. Si todo pasa:

```bash
git commit --allow-empty -m "test(frontend): verifica el login en el navegador

Comprobado a mano lo que jsdom no puede: la cookie refresh_token llega con
HttpOnly y document.cookie no la ve, la sesion sobrevive a una recarga sin
mostrar el formulario un instante, el bloqueo por intentos se explica al
usuario, el guard redirige en ambos sentidos, el formulario se usa entero con
teclado y a 375px no hay scroll horizontal.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verificación de cobertura de los specs

Qué tarea implementa cada requisito:

| Requisito | Origen | Tarea |
|---|---|---|
| Tokens de color, tipografía y espaciado | SPEC-C01 §3 | Task 1 |
| `Button` | SPEC-C01 §4.1 | Task 2 |
| `Input` | SPEC-C01 §4.2 | Task 3 |
| `Select` | SPEC-C01 §4.3 | Task 8 |
| `Modal` con trampa de foco | SPEC-C01 §4.4, §8.3 | Task 6 |
| `Toast` + `ToastProvider` + `useToast` | SPEC-C01 §4.5 | Task 7 |
| `DataTable` | SPEC-C01 §4.6 | Task 9 |
| `Card` | SPEC-C01 §4.7 | Task 4 |
| `LoadingSkeleton` | SPEC-C01 §4.8 | Task 4 |
| `Badge`/`StatusBadge`/`UrgencyBadge` | SPEC-C01 §4.9 | Task 5 |
| `EmptyState` | SPEC-C01 §4.10 | Task 4 |
| `DateRangePicker` | SPEC-C01 §4.15 | Task 10 |
| Accesibilidad (labels, foco, roles, teclado) | SPEC-C01 §8 | Tasks 2–10, verificada en 14 |
| `DataTable` como tarjetas en móvil | SPEC-C01 §9.1 | Task 9 |
| Modal a pantalla completa en móvil | SPEC-C01 §9 | Task 6 |
| Pantalla de login | SPEC-001 §7.1 | Task 12 |
| Manejo del 429 por fuerza bruta | SPEC-001 §9.3 | Task 12 |
| Guard de rutas y persistencia de sesión | SPEC-001 §5.2 | Task 13 |

**Fuera de alcance de este plan, por decisión explícita:**

- `MapView`, `LocationPicker`, `PhotoUpload` y `BeforeAfterViewer` (SPEC-C01 §4.11–4.14): ninguna pantalla de este plan los usa, y son los cuatro componentes más caros. Se construyen con el spec de la feature que los pida — catastro e intervenciones —, que es cuando se sabrá qué comportamiento necesitan de verdad.
- Los componentes móviles de SPEC-C01 §5: la app móvil es fase 2.
- La gestión de usuarios (SPEC-100): necesita nueve endpoints de backend que aún no existen. Es la entrega siguiente, y empieza por ese backend.
