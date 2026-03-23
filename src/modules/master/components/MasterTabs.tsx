'use client';

import { useState } from 'react';
import { ProjectUnitTab } from './ProjectUnitTab';
import { PartTab } from './PartTab';
import { MachineTab } from './MachineTab';
import { BoxTab } from './BoxTab';

interface MasterTabsProps {
  initialData: {
    projects: any[];
    units: any[];
    parts: any[];
    machines: any[];
    boxes: any[];
  };
}

export function MasterTabs({ initialData }: MasterTabsProps) {
  const [activeTab, setActiveTab] = useState('projects');

  const tabs = [
    { id: 'projects', label: 'プロジェクト・ユニット' },
    { id: 'parts', label: '部品' },
    { id: 'machines', label: '製造機' },
    { id: 'boxes', label: '保管BOX' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'projects' && (
          <ProjectUnitTab projects={initialData.projects} units={initialData.units} />
        )}
        {activeTab === 'parts' && (
          <PartTab initialParts={initialData.parts} units={initialData.units} />
        )}
        {activeTab === 'machines' && (
          <MachineTab initialMachines={initialData.machines} />
        )}
        {activeTab === 'boxes' && (
          <BoxTab initialBoxes={initialData.boxes} />
        )}
      </div>
    </div>
  );
}
