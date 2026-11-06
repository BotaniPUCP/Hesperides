'use client';

import { useState } from 'react';
import type { LinkedIncidentIntervention } from '@shared/types';
import { Button,Input,Select } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';

export interface CaptureWorkLink { work: LinkedIncidentIntervention; purposeCode: string }

export function IncidentCaptureLinks({ value,onChange,disabled,scopeKey }: {
  value: CaptureWorkLink[];onChange: (value: CaptureWorkLink[]) => void;disabled: boolean;
  scopeKey: string;
}) {
  const [text,setText]=useState('');
  const [query,setQuery]=useState('');
  const [page,setPage]=useState(0);
  const [revision,setRevision]=useState(0);
  const [active,setActive]=useState(false);
  const request=useRequest(active ? `capture-work:${scopeKey}:${query}:${page}:${revision}` : null,() => incidentsApi.availableInterventions(query,page));
  return <details className="rounded-md border border-neutral-200 p-3" onToggle={(e) => {if(e.currentTarget.open)setActive(true);}}>
    <summary className="min-h-12 cursor-pointer py-3 font-medium text-brand-700">Relacionar intervenciones existentes (opcional){value.length ? ` · ${value.length}` : ''}</summary>
    <div className="space-y-3">
      <p className="text-sm text-neutral-700">Relaciona uno o varios trabajos que ya existan y puedas consultar. También puedes hacerlo después de enviar el reporte.</p>
      <Input id="capture-work-search" label="Código o descripción de intervención" size="lg" value={text} onChange={setText} disabled={disabled} />
      <Button type="button" size="lg" variant="secondary" disabled={disabled || request.loading} onClick={() => {setQuery(text.trim());setPage(0);setRevision(v => v+1);}}>Buscar trabajos existentes</Button>
      {request.errorMessage && <p role="alert" className="text-sm text-action-danger">{request.errorMessage}</p>}
      <Select id="capture-work" label="Añadir intervención relacionada" size="lg" clearable value={null} disabled={disabled || request.loading}
        options={(request.data?.content ?? []).filter(w => !value.some(l => l.work.id===w.id)).map(w => ({id:w.id,code:String(w.id),label:`${w.code} · ${w.description ?? ''}`}))}
        onChange={(item) => {const work=request.data?.content.find(w => w.id===item?.id);if(work)onChange([...value,{work,purposeCode:'MITIGATION'}]);}} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="lg" variant="ghost" disabled={disabled || page===0} onClick={() => setPage(v => v-1)}>Trabajos anteriores</Button>
        <span className="text-sm">Página {page+1}</span>
        <Button type="button" size="lg" variant="ghost" disabled={disabled || !request.data || page+1>=request.data.page.totalPages} onClick={() => setPage(v => v+1)}>Más trabajos</Button>
      </div>
      <ul className="space-y-3">{value.map(link => <li key={link.work.id} className="space-y-2 rounded-md border border-neutral-200 p-3">
        <p className="break-words text-sm">{link.work.code} · {link.work.description}</p>
        <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={link.purposeCode==='PREVENTION'} disabled={disabled}
          onChange={(e) => onChange(value.map(l => l.work.id===link.work.id ? {...l,purposeCode:e.target.checked ? 'PREVENTION' : 'MITIGATION'} : l))} />Propósito de prevención / mejora</label>
        <Button type="button" size="lg" variant="ghost" disabled={disabled} onClick={() => onChange(value.filter(l => l.work.id!==link.work.id))}>Quitar selección {link.work.code}</Button>
      </li>)}</ul>
    </div>
  </details>;
}
