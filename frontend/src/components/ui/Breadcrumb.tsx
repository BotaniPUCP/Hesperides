'use client';

import Link from 'next/link';
import { useRememberedHref } from '@/hooks/useRememberedHref';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Volver a un listado por el breadcrumb lo encuentra con los filtros que tenía. */
function CrumbLink({ href, label }: { href: string; label: string }) {
  const remembered = useRememberedHref(href);
  return (
    <Link href={remembered} className="text-neutral-700 font-medium transition-colors hover:text-brand-700 hover:underline">
      {label}
    </Link>
  );
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('surface-pill text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-neutral-700">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'truncate max-w-[200px] md:max-w-xs',
                    isLast ? 'font-semibold text-neutral-900' : 'text-neutral-700 font-medium'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <CrumbLink href={item.href} label={item.label} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
