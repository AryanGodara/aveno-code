'use client';

import { useTheme } from '@/components/theme-provider';
import { Rocket, FolderOpen } from 'lucide-react';

const sidebarItems = [
  {
    name: 'Dashboard',
    icon: Rocket,
    href: '/dashboard',
    current: true,
  },
  {
    name: 'Projects',
    icon: FolderOpen,
    href: '/dashboard/projects',
    current: false,
  },
];

export function DashboardSidebar() {
  const { theme } = useTheme();

  return (
    <aside className={`w-64 h-full border-r border-border bg-card/50 backdrop-blur-sm ${
      theme === 'brutal' ? 'brutal-border-thick' : ''
    }`}>
      <nav className="p-6 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium font-switzer transition-colors ${
                item.current
                  ? theme === 'neon'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : theme === 'brutal'
                    ? 'bg-sky-500 text-black brutal-shadow'
                    : 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}