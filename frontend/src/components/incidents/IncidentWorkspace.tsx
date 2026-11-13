import type { ReactNode } from 'react';

interface IncidentWorkspaceProps { children: ReactNode }

/** Module-local surfaces and contrast, without changing shared control defaults. */
export function IncidentWorkspace({ children }: IncidentWorkspaceProps) {
  return <div data-incident-workspace className="mx-auto max-w-6xl space-y-5 py-2 text-[13px] leading-relaxed text-neutral-900 lg:px-4 [&>header.surface-card]:border-0 [&>header.surface-card]:bg-transparent [&>header.surface-card]:p-0 [&>header.surface-card]:shadow-none [&_.page-title]:text-[25px] sm:[&_.page-title]:text-[29px] [&_.page-title]:font-bold [&_.page-title]:tracking-tight [&_.text-lg]:text-sm [&_.text-base]:text-[13px] [&_.text-sm]:text-xs [&_.rounded-2xl]:rounded-xl [&_.shadow-xs]:shadow-none [&_label]:text-xs [&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:border-neutral-400 [&_select]:h-11 [&_select]:border-neutral-400 [&_textarea]:border-neutral-400 [&_button]:min-h-11 [&_button]:text-xs [&_button.h-12]:h-11 [&_.min-h-12]:min-h-11 [&_.bg-brand-600]:bg-forest-700 [&_.bg-brand-600:hover]:bg-forest-800 sm:[&_input:not([type=checkbox])]:h-[42px] sm:[&_select]:h-[42px] sm:[&_button]:min-h-[38px] sm:[&_button.h-12]:h-[38px] sm:[&_.min-h-12]:min-h-[38px]">
    {children}
  </div>;
}
