'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
    </Link>
  );
}

export default NavLink;
