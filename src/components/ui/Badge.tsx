import {
  BillStatus,
  CollectionStage,
  ComplianceStatus,
  CustomerStatus,
  MarketMessageStatus,
  PaymentPlanStatus,
  ProductStatus,
  ProductType,
  QuoteStatus,
  SwitchStage,
  TaskPriority,
} from '@/lib/types';

type BadgeVariant =
  | QuoteStatus
  | ProductStatus
  | ProductType
  | CustomerStatus
  | TaskPriority
  | BillStatus
  | PaymentPlanStatus
  | CollectionStage
  | MarketMessageStatus
  | SwitchStage
  | ComplianceStatus
  | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  // Quote statuses
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  issued: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-200 text-gray-500',
  // Product statuses (draft shared with QuoteStatus)
  active: 'bg-green-100 text-green-700',
  deprecated: 'bg-red-100 text-red-600',
  // Product types
  flat_rate: 'bg-blue-100 text-blue-700',
  time_of_use: 'bg-purple-100 text-purple-700',
  dynamic: 'bg-orange-100 text-orange-700',
  export: 'bg-teal-100 text-teal-700',
  bundled: 'bg-pink-100 text-pink-700',
  // Customer statuses (active shared with ProductStatus)
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  closed: 'bg-gray-200 text-gray-500',
  // Task priorities
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  // Bill statuses (issued shared with QuoteStatus)
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  disputed: 'bg-yellow-100 text-yellow-700',
  // Payment plan statuses (active shared with ProductStatus)
  completed: 'bg-teal-100 text-teal-700',
  breached: 'bg-red-200 text-red-800',
  cancelled: 'bg-gray-200 text-gray-500',
  // Collection stages
  monitoring: 'bg-gray-100 text-gray-600',
  contact_attempted: 'bg-yellow-100 text-yellow-700',
  formal_notice: 'bg-orange-100 text-orange-700',
  field_visit: 'bg-red-100 text-red-700',
  legal: 'bg-red-200 text-red-800',
  // Market message statuses
  sent: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-teal-100 text-teal-700',
  // completed: shared with PaymentPlanStatus → teal
  failed: 'bg-red-100 text-red-700',
  // rejected: shared with QuoteStatus → red
  // Switch stages
  initiated: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  objected: 'bg-orange-100 text-orange-700',
  // completed/rejected: shared above
  // Compliance statuses
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  // completed/overdue: shared with PaymentPlanStatus/BillStatus above
  // fallback
  default: 'bg-gray-100 text-gray-600',
};

const labelOverrides: Partial<Record<BadgeVariant, string>> = {
  pending_review: 'Pending Review',
  flat_rate: 'Flat Rate',
  time_of_use: 'Time of Use',
  contact_attempted: 'Contact Attempted',
  formal_notice: 'Formal Notice',
  field_visit: 'Field Visit',
  in_progress: 'In Progress',
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

export default function Badge({ variant, className = '' }: BadgeProps) {
  const classes = variantClasses[variant] ?? variantClasses.default;
  const label =
    labelOverrides[variant] ??
    variant.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
