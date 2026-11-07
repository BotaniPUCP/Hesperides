import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Las acciones principales de la pantalla, a la derecha del título. */
  actions?: ReactNode;
  /** Lo que acompaña al título debajo, como las descargas de un estándar. */
  children?: ReactNode;
}

/** El encabezado de toda pantalla: mismo título, misma superficie y mismas acciones. */
export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <header className="surface-card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="page-title">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-neutral-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
