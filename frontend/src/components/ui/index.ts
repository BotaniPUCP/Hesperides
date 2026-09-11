// Punto de entrada único del design system: las pantallas importan de aquí,
// nunca del archivo suelto de cada componente.
export { Button } from './Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';

export { Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { Toast } from './Toast';
export type { ToastData, ToastOptions, ToastVariant } from './Toast';

export { ToastProvider, useToast } from './ToastProvider';
export type { UseToastReturn } from './ToastProvider';

export { DataTable } from './DataTable';
export type { DataTableColumn, DataTableProps, DataTableSort } from './DataTable';

export { Card } from './Card';
export type { CardProps } from './Card';

export { LoadingSkeleton } from './LoadingSkeleton';
export type { LoadingSkeletonProps } from './LoadingSkeleton';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { Badge } from './Badge';
export type { BadgeColor, BadgeProps } from './Badge';

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { UrgencyBadge } from './UrgencyBadge';
export type { UrgencyBadgeProps, UrgencyCode } from './UrgencyBadge';
