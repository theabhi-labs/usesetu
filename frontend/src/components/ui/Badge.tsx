import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none select-none border',
  {
    variants: {
      variant: {
        default: 'bg-border text-text-primary border-transparent',
        accent: 'bg-accent/15 text-accent border-accent/20',
        secondary: 'bg-surface-elevated text-text-secondary border-border',
        success: 'bg-success/15 text-success border-success/20',
        danger: 'bg-error/15 text-error border-error/20',
        warning: 'bg-warning/15 text-warning border-warning/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
