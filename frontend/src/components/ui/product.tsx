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
  default: 'border-white/8 bg-[linear-gradient(180deg,rgba(24,33,57,0.92),rgba(17,24,43,0.92))]',
  muted: 'border-white/8 bg-[linear-gradient(180deg,rgba(18,24,40,0.82),rgba(13,19,34,0.82))]',
  accent: 'border-cyan-400/20 bg-[linear-gradient(180deg,rgba(24,46,68,0.92),rgba(18,36,55,0.92))]',
  warning: 'border-amber-300/20 bg-[linear-gradient(180deg,rgba(62,45,31,0.82),rgba(39,31,24,0.82))]'
};

export function PageHeader({ eyebrow, title, description, aside, className }: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="max-w-4xl">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.36em] text-[var(--accent-2)]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-[var(--text-strong)] sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-3xl text-[1.06rem] leading-8 text-[var(--text-muted)]">{description}</p> : null}
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
        'rounded-[30px] border p-6 shadow-[0_24px_60px_rgba(3,8,22,0.28)]',
        surfaceToneClasses[tone],
        className
      )}
    >
      {eyebrow || title || description || action ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? <p className="text-[0.72rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{eyebrow}</p> : null}
            {title ? <h2 className="mt-2 text-[1.95rem] font-semibold tracking-[-0.03em] text-[var(--text-strong)]">{title}</h2> : null}
            {description ? <p className="mt-2 text-[0.98rem] leading-7 text-[var(--text-muted)]">{description}</p> : null}
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
        'rounded-[22px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        surfaceToneClasses[tone],
        className
      )}
    >
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.34em] text-[var(--text-faint)]">{label}</p>
      <p className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--text-strong)]">{value}</p>
      {hint ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{hint}</p> : null}
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
        'flex items-center justify-between gap-4 rounded-[18px] border border-white/8 px-4 py-3',
        subdued ? 'bg-[rgba(11,16,28,0.32)]' : 'bg-[rgba(11,16,28,0.48)]',
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
      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
      : tone === 'warning'
        ? 'border-amber-300/20 bg-amber-400/10 text-amber-50'
        : 'border-white/10 bg-white/5 text-[var(--text-muted)]';

  return (
    <span className={clsx('inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.28em]', toneClass, className)}>
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
        'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-white/18 bg-white/12 text-[var(--text-strong)]'
          : 'border-white/10 bg-[rgba(8,12,23,0.24)] text-[var(--text-muted)] hover:bg-white/8 hover:text-[var(--text-strong)]',
        className
      )}
    >
      {children}
    </button>
  );
}
