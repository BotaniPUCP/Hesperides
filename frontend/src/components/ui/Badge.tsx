export type BadgeColor = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  label: string;
  color?: BadgeColor;
}

const colors: Record<BadgeColor, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-green-100 text-green-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-sky-100 text-sky-800',
};

export function Badge({ label, color = 'neutral' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {label}
    </span>
  );
}