import * as React from 'react';
import { cn } from '../../lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary select-none">
            {label}
          </label>
        )}
        <textarea
          id={id}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 resize-y',
            error && 'border-error focus:border-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <span className="text-xs text-error font-medium">{error}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
