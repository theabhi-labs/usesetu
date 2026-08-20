import * as React from 'react';
import { cn } from '../../lib/cn';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-text-secondary select-none">
            {label}
          </label>
        )}
        <select
          id={id}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
            error && 'border-error focus:border-error',
            className
          )}
          ref={ref}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-error font-medium">{error}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';
