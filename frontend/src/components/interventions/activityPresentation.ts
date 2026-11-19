/** Shared queries keep compatible codes for incidents and historical consumers. */
export function activityStatus(code:string):string {
  return code==='COMPLETED'?'EXECUTED':code==='VALIDATED'?'FINISHED':code==='ASSIGNED'?'PLANNED':code==='OBSERVED'?'IN_PROGRESS':code;
}

export const ACTIVITY_STATUS_CODES=['PLANNED','IN_PROGRESS','EXECUTED','FINISHED','CANCELLED'] as const;
export function activityFilter(code:string):string {
  const current=activityStatus(code);
  return (ACTIVITY_STATUS_CODES as readonly string[]).includes(current)?current:'';
}

/** Readable fallback while catalog labels load or the catalog request fails. */
export function activityStatusLabel(code:string):string {
  return ({PLANNED:'Planificada',IN_PROGRESS:'En ejecución',EXECUTED:'Ejecutada',FINISHED:'Terminada',CANCELLED:'Cancelada'} as Record<string,string>)[activityStatus(code)]??code;
}
