import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
}

export function Card({ padding = true, className = '', style, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg ${padding ? 'p-5' : ''} ${className}`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', style, children }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base ${className}`}
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {children}
    </h3>
  );
}
