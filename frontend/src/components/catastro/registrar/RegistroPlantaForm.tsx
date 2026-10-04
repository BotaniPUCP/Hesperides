'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { Button, Card, Input } from '@/components/ui';
import { LIMITES } from '@/lib/upload-limits';
import { AvisoDuplicado } from './AvisoDuplicado';
import { BuscadorDeEspecie } from './BuscadorDeEspecie';
import { CamposEvaluacion, CamposMedicion } from './CamposMedicionEvaluacion';
import { MapaSelector } from './MapaSelector';
import { useRegistroPlanta } from './useRegistroPlanta';

const DECIMALES_COORDENADA = 6;

/** Registro de una planta por formulario (SPEC-103 §5.1). */
export function RegistroPlantaForm({ onDirtyChange }: { onDirtyChange?: (sinGuardar: boolean) => void }) {
  const r = useRegistroPlanta();
  // La pantalla decide si avisa al salir: también al cambiar qué se registra.
  useEffect(() => onDirtyChange?.(r.sinGuardar), [r.sinGuardar, onDirtyChange]);
  const v = r.valores;

  if (r.registrado) {
    return (
      <Card title="Planta registrada">
        <p className="text-neutral-700">
          Se registró como <strong>{r.registrado}</strong>. Ya aparece en el mapa y en el inventario.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={r.registrarOtra}>Registrar otra</Button>
          <Link href="/mapa" className="self-center text-brand-700 underline">Ver en el mapa</Link>
        </div>
      </Card>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={(e) => { e.preventDefault(); r.enviar(); }}>
      <Card title="Qué y dónde">
        <div className="space-y-4">
          <BuscadorDeEspecie valor={v.especie} onElegir={(n) => r.cambiar('especie', n)} error={r.errores.especie} />
          <MapaSelector onElegir={(lat, lon) => {
            r.cambiar('lat', lat.toFixed(DECIMALES_COORDENADA));
            r.cambiar('lon', lon.toFixed(DECIMALES_COORDENADA));
          }} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="lat" label="Latitud" value={v.lat} onChange={(x) => r.cambiar('lat', x)} required errorMessage={r.errores.lat} />
            <Input id="lon" label="Longitud" value={v.lon} onChange={(x) => r.cambiar('lon', x)} required errorMessage={r.errores.lon} />
            <Input id="cantidad" label="Cantidad" type="number" value={v.cantidad} onChange={(x) => r.cambiar('cantidad', x)}
              errorMessage={r.errores.cantidad} helperText="Más de 1 es una agrupación (un seto)" />
          </div>
        </div>
      </Card>

      <CamposMedicion r={r} />
      <CamposEvaluacion r={r} />

      <Card title="Foto y notas">
        <div className="space-y-4">
          <CampoArchivo id="foto" etiqueta="Foto de la planta (opcional)" acepta="image/jpeg,image/png"
            limite={LIMITES.foto} archivo={r.foto} onElegir={r.setFoto} />
          <Input id="observaciones" label="Observaciones" value={v.observaciones} onChange={(x) => r.cambiar('observaciones', x)} />
        </div>
      </Card>

      {r.duplicado && (
        <AvisoDuplicado duplicado={r.duplicado} queEs="la misma planta" enviando={r.enviando}
          onConfirmar={() => r.enviar(true)} onRevisar={r.descartarDuplicado} />
      )}

      {r.error && <p role="alert" className="text-sm text-action-danger">{r.error}</p>}

      {!r.duplicado && <Button type="submit" loading={r.enviando}>Registrar planta</Button>}
    </form>
  );
}
