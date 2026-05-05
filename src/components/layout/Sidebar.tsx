'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, FileText, Tag, Zap } from 'lucide-react';

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/catalogue', label: 'Catalogue', icon: Package },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/pricing', label: 'Pricing Rules', icon: Tag },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
        <Zap size={20} className="text-blue-600" />
        <span className="text-sm font-semibold text-gray-900">Energy CPQ</span>
      </div>
      <nav className="flex-1 px-3 py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href);
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
      </nav>
      <div className="border-t border-gray-200 px-5 py-3">
        <p className="text-xs text-gray-400">Portfolio Demo v1.0</p>
      </div>
    </aside>
  );
}
