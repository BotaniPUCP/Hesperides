export interface CardProps {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  padded?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({ title, actions, children, padded = true, onClick, className = '' }: CardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      className={`rounded-lg bg-white shadow-sm ${interactive ? 'cursor-pointer shadow-sm hover:shadow-lg' : ''} ${
        padded ? 'p-4 md:p-6' : ''
      } ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          {title && <h3 className="text-xl font-semibold text-slate-900">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}