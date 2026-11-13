import type { ReactNode } from 'react';

interface IncidentWorkspaceProps { children: ReactNode }

/** Module-local surfaces and contrast, without changing shared control defaults. */
export function IncidentWorkspace({ children }: IncidentWorkspaceProps) {
  return <div className="mx-auto max-w-6xl space-y-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-900 sm:p-7 [&>header.surface-card]:border-0 [&>header.surface-card]:bg-transparent [&>header.surface-card]:p-0 [&>header.surface-card]:shadow-none [&_.bg-brand-600]:bg-forest-700 [&_.bg-brand-600:hover]:bg-forest-800 [&_input:not([type=checkbox])]:border-neutral-500 [&_select]:border-neutral-500 [&_textarea]:border-neutral-500">
    {children}
  </div>;
}
