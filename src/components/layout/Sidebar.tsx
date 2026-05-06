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
  // /quotes/new must not match /quotes
  if (href === '/quotes/new') return pathname === '/quotes/new';
  if (href === '/quotes') return pathname === '/quotes' || (pathname.startsWith('/quotes/') && pathname !== '/quotes/new');
  return pathname === href || pathname.startsWith(href + '/');
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
        <Zap size={20} className="text-blue-600" />
        <span className="text-sm font-semibold text-gray-900">Energy Platform</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
            {group.label && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 px-5 py-3">
        <p className="text-xs text-gray-400">Portfolio Demo v1.0</p>
      </div>
    </aside>
  );
}
