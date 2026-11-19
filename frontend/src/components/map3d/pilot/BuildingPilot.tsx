'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import type { PilotViewer } from './createPilotViewer';
import modelG from './pabellonG.json';
import modelZ from './pabellonZ.json';
import modelN from './pabellonN.json';

const buildings = {
  N: {
    ...modelN, name: 'Pabellón N',
    note: 'Complejo Mac Gregor. Colores y patrones aproximados a partir de tus fotos; las caras no visibles siguen el mismo criterio. Geometría del SKP y extensiones en sus ejes locales.',
    rows: [
      ['Altura total', modelN.measurements.totalHeightM, 'm'],
      ['Extensión en el eje X', modelN.measurements.extentXM, 'm'],
      ['Extensión en el eje Y', modelN.measurements.extentYM, 'm'],
    ] as const,
  },
  G: {
    ...modelG, name: 'Pabellón G',
    note: 'Geometría invertida lateralmente por indicación del usuario. Alturas desde la base del modelo.',
    rows: [
      ['Altura principal', modelG.measurements.mainHeightM, 'm'],
      ['Altura del cuerpo lateral', modelG.measurements.sideHeightM, 'm'],
      ['Área de la base principal', modelG.measurements.mainBaseAreaM2, 'm²'],
      ['Área de la cubierta principal', modelG.measurements.mainRoofAreaM2, 'm²'],
      ['Área de la base lateral', modelG.measurements.sideBaseAreaM2, 'm²'],
    ] as const,
  },
  Z: {
    ...modelZ, name: 'Pabellón Z',
    note: 'Identificación provisional por correspondencia espacial. Extensiones medidas sobre los ejes locales del SKP. Material uniforme de visualización.',
    rows: [
      ['Altura total', modelZ.measurements.totalHeightM, 'm'],
      ['Extensión en el eje X', modelZ.measurements.extentXM, 'm'],
      ['Extensión en el eje Y', modelZ.measurements.extentYM, 'm'],
    ] as const,
  },
};

const number = (value: number) => value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BuildingPilot() {
  const [selected, setSelected] = useState<keyof typeof buildings>('G');
  return <div className="space-y-4">
    <Link href="/mapa/equivalencias" className="text-sm font-semibold text-brand-600 hover:underline">Relacionar mapa actual y SKP →</Link>
    <nav aria-label="Edificio de la prueba cero" className="flex flex-wrap gap-2">
      {(['G', 'Z', 'N'] as const).map((id) => <Button key={id} size="sm" variant="secondary" aria-pressed={selected === id} onClick={() => setSelected(id)}>{buildings[id].name}</Button>)}
    </nav>
    <PilotModel key={selected} building={selected} />
  </div>;
}

function PilotModel({ building }: { building: keyof typeof buildings }) {
  const model = buildings[building];
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<PilotViewer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [edges, setEdges] = useState(true);

  useEffect(() => {
    let active = true;
    import('./createPilotViewer').then(({ createPilotViewer }) => {
      if (!active || !container.current) return;
      viewer.current = createPilotViewer(container.current, model.asset, model.name,
        () => { if (active) setStatus('ready'); },
        () => { if (active) setStatus('error'); });
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; viewer.current?.dispose(); viewer.current = null; };
  }, [model]);

  return (
    <section className="space-y-4">
      <Link href="/mapa" className="text-sm font-medium text-brand-600 hover:underline">← Mapa del campus</Link>
      <header>
        <p className="text-sm font-semibold text-brand-600">Piloto · Versión 0</p>
        <h1 className="text-2xl font-bold text-neutral-900">{model.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">Geometría de {model.source.fileName}, a escala en metros y en coordenadas locales.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 p-3">
            <Button size="sm" variant="secondary" disabled={status !== 'ready'} onClick={() => viewer.current?.fit()}>Vista 3D</Button>
            <Button size="sm" variant="secondary" disabled={status !== 'ready'} onClick={() => viewer.current?.top()}>Vista superior</Button>
            <label className="flex items-center gap-2 px-2 text-sm text-neutral-700">
              <input type="checkbox" checked={edges} disabled={status !== 'ready'} onChange={(event) => {
                setEdges(event.target.checked);
                viewer.current?.setEdges(event.target.checked);
              }} /> Aristas
            </label>
          </div>
          <div className="relative h-[55dvh] min-h-[320px] xl:h-[65dvh]">
            <div ref={container} className="absolute inset-0" />
            {status === 'loading' && <p role="status" className="absolute inset-0 grid place-items-center bg-neutral-50 text-neutral-700">Cargando modelo…</p>}
            {status === 'error' && <p role="alert" className="absolute inset-0 grid place-items-center bg-neutral-50 p-6 text-center text-neutral-700">No se pudo mostrar el modelo. Puedes descargarlo y consultar sus medidas aquí.</p>}
          </div>
          <p className="px-4 py-3 text-xs text-neutral-600">Arrastra con el botón izquierdo para desplazar · botón derecho para girar · rueda o pellizco para acercar. En pantalla táctil, un dedo gira y dos desplazan. Cada cuadrícula representa 2 m.</p>
        </div>
        <aside className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-0 p-5">
          <h2 className="font-semibold text-neutral-900">Medidas del archivo</h2>
          <dl className="space-y-4 text-sm">
            {model.rows.map(([label, value, unit]) => <div key={label}><dt className="text-neutral-600">{label}</dt><dd className="mt-1 text-lg font-semibold text-neutral-900">{number(value)} {unit}</dd></div>)}
          </dl>
          <p className="text-xs leading-relaxed text-neutral-600">{model.note} La ubicación geográfica y las medidas sobre el terreno están pendientes de validación.</p>
          <a href={model.asset} download className="inline-block text-sm font-semibold text-brand-600 hover:underline">Descargar modelo GLB</a>
        </aside>
      </div>
    </section>
  );
}
