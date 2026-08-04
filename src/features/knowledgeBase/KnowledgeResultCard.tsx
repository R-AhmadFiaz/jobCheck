'use client';

import type { ReactNode } from 'react';
import {
  Card,
  Badge,
  Button,
  BuildingIcon,
  UserIcon,
  GlobeIcon,
  AlertTriangleIcon,
} from '@/components/ui';
import { TrustScoreBadge } from '@/features/knowledgeBase/TrustScoreBadge';
import { RiskLevelBadge } from '@/features/knowledgeBase/RiskLevelBadge';
import type { KnowledgeEntry } from '@/features/knowledgeBase/types';

const TYPE_ICON: Record<KnowledgeEntry['type'], ReactNode> = {
  company: <BuildingIcon size={20} />,
  recruiter: <UserIcon size={20} />,
  domain: <GlobeIcon size={20} />,
};

interface KnowledgeResultCardProps {
  entry: KnowledgeEntry;
  onViewDetails: (entry: KnowledgeEntry) => void;
}

export function KnowledgeResultCard({ entry, onViewDetails }: KnowledgeResultCardProps) {
  const previewIndicators = entry.indicators.slice(0, 2);

  return (
    <Card hover className="animate-fade-up">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-[var(--muted)] flex items-center justify-center flex-shrink-0 text-[var(--muted-foreground)]">
          {TYPE_ICON[entry.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-[var(--foreground)]">{entry.name}</h3>
            <RiskLevelBadge level={entry.riskLevel} />
          </div>
          {entry.type === 'recruiter' && entry.associatedCompany && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Claims to represent {entry.associatedCompany}
            </p>
          )}
          {entry.type === 'company' && entry.domain && (
            <p className="text-xs text-[var(--muted-foreground)]">{entry.domain}</p>
          )}
        </div>
        {entry.communityReports.length > 0 && (
          <Badge variant="danger">{entry.communityReports.length} reports</Badge>
        )}
      </div>

      <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-3">
        {entry.description}
      </p>

      <div className="mb-3">
        <p className="text-xs text-[var(--muted-foreground)] mb-1">Trust score</p>
        <TrustScoreBadge score={entry.trustScore} />
      </div>

      {previewIndicators.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {previewIndicators.map((indicator) => (
            <div
              key={indicator}
              className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]"
            >
              <AlertTriangleIcon size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
              {indicator}
            </div>
          ))}
          {entry.indicators.length > previewIndicators.length && (
            <p className="text-xs text-[var(--muted-foreground)] pl-[18px]">
              +{entry.indicators.length - previewIndicators.length} more
            </p>
          )}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" onClick={() => onViewDetails(entry)}>
        View details
      </Button>
    </Card>
  );
}
