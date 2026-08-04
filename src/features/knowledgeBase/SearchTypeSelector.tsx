'use client';

import type { ReactNode } from 'react';
import { Tabs, BuildingIcon, UserIcon, GlobeIcon } from '@/components/ui';
import type { KnowledgeEntryType } from '@/features/knowledgeBase/types';

interface SearchTypeSelectorProps {
  value: KnowledgeEntryType;
  onChange: (type: KnowledgeEntryType) => void;
}

const TYPE_TABS: { id: KnowledgeEntryType; label: string; icon: ReactNode }[] = [
  { id: 'company', label: 'Company', icon: <BuildingIcon size={14} /> },
  { id: 'recruiter', label: 'Recruiter', icon: <UserIcon size={14} /> },
  { id: 'domain', label: 'Domain', icon: <GlobeIcon size={14} /> },
];

export function SearchTypeSelector({ value, onChange }: SearchTypeSelectorProps) {
  return (
    <Tabs tabs={TYPE_TABS} active={value} onChange={(id) => onChange(id as KnowledgeEntryType)} />
  );
}
