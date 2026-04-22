import { SurfaceSection } from './ui/product';

type Props = {
  eyebrow?: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'accent' | 'warning';
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
    <SurfaceSection
      eyebrow={eyebrow}
      title={title}
      description={body}
      tone={tone}
      action={
        actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-[var(--text-strong)] transition hover:bg-white/8"
          >
            {actionLabel}
          </button>
        ) : undefined
      }
    />
  );
}
