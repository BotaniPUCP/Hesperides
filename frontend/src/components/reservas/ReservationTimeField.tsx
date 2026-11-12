/** Un campo obligatorio de fecha u hora del formulario de reserva (SPEC-107 §5.1). */
export function ReservationTimeField({ label, type, value, onChange, errorMessage }: {
  label: string; type: 'date' | 'time'; value: string; onChange: (value: string) => void;
  /** Regla del formulario que el campo incumple; resalta el campo además del aviso superior. */
  errorMessage?: string;
}) {
  const describedBy = errorMessage ? `${type}-error` : undefined;
  return (
    <label className="grid gap-1 text-sm font-medium text-neutral-700">
      {label}<span className="ml-0.5 text-action-danger">*</span>
      <input type={type} required value={value} onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(errorMessage) || undefined} aria-describedby={describedBy}
        className={`h-10 rounded-md border bg-neutral-0 px-3 text-base text-neutral-900 ${errorMessage
          ? 'border-action-danger' : 'border-neutral-200'}`} />
      {errorMessage && (
        <span id={`${type}-error`} role="alert" className="text-xs font-normal text-action-danger">
          {errorMessage}
        </span>
      )}
    </label>
  );
}
