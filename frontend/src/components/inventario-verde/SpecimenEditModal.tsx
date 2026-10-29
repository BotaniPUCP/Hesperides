'use client';

import { useState } from 'react';
import type { SpecimenDetail, SpecimenForm } from '@shared/types';
import { Button, Input, Modal } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { LIMITES } from '@/lib/upload-limits';

export interface SpecimenEditModalProps {
  specimen: SpecimenDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SpecimenEditModal({
  specimen,
  isOpen,
  onClose,
  onSuccess,
}: SpecimenEditModalProps) {
  const hoy = new Date().toISOString().slice(0, 10);

  // Estados del formulario inicializados con los valores actuales del ejemplar
  const [alturaM, setAlturaM] = useState(specimen.heightM !== null ? String(specimen.heightM) : '');
  const [alturaFusteM, setAlturaFusteM] = useState(specimen.trunkHeightM !== null ? String(specimen.trunkHeightM) : '');
  const [dapCm, setDapCm] = useState(specimen.dbhCm !== null ? String(specimen.dbhCm) : '');
  const [radioCopaM, setRadioCopaM] = useState(specimen.crownRadiusM !== null ? String(specimen.crownRadiusM) : '');
  const [zunchado, setZunchado] = useState<'' | 'si' | 'no'>(
    specimen.isBanded === true ? 'si' : specimen.isBanded === false ? 'no' : ''
  );
  const [fechaMedicion, setFechaMedicion] = useState(hoy);
  const [sourceReference, setSourceReference] = useState(specimen.sourceReference ?? '');
  const [legacyCode, setLegacyCode] = useState(specimen.legacyCode ?? '');
  const [notes, setNotes] = useState(specimen.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parseNumber = (val: string) => (val.trim() === '' ? null : Number(val.trim().replace(',', '.')));

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setErrorMessage(null);

    const parsedHeight = parseNumber(alturaM);
    const parsedTrunk = parseNumber(alturaFusteM);
    const parsedDap = parseNumber(dapCm);
    const parsedCrown = parseNumber(radioCopaM);

    const hasAnyMeasure =
      parsedHeight !== null || parsedTrunk !== null || parsedDap !== null || parsedCrown !== null || zunchado !== '';

    if (hasAnyMeasure && !fechaMedicion) {
      setErrorMessage('Debes indicar la fecha en que se tomaron las mediciones.');
      setSaving(false);
      return;
    }

    const payload: SpecimenForm = {
      scientificName: specimen.species.scientificName,
      lat: specimen.latitude ?? 0,
      lon: specimen.longitude ?? 0,
      quantity: specimen.quantity ?? 1,
      sourceReference: sourceReference.trim() || null,
      legacyCode: legacyCode.trim() || null,
      sourceLocation: specimen.sourceLocation,
      notes: notes.trim() || null,
      measurement: hasAnyMeasure
        ? {
          date: fechaMedicion,
          heightM: parsedHeight,
          trunkHeightM: parsedTrunk,
          dbhCm: parsedDap,
          crownRadiusM: parsedCrown,
          banded: zunchado === '' ? null : zunchado === 'si',
        }
        : null,
    };

    try {
      await catastroApi.update(specimen.code, payload, photo);
      onSuccess();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al actualizar las medidas del ejemplar. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Actualizar Medidas · ${specimen.code}`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} loading={saving}>
            Guardar cambios
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-neutral-800">{specimen.species.commonName}</span>
            <span className="text-neutral-500 italic ml-1.5">({specimen.species.scientificName})</span>
          </div>
          <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
            {specimen.code}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-action-danger/10 border border-action-danger/20 text-action-danger text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Sección: Medidas Dendrométricas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Mediciones Dendrométricas
            </h3>
            <span className="text-[11px] text-neutral-400">Campos en metros y centímetros</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                id="edit-specimen-height"
                label="Altura total (m)"
                type="number"
                step="0.1"
                placeholder="Ej. 6.5"
                value={alturaM}
                onChange={setAlturaM}
              />
            </div>

            <div>
              <Input
                id="edit-specimen-trunk-height"
                label="Altura del fuste comercial (m)"
                type="number"
                step="0.1"
                placeholder="Ej. 4.0"
                value={alturaFusteM}
                onChange={setAlturaFusteM}
              />
            </div>

            <div>
              <Input
                id="edit-specimen-dap"
                label="DAP - Diámetro del tronco (cm)"
                type="number"
                step="1"
                placeholder="Ej. 120"
                value={dapCm}
                onChange={setDapCm}
              />
            </div>

            <div>
              <Input
                id="edit-specimen-crown-radius"
                label="Radio de copa (m)"
                type="number"
                step="0.1"
                placeholder="Ej. 3.2"
                value={radioCopaM}
                onChange={setRadioCopaM}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-1">
              <label htmlFor="edit-specimen-banded" className="block text-xs font-medium text-neutral-700">
                Protección física (Zunchado)
              </label>
              <select
                id="edit-specimen-banded"
                value={zunchado}
                onChange={(e) => setZunchado(e.target.value as '' | 'si' | 'no')}
                className="w-full rounded-xl border border-neutral-200/90 px-3 py-2 text-sm bg-neutral-0 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-forest-600"
              >
                <option value="">Sin especificar / No aplica</option>
                <option value="si">Con zunchado (abrazadera metálica presente)</option>
                <option value="no">Sin zunchado</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-specimen-date" className="block text-xs font-medium text-neutral-700">
                Fecha de la medición
              </label>
              <input
                id="edit-specimen-date"
                type="date"
                max={hoy}
                value={fechaMedicion}
                onChange={(e) => setFechaMedicion(e.target.value)}
                className="w-full rounded-xl border border-neutral-200/90 px-3 py-2 text-sm bg-neutral-0 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-forest-600"
              />
            </div>
          </div>
        </div>

        {/* Sección: Referencias y Foto */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Referencias y Registro
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="edit-specimen-source-ref"
              label="Referencia de cuadrilla (ej. p01, JC-1)"
              value={sourceReference}
              onChange={setSourceReference}
            />
            <Input
              id="edit-specimen-legacy-code"
              label="Código de placa heredado"
              value={legacyCode}
              onChange={setLegacyCode}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="edit-specimen-notes" className="block text-xs font-medium text-neutral-700">
              Observaciones de campo
            </label>
            <textarea
              id="edit-specimen-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre estado del tronco, inclinación, entorno..."
              className="w-full rounded-xl border border-neutral-200/90 p-3 text-sm bg-neutral-0 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          <div className="pt-1">
            <CampoArchivo
              id="edit-specimen-photo"
              etiqueta="Actualizar fotografía del ejemplar (opcional)"
              acepta="image/jpeg,image/png"
              limite={LIMITES.foto}
              archivo={photo}
              onElegir={setPhoto}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
