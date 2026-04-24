import clsx from 'clsx';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  className?: string;
};

type SurfaceTone = 'default' | 'muted' | 'accent' | 'warning';

type SurfaceSectionProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  tone?: SurfaceTone;
  className?: string;
  contentClassName?: string;
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: SurfaceTone;
  className?: string;
};

const surfaceToneClasses: Record<SurfaceTone, string> = {
  default: 'border-[color:var(--line)] bg-[color:var(--panel)]',
  muted: 'border-[color:var(--line)] bg-[color:var(--paper-soft)]',
  accent: 'border-[color:var(--academic-blue-line)] bg-[color:var(--academic-blue-soft)]',
  warning: 'border-[color:var(--gold-line)] bg-[color:var(--gold-soft)]'
};

export function PageHeader({ eyebrow, title, description, aside, className }: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="max-w-4xl">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[var(--brass)]">{eyebrow}</p>
        <h1 className="serif-display mt-1.5 text-[2.35rem] font-semibold leading-tight text-[var(--text-strong)] sm:text-[2.75rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-[0.98rem] leading-7 text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

export function SurfaceSection({
  eyebrow,
  title,
  description,
  action,
  children,
  tone = 'default',
  className,
  contentClassName
}: SurfaceSectionProps) {
  return (
    <section
      className={clsx(
        'rounded-[14px] border p-4 shadow-[var(--shadow-soft)] md:p-5',
        surfaceToneClasses[tone],
        className
      )}
    >
      {eyebrow || title || description || action ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--brass)]">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1.5 text-[1.38rem] font-semibold leading-snug text-[var(--text-strong)]">{title}</h2> : null}
            {description ? <p className="mt-1.5 text-[0.95rem] leading-6 text-[var(--text-muted)]">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children ? <div className={clsx(eyebrow || title || description || action ? 'mt-5' : '', contentClassName)}>{children}</div> : null}
    </section>
  );
}

export function MetricCard({ label, value, hint, tone = 'muted', className }: MetricCardProps) {
  return (
    <div
      className={clsx(
        'min-w-[150px] rounded-[12px] border px-3.5 py-3',
        surfaceToneClasses[tone],
        className
      )}
    >
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-[var(--brass)]">{label}</p>
      <p className="mt-1.5 text-[1.8rem] font-semibold leading-none text-[var(--text-strong)]">{value}</p>
      {hint ? <p className="mt-1.5 text-[0.82rem] leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function StatRow({
  label,
  value,
  subdued = false,
  className
}: {
  label: string;
  value: ReactNode;
  subdued?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-4 border-b border-[color:var(--line-soft)] px-1 py-2.5 last:border-b-0',
        subdued ? 'bg-transparent' : 'bg-transparent',
        className
      )}
    >
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--text-strong)]">{value}</span>
    </div>
  );
}

export function QuietBadge({
  children,
  tone = 'default',
  className
}: {
  children: ReactNode;
  tone?: SurfaceTone;
  className?: string;
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-[color:var(--academic-blue-line)] bg-[color:var(--academic-blue-soft)] text-[var(--academic-blue)]'
      : tone === 'warning'
        ? 'border-[color:var(--gold-line)] bg-[color:var(--gold-soft)] text-[var(--brass)]'
        : 'border-[color:var(--line)] bg-[color:var(--paper-soft)] text-[var(--text-muted)]';

  return (
    <span className={clsx('inline-flex items-center rounded-[8px] border px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em]', toneClass, className)}>
      {children}
    </span>
  );
}

export function SectionButton({
  children,
  active = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded-[10px] border px-3.5 py-2 text-sm font-medium transition active:translate-y-px',
        active
          ? 'border-[var(--academic-blue)] bg-[var(--academic-blue-soft)] text-[var(--academic-blue)]'
          : 'border-[color:var(--line)] bg-[rgba(255,253,248,0.74)] text-[var(--text-muted)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-card)] hover:text-[var(--text-strong)]',
        className
      )}
    >
      {children}
    </button>
  );
}
