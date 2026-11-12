/** Un campo obligatorio de fecha u hora del formulario de reserva (SPEC-107 §5.1). */
export function ReservationTimeField({ label, type, value, onChange }: {
  label: string; type: 'date' | 'time'; value: string; onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-neutral-700">
      {label}<span className="ml-0.5 text-action-danger">*</span>
      <input type={type} required value={value} onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-base text-neutral-900" />
    </label>
  );
}
