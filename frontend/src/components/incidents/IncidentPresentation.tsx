import type { ReactNode } from 'react';

interface IncidentPanelProps { title: string; aside?: ReactNode; children: ReactNode; className?: string }

export function IncidentPanel({ title, aside, children, className = '' }: IncidentPanelProps) {
  return <section className={`overflow-hidden rounded-[10px] border border-neutral-200 bg-neutral-0 ${className}`}>
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
      <h2 className="text-[14px] font-semibold tracking-tight text-neutral-900">{title}</h2>{aside}
    </header>
    {children}
  </section>;
}

export function IncidentIcon({ name }: { name: 'report' | 'clock' | 'work' | 'check' | 'plus' | 'arrow' }) {
  const paths = { report: 'M8 4H5v17h14V4h-3M9 3h6v4H9zM8 12h8M8 16h5', clock: 'M12 7v5l3 2',
    work: 'm14 6 4-3c3 4 1 8-4 8L6 20l-3-3 9-8', check: 'm5 12 4 4L19 6', plus: 'M12 5v14M5 12h14', arrow: 'm9 5 7 7-7 7' };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {name === 'clock' && <circle cx="12" cy="12" r="9" />}<path d={paths[name]} />
  </svg>;
}

interface IncidentStatProps { label: string; value: number; caption: string; tone?: 'primary' | 'amber' | 'blue' | 'green'; icon: 'report' | 'clock' | 'work' | 'check' }
export function IncidentStat({ label, value, caption, tone, icon }: IncidentStatProps) {
  const ink = { primary: 'text-white', amber: 'text-urgency-medium-fg', blue: 'text-status-in-progress-fg', green: 'text-status-resolved-fg' };
  return <div className={`rounded-[10px] border px-5 py-5 ${tone === 'primary' ? 'border-forest-900 bg-forest-900 text-white' : 'border-neutral-200 bg-neutral-0 text-neutral-900'}`}>
    <p className={`flex items-center justify-between gap-2 text-xs ${tone === 'primary' ? 'text-forest-100' : 'text-neutral-600'}`}>{label}<IncidentIcon name={icon} /></p>
    <p className={`mb-1 mt-3 text-[34px] font-semibold leading-tight tracking-tight tabular-nums ${tone ? ink[tone] : ''}`}>{value}</p>
    <p className={`text-[11px] ${tone === 'primary' ? 'text-forest-100' : 'text-neutral-600'}`}>{caption}</p>
  </div>;
}
