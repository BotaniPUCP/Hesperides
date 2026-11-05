'use client';

import type { ReactNode } from 'react';
import { Button, Modal } from '@/components/ui';

export interface ConfirmSaveModalProps {
  isOpen: boolean;
  title: string;
  specimenCode: string;
  subtitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isWorking?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}

/**
 * Modal de confirmación para acciones oficiales de guardado en el Catastro Verde.
 * Sigue los principios de SPEC-C01 (§4, §9) y el sistema de tokens temáticos de Hespérides:
 * - Utiliza los tokens `brand-*` y `neutral-*` que se autoinvierten en modo oscuro según globals.css.
 * - Nombra explícitamente a la entidad afectada (Ejemplar {specimenCode}).
 * - Muestra un resumen previo de los datos antes de asentarlos en el historial.
 * - `sm` para mantener proporción y no saturar en pantalla móvil.
 * - Atrapa el foco y soporta navegación accesible por teclado (Tab / Esc / Enter).
 */
export function ConfirmSaveModal({
  isOpen,
  title,
  specimenCode,
  subtitle = 'Confirmación de registro oficial en catastro',
  confirmLabel = 'Confirmar y guardar',
  cancelLabel = 'Revisar datos',
  isWorking = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmSaveModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      closeOnOverlayClick={!isWorking}
      closeOnEsc={!isWorking}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="ghost" onClick={onCancel} disabled={isWorking} size="sm">
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isWorking} size="sm">
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5 text-xs text-neutral-700">
        {/* Cabecera contextual del ejemplar usando tokens temáticos de marca */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-brand-50 border border-brand-200">
          <span className="p-1.5 rounded-lg bg-brand-100 text-brand-800 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold tracking-wider text-brand-800 truncate">
              {subtitle}
            </p>
            <p className="font-mono font-bold text-neutral-900 text-xs">
              Ejemplar {specimenCode}
            </p>
          </div>
        </div>

        {children}
      </div>
    </Modal>
  );
}
