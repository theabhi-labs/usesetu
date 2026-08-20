import * as React from 'react';
import { cn } from '../../lib/cn';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 text-left">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={id}
            className={cn(
              'h-4 w-4 rounded border-border bg-surface text-accent focus:ring-accent focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer accent-accent',
              error && 'border-error',
              className
            )}
            ref={ref}
            {...props}
          />
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-text-secondary select-none cursor-pointer">
              {label}
            </label>
          )}
        </div>
        {error && <span className="text-xs text-error font-medium">{error}</span>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
