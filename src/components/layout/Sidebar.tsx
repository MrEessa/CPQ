'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FilePlus,
  FileText,
  Tag,
  Users,
  Receipt,
  AlertTriangle,
  Radio,
  BarChart2,
  Landmark,
  Zap,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Acquisition & Onboarding',
    items: [
      { href: '/catalogue', label: 'Product Catalogue', icon: Package },
      { href: '/quotes/new', label: 'Quote Builder', icon: FilePlus },
      { href: '/quotes', label: 'Quotes', icon: FileText },
      { href: '/pricing', label: 'Pricing Rules', icon: Tag },
    ],
  },
  {
    label: 'Customer Operations',
    items: [
      { href: '/customers', label: 'Customers', icon: Users },
      { href: '/billing', label: 'Billing', icon: Receipt },
      { href: '/debt', label: 'Debt & Collections', icon: AlertTriangle },
    ],
  },
  {
    label: 'Market & Compliance',
    items: [{ href: '/market', label: 'Market Communications', icon: Radio }],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/analytics', label: 'Analytics', icon: BarChart2 },
      { href: '/finance', label: 'Financial Control', icon: Landmark },
    ],
  },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  if (href === '/quotes/new') return pathname === '/quotes/new';
  if (href === '/quotes') return pathname === '/quotes' || (pathname.startsWith('/quotes/') && pathname !== '/quotes/new');
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-screen w-60 flex-col shrink-0"
      style={{
        background: 'var(--bg-subtle)',
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <Zap size={18} style={{ color: 'var(--color-primary)' }} />
        <span
          className="text-sm"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Energy Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p
                className="mb-1 px-3 uppercase"
                style={{
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  color: 'var(--text-tertiary)',
                  fontWeight: 500,
                }}
              >
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className="mb-0.5 flex items-center gap-2.5 py-2 pr-3 text-sm nav-item"
                  style={
                    active
                      ? {
                          background: 'var(--sidebar-active-bg)',
                          borderLeft: '2px solid var(--sidebar-active-border)',
                          borderRadius: '0 6px 6px 0',
                          paddingLeft: '10px',
                          color: 'var(--sidebar-active-text)',
                          fontWeight: 500,
                          transition: 'color 150ms ease',
                        }
                      : {
                          borderRadius: '6px',
                          paddingLeft: '12px',
                          color: 'var(--text-secondary)',
                          transition: 'color 150ms ease',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid var(--border-default)' }}
      >
        <p
          className="text-xs"
          style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
        >
          Portfolio Demo v1.0
        </p>
      </div>
    </aside>
  );
}
