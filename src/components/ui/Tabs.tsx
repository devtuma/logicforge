'use client';

// Componente de abas com estado ativo e estilo industrial

import { cn } from '@/lib/utils';

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
