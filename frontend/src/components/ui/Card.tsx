import * as React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-surface text-text-primary shadow-sm p-6',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
