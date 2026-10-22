'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import type { FeatureForm } from '@shared/types';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { Button, Card, Input } from '@/components/ui';
import { LIMITES } from '@/lib/upload-limits';
import { AvisoDuplicado } from './AvisoDuplicado';
import { CamposBebedero, CamposTacho } from './CamposComponente';
import { MapaSelector } from './MapaSelector';
import { useRegistroComponente } from './useRegistroComponente';

const DECIMALES_COORDENADA = 6;
const NOMBRE: Record<FeatureForm['kind'], { uno: string; mismo: string }> = {
  'waste-bins': { uno: 'tacho', mismo: 'el mismo tacho' },
  'drinking-fountains': { uno: 'bebedero', mismo: 'el mismo bebedero' },
};

/** Registro de un tacho o bebedero (SPEC-103 §3): dónde está, lo propio de su tipo y una foto. */
export function RegistroComponenteForm({ kind, onDirtyChange }: { kind: FeatureForm['kind']; onDirtyChange?: (sinGuardar: boolean) => void }) {
  const r = useRegistroComponente(kind);
  // La pantalla decide si avisa al salir: también al cambiar qué se registra.
  useEffect(() => onDirtyChange?.(r.sinGuardar), [r.sinGuardar, onDirtyChange]);
  const v = r.valores;
  const nombre = NOMBRE[kind];

  if (r.registrado) {
    return (
      <Card title={`${nombre.uno[0].toUpperCase()}${nombre.uno.slice(1)} registrado`}>
        <p className="text-neutral-700">
          Se registró como <strong>{r.registrado}</strong>. Ya aparece en el mapa.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={r.registrarOtro}>Registrar otro</Button>
          <Link href="/mapa" className="self-center text-brand-700 underline">Ver en el mapa</Link>
        </div>
      </Card>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={(e) => { e.preventDefault(); r.enviar(); }}>
      <Card title="Dónde está">
        <div className="space-y-4">
          <Input id="lugar" label="Lugar" value={v.lugar} onChange={(x) => r.cambiar('lugar', x)}
            helperText="Como lo diría alguien en el campus: «Pabellón H, primer piso»" />
          <MapaSelector onElegir={(lat, lon) => {
            r.cambiar('lat', lat.toFixed(DECIMALES_COORDENADA));
            r.cambiar('lon', lon.toFixed(DECIMALES_COORDENADA));
          }} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="lat" label="Latitud" value={v.lat} onChange={(x) => r.cambiar('lat', x)} required errorMessage={r.errores.lat} />
            <Input id="lon" label="Longitud" value={v.lon} onChange={(x) => r.cambiar('lon', x)} required errorMessage={r.errores.lon} />
          </div>
        </div>
      </Card>

      <Card title={`El ${nombre.uno}`}>
        {kind === 'waste-bins' ? <CamposTacho r={r} /> : <CamposBebedero r={r} />}
      </Card>

      <Card title="Foto y nota">
        <div className="space-y-4">
          <CampoArchivo id="foto-componente" etiqueta="Foto (opcional)" acepta="image/jpeg,image/png"
            limite={LIMITES.foto} archivo={r.foto} onElegir={r.setFoto} />
          <Input id="nota" label="Nota" value={v.nota} onChange={(x) => r.cambiar('nota', x)} />
        </div>
      </Card>

      {r.duplicado && (
        <AvisoDuplicado duplicado={r.duplicado} queEs={nombre.mismo} enviando={r.enviando}
          onConfirmar={() => r.enviar(true)} onRevisar={r.descartarDuplicado} />
      )}
      {r.error && <p role="alert" className="text-sm text-action-danger">{r.error}</p>}
      {!r.duplicado && <Button type="submit" loading={r.enviando}>Registrar {nombre.uno}</Button>}
    </form>
  );
}
