'use client';

import { cn } from '@/lib/cn';
import { PASSWORD_RULES } from '@/lib/password-policy';
import type { PasswordOwner } from '@/lib/password-policy';

export interface PasswordPolicyChecklistProps {
  password: string;
  owner?: PasswordOwner;
}

/**
 * Los requisitos de SPEC-100 §9.1, cada uno como una línea que pasa de gris a
 * verde mientras se escribe (§7.1).
 *
 * Se muestran los seis desde el principio, incluso sin haber escrito nada: la
 * alternativa —enseñar solo los incumplidos— hace que la lista salte y encoja
 * con cada tecla, y quien la mira no llega a saber cuántos requisitos había.
 */
export function PasswordPolicyChecklist({ password, owner = {} }: PasswordPolicyChecklistProps) {
  return (
    <ul className="flex flex-col gap-1" aria-label="Requisitos de la contraseña">
      {PASSWORD_RULES.map((rule) => {
        const cumplido = rule.isMet(password, owner);

        return (
          <li
            key={rule.id}
            data-testid={`password-rule-${rule.id}`}
            data-met={cumplido}
            // brand-700 y no success-600: ese verde sobre blanco da 3.3:1 de
            // contraste y el mínimo de SPEC-C01 §8 es 4.5:1 para texto. Este
            // llega a 5:1 y es el mismo verde de la marca.
            className={cn(
              'flex items-center gap-2 text-sm',
              cumplido ? 'text-brand-700' : 'text-neutral-500',
            )}
          >
            {/* El color por sí solo no comunica el estado a quien no lo
                distingue (SPEC-C01 §8): el icono cambia de forma, y el texto
                oculto lo dice explícitamente al lector de pantalla. */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              {cumplido ? (
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                />
              ) : (
                <circle cx="10" cy="10" r="3" />
              )}
            </svg>
            <span>{rule.label}</span>
            <span className="sr-only">{cumplido ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
