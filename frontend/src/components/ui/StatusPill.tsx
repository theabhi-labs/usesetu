import { Badge } from './Badge';

type StatusType =
  | 'draft'
  | 'submitted'
  | 'pending_payment'
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | string;

interface StatusPillProps {
  status: StatusType;
}

export function StatusPill({ status }: StatusPillProps) {
  const statusLabel = status.replace('_', ' ').toLowerCase();

  let variant: 'default' | 'accent' | 'secondary' | 'success' | 'danger' | 'warning' = 'default';

  switch (status.toLowerCase()) {
    case 'approved':
    case 'completed':
    case 'success':
    case 'verified':
    case 'paid':
      variant = 'success';
      break;
    case 'submitted':
    case 'in_progress':
    case 'active':
      variant = 'accent';
      break;
    case 'pending':
    case 'pending_payment':
    case 'warning':
      variant = 'warning';
      break;
    case 'rejected':
    case 'cancelled':
    case 'error':
    case 'failed':
      variant = 'danger';
      break;
    case 'draft':
    case 'inactive':
      variant = 'secondary';
      break;
    default:
      variant = 'default';
  }

  return (
    <Badge variant={variant} className="capitalize font-mono tracking-tight select-none">
      {statusLabel}
    </Badge>
  );
}
