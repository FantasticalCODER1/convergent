type Props = {
  eyebrow?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'accent' | 'warning';
};

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'border-white/10 bg-white/5 text-white/70',
  accent: 'border-cyan-300/20 bg-cyan-500/5 text-cyan-50',
  warning: 'border-amber-300/20 bg-amber-500/5 text-amber-50'
};

export function EmptyStateCard({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  tone = 'default'
}: Props) {
  return (
    <div className={`rounded-3xl border p-6 shadow-glass ${toneClasses[tone]}`}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-white/45">{eyebrow}</p> : null}
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 rounded-2xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
