'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'search';
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  leadingIcon?: ReactNode;
  onBlur?: () => void;
}

export function Input({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  helperText,
  errorMessage,
  disabled = false,
  required = false,
  maxLength,
  leadingIcon,
  onBlur,
}: InputProps) {
  const hasError = Boolean(errorMessage);
  const describedBy = hasError ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="ml-0.5 text-action-danger">*</span>}
      </label>

      <div className="relative">
        {leadingIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-md border bg-neutral-0 px-3 text-base text-neutral-900',
            'placeholder:text-neutral-500',
            'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500',
            leadingIcon && 'pl-10',
            hasError ? 'border-action-danger' : 'border-neutral-200 hover:border-neutral-500',
          )}
        />
      </div>

      {/* El error sustituye al texto de ayuda: apilar ambos compite por la
          atención justo cuando hay algo que corregir. */}
      {hasError ? (
        <p id={`${id}-error`} className="text-sm text-action-danger">
          {errorMessage}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-neutral-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
