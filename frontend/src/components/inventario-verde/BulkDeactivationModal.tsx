'use client';

import { useState } from 'react';
import type { Species, Specimen } from '@shared/types';
import { Button, Modal } from '@/components/ui';

export interface BulkDeactivationModalProps {
  isOpen: boolean;
  specimens: Specimen[];
  speciesMap?: Record<string, Pick<Species, 'slug' | 'commonName' | 'vegetationTypeCode' | 'scientificName'> & { imageUrl?: string | null }>;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function SpecimenRowThumbnail({
  specimen,
  fallbackUrl,
}: {
  specimen: Specimen;
  fallbackUrl?: string | null;
}) {
  const [error, setError] = useState(false);
  const rawThumb = specimen.thumbnailUrl || specimen.imageUrl;
  const thumbSrc = rawThumb ? rawThumb.replace(/sz=w\d+/, 'sz=w120') : null;
  const displaySrc = thumbSrc && !error ? thumbSrc : fallbackUrl;
  const isReferential = Boolean(fallbackUrl && (!thumbSrc || error));

  return (
    <div
      aria-hidden="true"
      className="relative h-11 w-11 rounded-lg overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200/90 shadow-2xs"
    >
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-neutral-400">
          <svg className="w-5 h-5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
          </svg>
        </div>
      )}
      {isReferential && (
        <span
          title="Fotografía botánica referencial"
          className="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-[8px] text-white font-medium text-center py-0.5 leading-none"
        >
          Ref
        </span>
      )}
    </div>
  );
}

export function BulkDeactivationModal({
  isOpen,
  specimens,
  speciesMap,
  onClose,
  onConfirm,
}: BulkDeactivationModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirm() {
    const normalized = reason.trim();
    if (!normalized || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar la baja masiva. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  const count = specimens.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!saving) onClose(); }}
      title={`Confirmar baja definitiva (${count} ${count === 1 ? 'ejemplar' : 'ejemplares'})`}
      size="md"
      closeOnOverlayClick={!saving}
      closeOnEsc={!saving}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            loading={saving}
            disabled={saving || !reason.trim()}
          >
            {saving ? 'Dando de baja...' : `Dar de baja ${count} ${count === 1 ? 'ejemplar' : 'ejemplares'}`}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4 text-sm text-neutral-700">
        {/* Advertencia preventiva */}
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-900 leading-relaxed space-y-1">
          <p className="font-semibold text-red-950">
            Esta acción dará de baja definitiva a {count} {count === 1 ? 'ejemplar' : 'ejemplares'}.
          </p>
          <p>
            No se borrarán sus historiales ni intervenciones pasadas, pero las fichas quedarán inactivas y no podrán reactivarse.
          </p>
        </div>

        {/* Listado compacto de ejemplares a retirar */}
        <div>
          <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
            Ejemplares a retirar ({count})
          </label>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50/50 divide-y divide-neutral-200">
            {specimens.map((specimen) => {
              const specSpecies = speciesMap?.[specimen.speciesSlug ?? ''];
              const commonName = specimen.speciesCommonName || specSpecies?.commonName || 'Ejemplar botánico';
              const scientificName = specimen.speciesScientificName || specSpecies?.scientificName;
              const location = specimen.sourceLocation || 'Campus PUCP';

              return (
                <div key={specimen.code} className="flex items-center gap-3 p-2.5 hover:bg-neutral-100/60 transition-colors">
                  <SpecimenRowThumbnail specimen={specimen} fallbackUrl={specSpecies?.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-900">{specimen.code}</span>
                      {specimen.sourceReference && (
                        <span className="font-mono text-[10px] text-neutral-500 bg-neutral-200/60 px-1.5 py-0.5 rounded">
                          Ref: {specimen.sourceReference}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-800 font-medium truncate">
                      {commonName}
                      {scientificName && (
                        <span className="italic text-neutral-500 font-serif font-normal ml-1.5">
                          ({scientificName})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate">📍 {location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivo de baja compartido */}
        <div className="space-y-1.5">
          <label htmlFor="bulk-deactivation-reason" className="block text-sm font-medium text-neutral-800">
            Motivo del retiro <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <textarea
            id="bulk-deactivation-reason"
            aria-label="Motivo del retiro"
            placeholder="Ej: Retiro por inicio de obras del nuevo Complejo de Innovación"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            required
            disabled={saving}
            className="w-full rounded-xl border border-neutral-300 bg-neutral-0 p-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-600 focus:outline-hidden focus:ring-1 focus:ring-brand-600 disabled:opacity-60"
          />
          <div className="flex justify-between items-center text-xs text-neutral-500">
            <span>Motivo compartido para todos los ejemplares seleccionados.</span>
            <span>{reason.length}/500</span>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 font-medium">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
