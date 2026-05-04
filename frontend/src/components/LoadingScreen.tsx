import clsx from 'clsx';

type LoadingScreenProps = {
  className?: string;
  compact?: boolean;
  label?: string;
};

export default function LoadingScreen({
  className,
  compact = false,
  label = 'Loading Convergent'
}: LoadingScreenProps) {
  return (
    <div
      className={clsx(
        'convergent-loader',
        compact ? 'convergent-loader--compact' : 'convergent-loader--screen',
        className
      )}
      role="status"
      aria-label={label}
    >
      <div className="convergent-loader__stage" aria-hidden="true">
        <span className="convergent-loader__quiet-grid" />
        <span className="convergent-loader__ring convergent-loader__ring--outer" />
        <span className="convergent-loader__ring convergent-loader__ring--middle" />
        <span className="convergent-loader__ring convergent-loader__ring--inner" />

        <span className="convergent-loader__orbit convergent-loader__orbit--wide">
          <span className="convergent-loader__dot convergent-loader__dot--blue" />
          <span className="convergent-loader__dot convergent-loader__dot--cream" />
        </span>
        <span className="convergent-loader__orbit convergent-loader__orbit--slow">
          <span className="convergent-loader__dot convergent-loader__dot--slate" />
        </span>
        <span className="convergent-loader__orbit convergent-loader__orbit--tight">
          <span className="convergent-loader__dot convergent-loader__dot--brass" />
        </span>

        <span className="convergent-loader__badge">
          <span className="identity-serif convergent-loader__mark">C</span>
        </span>
      </div>
    </div>
  );
}
