'use client';

import { ButtonHTMLAttributes, CSSProperties, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const baseStyle: Record<Variant, CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-strong)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
  },
  danger: {
    background: 'var(--color-danger-subtle)',
    color: 'var(--color-danger-text)',
    border: '1px solid var(--color-danger)',
  },
};

const hoverStyle: Record<Variant, CSSProperties> = {
  primary:   { background: 'var(--color-primary-hover)', color: '#ffffff', border: 'none' },
  secondary: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)' },
  ghost:     { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: 'none' },
  danger:    { background: 'var(--color-danger)', color: '#ffffff', border: '1px solid var(--color-danger)' },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', style, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: 'var(--font-body)', ...baseStyle[variant], ...style }}
      onMouseEnter={(e) => {
        if (!disabled) Object.assign((e.currentTarget as HTMLElement).style, hoverStyle[variant]);
      }}
      onMouseLeave={(e) => {
        if (!disabled) Object.assign((e.currentTarget as HTMLElement).style, baseStyle[variant]);
      }}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
export default Button;
