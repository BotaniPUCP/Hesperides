'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { IrrigationTurn, IrrigationZone } from '@shared/types/irrigation';
import { Button, Card, EmptyState, LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { irrigationApi } from '@/lib/irrigation-api';
import { IrrigationMapPicker } from './IrrigationMapPicker';

const FIELD = 'h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-600';
const ALL = 'ALL';

function dateLocal(day: Date) {
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

type SectionsBySector = Record<number, IrrigationZone[]>;

export function IrrigationTurnsScreen() {
  const { user } = useAuth();
  const isSupervisor = user?.role?.code === 'SUPERVISOR';
  const [sectors, setSectors] = useState<IrrigationZone[]>([]);
  const [sectionsBySector, setSectionsBySector] = useState<SectionsBySector>({});
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [scope, setScope] = useState(ALL);
  const [historySector, setHistorySector] = useState(ALL);
  const [search, setSearch] = useState('');
  const [turns, setTurns] = useState<IrrigationTurn[]>([]);
  const [date, setDate] = useState(() => dateLocal(new Date()));
  const [startedAt, setStartedAt] = useState('');
  const [finishedAt, setFinishedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 15); return dateLocal(d); });
  const [to, setTo] = useState(() => dateLocal(new Date()));
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingTurns, setLoadingTurns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    setLoadingSectors(true);
    irrigationApi.sectors().then((data) => {
      if (!live) return;
      setSectors(data);
      setScope(data.length === 1 ? String(data[0].id) : ALL);
      setHistorySector(data.length === 1 ? String(data[0].id) : ALL);
    }).catch(() => { if (live) setMessage({ kind: 'error', text: 'No se pudieron cargar tus sectores.' }); })
      .finally(() => { if (live) setLoadingSectors(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    if (!isSupervisor || sectors.length === 0) {
      setSectionsBySector({});
      setLoadingSections(false);
      return;
    }
    setLoadingSections(true);
    Promise.all(sectors.map((sector) => irrigationApi.sections(sector.id)))
      .then((groups) => {
        if (!live) return;
        const bySector: SectionsBySector = {};
        sectors.forEach((sector, i) => { bySector[sector.id] = groups[i]; });
        setSectionsBySector(bySector);
      })
      .catch(() => { if (live) setMessage({ kind: 'error', text: 'No se pudieron cargar las secciones. Actualiza la página antes de registrar.' }); })
      .finally(() => { if (live) setLoadingSections(false); });
    return () => { live = false; };
  }, [isSupervisor, sectors]);

  useEffect(() => {
    let live = true;
    setLoadingTurns(true);
    irrigationApi.turns(from, to, historySector !== ALL ? Number(historySector) : undefined)
      .then((data) => { if (live) setTurns(data); })
      .catch(() => { if (live) setMessage({ kind: 'error', text: 'No se pudieron consultar los turnos.' }); })
      .finally(() => { if (live) setLoadingTurns(false); });
    return () => { live = false; };
  }, [historySector, from, to, refresh]);

  const sectionsInScope = useMemo(() => sectors
    .filter((sector) => scope === ALL || String(sector.id) === scope)
    .flatMap((sector) => sectionsBySector[sector.id] ?? []), [sectors, sectionsBySector, scope]);
  const scopeIds = useMemo(() => new Set(sectionsInScope.map((s) => s.id)), [sectionsInScope]);
  const countFor = (sectorId: number) => (sectionsBySector[sectorId] ?? []).filter((s) => selected.has(s.id)).length;
  const selectedGroups = sectors.map((sector) => ({
    sector, sections: (sectionsBySector[sector.id] ?? []).filter((s) => selected.has(s.id)),
  })).filter((group) => group.sections.length > 0);
  const selectedCount = selectedGroups.reduce((n, group) => n + group.sections.length, 0);

  function toggle(id: number) {
    if (!scopeIds.has(id)) return;
    setSelected((before) => {
      const next = new Set(before);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllInScope() {
    if (loadingSections || sectionsInScope.length === 0) return;
    const countToAdd = sectionsInScope.filter((s) => !selected.has(s.id)).length;
    if (countToAdd > 0 && !window.confirm(`Vas a marcar ${countToAdd} secciones adicionales como REGADAS. Confirma solo si realmente se atendieron. ¿Continuar?`)) return;
    setSelected((before) => new Set([...before, ...sectionsInScope.map((s) => s.id)]));
  }

  function clearScope() {
    setSelected((before) => {
      const next = new Set(before);
      scopeIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function selectAllSector(sectorId: number) {
    const available = sectionsBySector[sectorId] ?? [];
    const missing = available.filter((s) => !selected.has(s.id)).length;
    if (!missing) return;
    if (!window.confirm(`¿Confirmas que se regaron las ${available.length} secciones de este sector?`)) return;
    setSelected((before) => new Set([...before, ...available.map((s) => s.id)]));
  }

  function prepareSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (loadingSections || selectedGroups.length === 0) {
      setMessage({ kind: 'error', text: 'Selecciona al menos una sección regada.' });
      return;
    }
    if (startedAt && finishedAt && finishedAt <= startedAt) {
      setMessage({ kind: 'error', text: 'La hora final debe ser posterior a la hora inicial.' });
      return;
    }
    setReviewOpen(true);
  }

  async function confirmSave() {
    setSaving(true);
    setMessage(null);
    try {
      const requests = selectedGroups.map(({ sector, sections }) => ({
        sectorZoneId: sector.id, irrigationDate: date,
        startedAt: startedAt || null, finishedAt: finishedAt || null,
        sectionZoneIds: sections.map((s) => s.id), notes: notes.trim() || null,
      }));
      const created = await irrigationApi.createBatch(requests);
      setReviewOpen(false);
      setSelected(new Set()); setNotes(''); setStartedAt(''); setFinishedAt('');
      if (date < from) setFrom(date);
      if (date > to) setTo(date);
      setRefresh((v) => v + 1);
      setMessage({ kind: 'success', text: `${created.length} turno(s) guardado(s) por sector en la base de datos.` });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar. No se confirmó la operación.' });
      setReviewOpen(false);
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Riego · Turnos por sector</h1>
        <p className="mt-1 text-sm text-neutral-500">D-01 · Registro por uno o varios sectores. La cobertura de 15 días pertenece a D-02 y requiere validación.</p>
      </header>
      {message && <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.kind === 'success'
        ? 'bg-alert-success-bg border-alert-success-border text-alert-success-fg'
        : 'bg-alert-danger-bg border-alert-warning-border text-alert-danger-fg'}`}>{message.text}</div>}

      <Card title="Consultar turnos · filtros">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-neutral-700"><span>Sector</span>
            <select className={FIELD} value={historySector} onChange={(e) => setHistorySector(e.target.value)}>
              <option value={ALL}>Todos los sectores accesibles</option>
              {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-neutral-700"><span>Desde</span>
            <input type="date" className={FIELD} value={from} onChange={(e) => setFrom(e.target.value)}/>
          </label>
          <label className="space-y-1 text-sm font-medium text-neutral-700"><span>Hasta</span>
            <input type="date" className={FIELD} value={to} onChange={(e) => setTo(e.target.value)}/>
          </label>
        </div>
      </Card>

      {isSupervisor && <Card title="Nuevo turno ejecutado">
        <form onSubmit={prepareSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm text-neutral-700"><span>Fecha de riego</span>
              <input type="date" required className={FIELD} value={date} onChange={(e) => setDate(e.target.value)}/>
            </label>
            <label className="space-y-1 text-sm text-neutral-700"><span>Inicio (opcional)</span>
              <input type="time" className={FIELD} value={startedAt} onChange={(e) => setStartedAt(e.target.value)}/>
            </label>
            <label className="space-y-1 text-sm text-neutral-700"><span>Fin (opcional)</span>
              <input type="time" className={FIELD} value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)}/>
            </label>
          </div>
          <div className="rounded-lg border border-neutral-200 p-3 space-y-3">
            <label className="block space-y-1 text-sm font-semibold text-neutral-700">
              <span>Ámbito de selección</span>
              <select className={FIELD} value={scope} onChange={(e) => setScope(e.target.value)} disabled={loadingSectors}>
                <option value={ALL}>Todos mis sectores · {sectors.reduce((n, s) => n + (sectionsBySector[s.id]?.length ?? 0), 0)} secciones</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} · {sectionsBySector[s.id]?.length ?? 0} secciones</option>)}
              </select>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-neutral-900">{selectedCount} secciones seleccionadas en {selectedGroups.length} sector(es)</p>
                <p className="text-xs text-neutral-500">La selección permanece al cambiar de sector. Marca solo las áreas realmente regadas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={selectAllInScope} disabled={loadingSections || sectionsInScope.length === 0}>Marcar todas</Button>
                <Button type="button" variant="secondary" onClick={clearScope} disabled={loadingSections}>Limpiar ámbito</Button>
                <Button type="button" onClick={() => setMapOpen(true)} disabled={loadingSections || sectors.length === 0}>🗺️ Seleccionar en mapa 3D</Button>
              </div>
            </div>
            {loadingSections ? <LoadingSkeleton /> : (
              <div className="grid gap-2 sm:grid-cols-3">
                {sectors.filter((s) => scope === ALL || String(s.id) === scope).map((sector) => (
                  <div key={sector.id} className="rounded-md border border-neutral-200 p-3">
                    <p className="text-sm font-semibold text-neutral-900">{sector.name}</p>
                    <p className="my-1 text-xs text-neutral-500">{countFor(sector.id)} / {(sectionsBySector[sector.id] ?? []).length} seleccionadas</p>
                    <button type="button" className="text-xs font-semibold text-brand-700 hover:underline"
                      onClick={() => selectAllSector(sector.id)}>Marcar sector completo</button>
                  </div>
                ))}
              </div>
            )}
            <details className="rounded-md border border-neutral-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-neutral-700">Seleccionar desde una lista (alternativa accesible)</summary>
              <div className="space-y-2 border-t border-neutral-200 p-3">
                <label className="block text-sm text-neutral-700" htmlFor="riego-buscar-seccion">Buscar por nombre o código</label>
                <input id="riego-buscar-seccion" type="search" className={FIELD} value={search} onChange={(e) => setSearch(e.target.value)}/>
                <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {sectionsInScope.filter((s) => `${s.name} ${s.code}`.toLowerCase().includes(search.trim().toLowerCase())).map((s) => (
                    <label key={s.id} className="flex items-start gap-2 rounded-md p-2 text-sm text-neutral-900 hover:bg-neutral-50">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="mt-1 accent-green-600"/>
                      <span>{s.name} <span className="text-xs text-neutral-500">{s.code}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
          <label className="block space-y-1 text-sm text-neutral-700"><span>Observaciones (opcional, compartidas por los turnos seleccionados)</span>
            <textarea maxLength={500} rows={3} className="w-full rounded-md border border-neutral-200 bg-neutral-0 p-3 text-neutral-900"
              value={notes} onChange={(e) => setNotes(e.target.value)}/>
          </label>
          <Button type="submit" disabled={loadingSections || selectedCount === 0}>Revisar y guardar {selectedGroups.length} turno(s)</Button>
        </form>
      </Card>}

      {mapOpen && <IrrigationMapPicker
        sectors={sectors} sectionsBySector={sectionsBySector} scope={scope}
        selectedIds={[...selected]} onCancel={() => setMapOpen(false)}
        onConfirm={(ids) => { setSelected(new Set(ids)); setMapOpen(false); }}/>
      }

      {reviewOpen && <div role="dialog" aria-modal="true" aria-labelledby="riego-review-title" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-xl rounded-xl border border-neutral-200 bg-neutral-0 p-5 text-neutral-900 shadow-xl space-y-4">
          <h2 id="riego-review-title" className="text-xl font-bold">Confirmar ejecución del riego</h2>
          <p className="text-sm text-neutral-700">Fecha: {date}. Se registrará un turno independiente por sector, con el mismo horario declarado.</p>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {selectedGroups.map(({sector, sections}) => <div key={sector.id} className="flex justify-between rounded-md border border-neutral-200 p-3 text-sm">
              <span>{sector.name}</span><strong>{sections.length} secciones regadas</strong>
            </div>)}
          </div>
          <p className="text-xs text-neutral-500">Confirma solo secciones efectivamente atendidas. Esto NO calcula automáticamente el cumplimiento de D-02.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReviewOpen(false)} disabled={saving}>Volver a editar</Button>
            <Button type="button" onClick={confirmSave} loading={saving}>Confirmar y guardar {selectedGroups.length} turno(s)</Button>
          </div>
        </div>
      </div>}

      <Card title="Historial de riego">
        {loadingTurns ? <LoadingSkeleton variant="table-row" count={3}/>
          : turns.length === 0 ? <EmptyState title="Sin turnos registrados" description="No se encontraron registros en el periodo seleccionado."/>
          : <div className="space-y-3">{turns.map((turn) => <article key={turn.id} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-neutral-900">{turn.sectorName}</h3>
              <span className="text-sm text-neutral-600">{turn.irrigationDate}</span></div>
            <p className="mt-1 text-sm text-neutral-700">{turn.sections.length} secciones registradas</p>
            <p className="mt-1 text-sm text-neutral-500">{turn.sections.map((s) => s.name).join(', ')}</p>
            {turn.startedAt && <p className="mt-1 text-xs text-neutral-500">Horario declarado: {turn.startedAt.slice(0,5)}{turn.finishedAt ? `–${turn.finishedAt.slice(0,5)}` : ''}</p>}
            {turn.notes && <p className="mt-2 text-sm text-neutral-700">{turn.notes}</p>}
          </article>)}</div>}
      </Card>
    </div>
  );
}
