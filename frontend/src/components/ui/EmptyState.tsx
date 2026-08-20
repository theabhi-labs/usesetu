import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center bg-surface">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center">
        <h3 className="mt-4 text-lg font-semibold text-text-primary select-none">{title}</h3>
        <p className="mt-2 mb-6 text-sm text-text-secondary select-none">{description}</p>
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
