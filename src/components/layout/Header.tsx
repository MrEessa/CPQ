'use client';

import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/catalogue': 'Product Catalogue',
  '/quotes': 'Quotes',
  '/quotes/new': 'New Quote',
  '/pricing': 'Pricing Rules',
};

function getTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/catalogue/')) return 'Product Detail';
  if (pathname.startsWith('/quotes/')) return 'Quote Detail';
  return 'Energy CPQ';
}

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="flex h-14 items-center border-b border-gray-200 bg-white px-6">
      <h1 className="text-sm font-semibold text-gray-900">{getTitle(pathname)}</h1>
    </header>
  );
}
