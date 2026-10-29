'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button, Input } from '@/components/ui';

export interface LocationValue { reference: string; latitude: string; longitude: string }
export const emptyLocation: LocationValue = { reference: '', latitude: '', longitude: '' };

export function locationPayload(value: LocationValue) {
  const latitude = value.latitude.trim() === '' ? null : Number(value.latitude);
  const longitude = value.longitude.trim() === '' ? null : Number(value.longitude);
  if ((latitude === null) !== (longitude === null) || (latitude !== null &&
    (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude! < -180 || longitude! > 180))) {
    throw new Error('Revisa las coordenadas o quita la ubicación para continuar.');
  }
  return { locationReference: value.reference.trim() || null, latitude, longitude };
}

export function LocationFields({ value, onChange, disabled = false }: {
  value: LocationValue; onChange: (value: LocationValue) => void; disabled?: boolean;
}) {
  const [message, setMessage] = useState('');
  const id = useId();
  const [locating, setLocating] = useState(false);
  const generation = useRef({ value: 0, disabled });
  const currentValue = useRef(value);
  useEffect(() => { currentValue.current = value; }, [value]);
  useEffect(() => { generation.current.disabled = disabled; }, [disabled]);
  useEffect(() => {
    const counter = generation.current;
    return () => { counter.value++; };
  }, []);
  const locate = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setMessage('La ubicación requiere HTTPS y permiso del navegador. Puedes enviar solo el texto.');
      return;
    }
    const request = ++generation.current.value;
    setLocating(true); setMessage('');
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== generation.current.value) return;
      setLocating(false);
      if (generation.current.disabled) return;
      onChange({ ...currentValue.current, latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) });
      setMessage(`Posición del teléfono, precisión aproximada ${Math.round(position.coords.accuracy)} m. Confirma que corresponda al lugar de la incidencia.`);
    }, () => {
      if (request !== generation.current.value) return;
      setLocating(false); setMessage('No se obtuvo la ubicación. Puedes continuar sin ella o escribir una referencia.');
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };
  return (
    <div className="space-y-3">
      <Input id={`${id}-reference`} label="Referencia del lugar (opcional)" size="lg" value={value.reference}
        disabled={disabled} maxLength={500} placeholder="Frente a la entrada de Ingeniería Civil"
        onChange={(reference) => onChange({ ...value, reference })} />
      <Button type="button" variant="secondary" size="lg" disabled={disabled || locating} onClick={locate}>
        {locating ? 'Obteniendo ubicación…' : 'Usar ubicación del teléfono'}
      </Button>
      <details>
        <summary className="min-h-12 cursor-pointer rounded-md py-3 text-sm text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Ver o corregir coordenadas</summary>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['latitude', 'longitude'] as const).map((field) => (
            <Input key={field} id={`${id}-${field}`} label={field === 'latitude' ? 'Latitud' : 'Longitud'}
              type="number" step="any" inputMode="decimal" size="lg" disabled={disabled} value={value[field]}
              onChange={(coordinate) => { generation.current.value++; setLocating(false); onChange({ ...value, [field]: coordinate }); }} />
          ))}
        </div>
      </details>
      {(value.latitude || value.longitude) && <p className="break-words text-sm text-neutral-700">Punto seleccionado: {value.latitude}, {value.longitude}</p>}
      <Button type="button" variant="ghost" size="lg" disabled={disabled} onClick={() => {
        generation.current.value++; setLocating(false); setMessage(''); onChange({ ...value, latitude: '', longitude: '' });
      }}>Quitar coordenadas</Button>
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}
    </div>
  );
}
