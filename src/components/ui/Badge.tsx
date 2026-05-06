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

interface BadgeStyle {
  background: string;
  color: string;
  border?: string;
}

const neutral: BadgeStyle = {
  background: 'var(--bg-elevated)',
  color: 'var(--text-tertiary)',
  border: '1px solid var(--border-default)',
};

const success: BadgeStyle = {
  background: 'var(--color-success-subtle)',
  color: 'var(--color-success-text)',
};

const primary: BadgeStyle = {
  background: 'var(--color-primary-subtle)',
  color: 'var(--color-primary-text)',
};

const warning: BadgeStyle = {
  background: 'var(--color-warning-subtle)',
  color: 'var(--color-warning-text)',
};

const danger: BadgeStyle = {
  background: 'var(--color-danger-subtle)',
  color: 'var(--color-danger-text)',
};

const accent: BadgeStyle = {
  background: 'var(--color-accent-subtle)',
  color: 'var(--color-accent-text)',
};

const variantStyles: Record<BadgeVariant, BadgeStyle> = {
  // Quote statuses
  draft:          primary,
  pending_review: warning,
  issued:         primary,
  accepted:       success,
  rejected:       danger,
  expired:        neutral,
  // Product statuses
  active:         success,
  deprecated:     neutral,
  // Product types
  flat_rate:      primary,
  time_of_use:    { background: 'var(--color-info-subtle)', color: 'var(--color-info-text)' },
  dynamic:        accent,
  export:         success,
  bundled:        warning,
  // Customer statuses
  pending:        warning,
  suspended:      danger,
  closed:         neutral,
  // Task priorities
  low:            neutral,
  medium:         primary,
  high:           accent,
  critical:       danger,
  // Bill statuses
  paid:           success,
  overdue:        danger,
  disputed:       warning,
  // Payment plan statuses
  completed:      success,
  breached:       danger,
  cancelled:      neutral,
  // Collection stages
  monitoring:     primary,
  contact_attempted: warning,
  formal_notice:  accent,
  field_visit:    danger,
  legal:          danger,
  // Market message statuses
  sent:           primary,
  acknowledged:   success,
  failed:         danger,
  // Switch stages
  initiated:      warning,
  confirmed:      success,
  objected:       warning,
  // Compliance statuses
  open:           warning,
  in_progress:    warning,
  // Fallback
  default:        neutral,
};

const labelOverrides: Partial<Record<BadgeVariant, string>> = {
  pending_review:    'Pending Review',
  flat_rate:         'Flat Rate',
  time_of_use:       'Time of Use',
  contact_attempted: 'Contact Attempted',
  formal_notice:     'Formal Notice',
  field_visit:       'Field Visit',
  in_progress:       'In Progress',
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
}

export default function Badge({ variant, className = '' }: BadgeProps) {
  const s = variantStyles[variant] ?? neutral;
  const label =
    labelOverrides[variant] ??
    variant.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      style={{
        background: s.background,
        color: s.color,
        border: s.border,
        fontFamily: 'var(--font-body)',
      }}
    >
      {label}
    </span>
  );
}
