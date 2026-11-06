import type { InterventionSummary } from '@/lib/interventions-api';

export function elapsedTime(seconds:number):string {
  const value=Math.max(0,Math.floor(seconds));
  const days=Math.floor(value/86400),hours=Math.floor(value%86400/3600),minutes=Math.floor(value%3600/60);
  return `${days ? `${days} d ` : ''}${hours} h ${minutes} min ${value%60} s`;
}

export function ExecutionTime({work}:{work:InterventionSummary}) {
  return <div className="space-y-1 text-sm">
    <p>Inicio de ejecución: {work.startedAt ? new Date(work.startedAt).toLocaleString('es-PE') : 'Sin iniciar'}</p>
    <p>Fin de ejecución: {work.completedAt ? new Date(work.completedAt).toLocaleString('es-PE') : work.startedAt ? 'En curso' : 'Sin finalizar'}</p>
    <p>Tiempo transcurrido: {work.elapsedSeconds != null ? elapsedTime(work.elapsedSeconds) : work.startedAt ? 'En curso' : 'Sin iniciar'}</p>
    <p className="text-neutral-500">Incluye pausas y subsanaciones durante la ejecución. La espera de aprobación no aumenta este tiempo.</p>
  </div>;
}
