'use client';

import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/catalogue': 'Product Catalogue',
  '/quotes': 'Quotes',
  '/quotes/new': 'New Quote',
  '/pricing': 'Pricing Rules',
  '/customers': 'Customers',
  '/billing': 'Billing',
  '/debt': 'Debt & Collections',
  '/market': 'Market Communications',
  '/analytics': 'Analytics',
  '/finance': 'Financial Control',
  '/settings': 'Settings',
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/catalogue/')) return 'Product Detail';
  if (pathname.startsWith('/quotes/') && pathname !== '/quotes/new') return 'Quote Detail';
  if (pathname.startsWith('/customers/')) return 'Customer Detail';
  if (pathname.startsWith('/billing/')) return 'Bill Detail';
  if (pathname.startsWith('/debt/')) return 'Debt Detail';
  return 'Energy CPQ';
}

export default function Header() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header
      className="flex h-14 items-center justify-between px-6 shrink-0"
      style={{
        background: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <h1
        className="text-sm"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {getTitle(pathname)}
      </h1>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex items-center justify-center transition-colors"
        style={{
          width: 32,
          height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')
        }
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
