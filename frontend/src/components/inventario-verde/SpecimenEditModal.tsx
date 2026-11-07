'use client';

import { useState } from 'react';
import type { SpecimenDetail, SpecimenForm } from '@shared/types';
import { Button, Input, Modal } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { todayLocal } from '@/lib/local-date';
import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { LIMITES } from '@/lib/upload-limits';
import { ConfirmSaveModal } from './ConfirmSaveModal';
import { unidadCorta } from './medidasEspecie';

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
  const hoy = todayLocal();
  // Un valor ya guardado se sigue pudiendo corregir aunque la medida ya no aplique a la especie.
  const pideFuste = specimen.species.usesTrunkHeight || specimen.trunkHeightM !== null;
  const pideDap = specimen.species.usesDbh || specimen.dbhCm !== null;

  // Estados del formulario inicializados con los valores actuales del ejemplar
  const [alturaM, setAlturaM] = useState(specimen.heightM !== null ? String(specimen.heightM) : '');
  const [alturaFusteM, setAlturaFusteM] = useState(specimen.trunkHeightM !== null ? String(specimen.trunkHeightM) : '');
  const [dapCm, setDapCm] = useState(specimen.dbhCm !== null ? String(specimen.dbhCm) : '');
  const [radioCopaM, setRadioCopaM] = useState(specimen.crownRadiusM !== null ? String(specimen.crownRadiusM) : '');
  const [zunchado, setZunchado] = useState<'' | 'si' | 'no'>(
    specimen.isBanded === true ? 'si' : specimen.isBanded === false ? 'no' : ''
  );
  const [fechaMedicion, setFechaMedicion] = useState(hoy);
  const [verificado, setVerificado] = useState(false);
  // Sin precarga: una medida adicional solo se registra si alguien la midió esta vez.
  const [adicionales, setAdicionales] = useState<Record<string, string>>({});
  const [sourceReference, setSourceReference] = useState(specimen.sourceReference ?? '');
  const [legacyCode, setLegacyCode] = useState(specimen.legacyCode ?? '');
  const [notes, setNotes] = useState(specimen.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const parseNumber = (val: string) => (val.trim() === '' ? null : Number(val.trim().replace(',', '.')));

  const medidasEscritas = () => specimen.species.extraMeasures.flatMap((medida) => {
    const valor = parseNumber(adicionales[medida.code] ?? '');
    return valor === null ? [] : [{ code: medida.code, value: valor }];
  });

  // El formulario abre con las medidas vigentes: tenerlas escritas no significa haber medido.
  const medidasCambiaron =
    parseNumber(alturaM) !== specimen.heightM
    || parseNumber(alturaFusteM) !== specimen.trunkHeightM
    || parseNumber(dapCm) !== specimen.dbhCm
    || parseNumber(radioCopaM) !== specimen.crownRadiusM
    || (zunchado === '' ? null : zunchado === 'si') !== specimen.isBanded;
  const tieneMedidas = [specimen.heightM, specimen.trunkHeightM, specimen.dbhCm, specimen.crownRadiusM]
    .some((valor) => valor !== null);
  const ofreceVerificar = tieneMedidas && !medidasCambiaron;
  const registraMedicion = medidasCambiaron || medidasEscritas().length > 0 || (ofreceVerificar && verificado);

  function handleRequestSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const parsedHeight = parseNumber(alturaM);
    const parsedTrunk = parseNumber(alturaFusteM);
    const parsedDap = parseNumber(dapCm);
    const parsedCrown = parseNumber(radioCopaM);

    if (parsedHeight !== null && parsedHeight <= 0) {
      setErrorMessage('La altura total debe ser un número positivo.');
      return;
    }
    if (parsedTrunk !== null && parsedTrunk < 0) {
      setErrorMessage('La altura del fuste no puede ser negativa.');
      return;
    }
    if (parsedHeight !== null && parsedTrunk !== null && parsedTrunk > parsedHeight) {
      setErrorMessage('La altura del fuste no puede ser mayor que la altura total del ejemplar.');
      return;
    }
    if (parsedDap !== null && parsedDap < 0) {
      setErrorMessage('El DAP no puede ser negativo.');
      return;
    }
    if (parsedCrown !== null && parsedCrown <= 0) {
      setErrorMessage('El radio de copa debe ser un número positivo.');
      return;
    }

    for (const medida of specimen.species.extraMeasures) {
      const valor = parseNumber(adicionales[medida.code] ?? '');
      if (valor !== null && (!Number.isFinite(valor) || valor < 0)) {
        setErrorMessage(`${medida.label} debe ser un número positivo o cero.`);
        return;
      }
      if (valor !== null && medida.unitCode === 'UNIT' && !Number.isInteger(valor)) {
        setErrorMessage(`${medida.label} debe ser un número entero.`);
        return;
      }
    }

    if (registraMedicion && !fechaMedicion) {
      setErrorMessage('Debes indicar la fecha en que se tomaron las mediciones.');
      return;
    }

    if (registraMedicion && fechaMedicion > hoy) {
      setErrorMessage('La fecha de medición no puede ser una fecha futura.');
      return;
    }

    // Validación superada: abrir diálogo modal de confirmación
    setShowConfirm(true);
  }

  async function executeSubmit() {
    setSaving(true);
    setErrorMessage(null);

    const parsedHeight = parseNumber(alturaM);
    const parsedTrunk = parseNumber(alturaFusteM);
    const parsedDap = parseNumber(dapCm);
    const parsedCrown = parseNumber(radioCopaM);

    const extraValues = medidasEscritas();

    const payload: SpecimenForm = {
      scientificName: specimen.species.scientificName,
      lat: specimen.latitude ?? 0,
      lon: specimen.longitude ?? 0,
      quantity: specimen.quantity ?? 1,
      sourceReference: sourceReference.trim() || null,
      legacyCode: legacyCode.trim() || null,
      sourceLocation: specimen.sourceLocation,
      notes: notes.trim() || null,
      measurement: registraMedicion
        ? {
          date: fechaMedicion,
          heightM: parsedHeight,
          trunkHeightM: parsedTrunk,
          dbhCm: parsedDap,
          crownRadiusM: parsedCrown,
          banded: zunchado === '' ? null : zunchado === 'si',
          extraValues,
        }
        : null,
    };

    try {
      await catastroApi.update(specimen.code, payload, photo);
      setShowConfirm(false);
      onSuccess();
      onClose();
    } catch (err) {
      setShowConfirm(false);
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
    <>
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
            <Button variant="primary" onClick={() => void handleRequestSubmit()} loading={saving}>
              Guardar cambios
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRequestSubmit} className="space-y-5">
          <div className="rounded-xl bg-neutral-50 p-3 border border-neutral-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-neutral-800">{specimen.species.commonName}</span>
              <span className="text-neutral-500 italic ml-1.5">({specimen.species.scientificName})</span>
            </div>
            <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-sm border border-neutral-200">
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

              {pideFuste && <div>
                <Input
                  id="edit-specimen-trunk-height"
                  label="Altura del fuste comercial (m)"
                  type="number"
                  step="0.1"
                  placeholder="Ej. 4.0"
                  value={alturaFusteM}
                  onChange={setAlturaFusteM}
                />
              </div>}

              {pideDap && <div>
                <Input
                  id="edit-specimen-dap"
                  label="DAP - Diámetro del tronco (cm)"
                  type="number"
                  step="1"
                  placeholder="Ej. 120"
                  value={dapCm}
                  onChange={setDapCm}
                />
              </div>}

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

            {specimen.species.extraMeasures.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {specimen.species.extraMeasures.map((medida) => (
                  <Input
                    key={medida.code}
                    id={`edit-specimen-extra-${medida.code}`}
                    label={`${medida.label} (${unidadCorta(medida.unitCode)})`}
                    value={adicionales[medida.code] ?? ''}
                    onChange={(valor) => setAdicionales((actuales) => ({ ...actuales, [medida.code]: valor }))}
                    helperText={medida.referenceNote ?? undefined}
                  />
                ))}
              </div>
            )}

            {ofreceVerificar && (
              <label htmlFor="edit-specimen-verified" className="flex items-start gap-2 text-xs text-neutral-700">
                <input
                  id="edit-specimen-verified"
                  type="checkbox"
                  checked={verificado}
                  onChange={(e) => setVerificado(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-xs border-neutral-300"
                />
                <span>Verifiqué en campo: las medidas siguen igual. Se registra como una medición nueva con la fecha indicada.</span>
              </label>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1">
                <label htmlFor="edit-specimen-banded" className="block text-xs font-medium text-neutral-700">
                  Protección física (Zunchado)
                </label>
                <select
                  id="edit-specimen-banded"
                  value={zunchado}
                  onChange={(e) => setZunchado(e.target.value as '' | 'si' | 'no')}
                  className="w-full rounded-xl border border-neutral-200/90 px-3 py-2 text-sm bg-neutral-0 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-forest-600"
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
                  className="w-full rounded-xl border border-neutral-200/90 px-3 py-2 text-sm bg-neutral-0 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-forest-600"
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
                className="w-full rounded-xl border border-neutral-200/90 p-3 text-sm bg-neutral-0 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-forest-600"
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

      {/* Pop-up modal de confirmación antes de guardar la medición */}
      <ConfirmSaveModal
        isOpen={showConfirm}
        title={registraMedicion ? 'Confirmar nueva medición' : 'Confirmar cambios'}
        specimenCode={specimen.code}
        subtitle={registraMedicion ? 'Actualización de medidas dendrométricas' : 'Datos del ejemplar'}
        confirmLabel="Confirmar y guardar"
        cancelLabel="Revisar datos"
        isWorking={saving}
        onConfirm={() => void executeSubmit()}
        onCancel={() => setShowConfirm(false)}
      >
        {!registraMedicion ? (
          <p className="leading-relaxed text-neutral-700">
            Las medidas no cambian: no se registra una medición nueva para el ejemplar{' '}
            <strong className="text-neutral-900 font-semibold">{specimen.code}</strong>.
          </p>
        ) : (
          <>
            <p className="leading-relaxed text-neutral-700">
              ¿Confirmas registrar esta nueva medición para el ejemplar{' '}
              <strong className="text-neutral-900 font-semibold">{specimen.code}</strong>? Pasará a formar
              parte del historial dendrométrico oficial con fecha{' '}
              <span className="font-semibold text-neutral-900">{fechaMedicion}</span>.
            </p>

            {/* Resumen de las métricas ingresadas usando tokens temáticos nativos */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center text-neutral-600">
                <span className="font-sans">Altura total:</span>
                <span className="font-bold text-neutral-900">
                  {alturaM ? `${alturaM} m` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="font-sans">Altura del fuste:</span>
                <span className="font-bold text-neutral-900">
                  {alturaFusteM ? `${alturaFusteM} m` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="font-sans">DAP (Tronco):</span>
                <span className="font-bold text-neutral-900">
                  {dapCm ? `${dapCm} cm` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="font-sans">Radio de copa:</span>
                <span className="font-bold text-neutral-900">
                  {radioCopaM ? `${radioCopaM} m` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span className="font-sans">Zunchado:</span>
                <span className="font-bold text-neutral-900">
                  {zunchado === 'si' ? 'Con zuncho' : zunchado === 'no' ? 'Sin zuncho' : 'Sin especificar'}
                </span>
              </div>
              {photo && (
                <div className="flex justify-between items-center text-neutral-600 pt-1.5 border-t border-neutral-200">
                  <span className="font-sans">Fotografía:</span>
                  <span className="font-sans text-brand-700 font-medium truncate max-w-[150px]">
                    {photo.name}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </ConfirmSaveModal>
    </>
  );
}
