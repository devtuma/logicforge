'use client';

// Barra de abas para alternar entre saídas do projeto

import type { OutputConfig } from '@/lib/engine/types';
import { Tabs } from '@/components/ui/Tabs';

export interface OutputTabsProps {
  outputs: OutputConfig[];
  activeTab: string;
  onChange: (name: string) => void;
}

export function OutputTabs({ outputs, activeTab, onChange }: OutputTabsProps) {
  const tabs = outputs.map((output) => ({
    id: output.name,
    label: output.name,
  }));

  return <Tabs tabs={tabs} activeTab={activeTab} onChange={onChange} />;
}
