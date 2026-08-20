import * as React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary select-none">
            {label}
          </label>
        )}
        <input
          type={type}
          id={id}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50',
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
Input.displayName = 'Input';
