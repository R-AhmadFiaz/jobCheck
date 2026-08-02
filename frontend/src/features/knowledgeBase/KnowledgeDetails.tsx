import { Modal, AlertTriangleIcon } from '@/components/ui';
import { TrustScoreBadge } from '@/features/knowledgeBase/TrustScoreBadge';
import { RiskLevelBadge } from '@/features/knowledgeBase/RiskLevelBadge';
import { CommunityReportsSummary } from '@/features/knowledgeBase/CommunityReportsSummary';
import type { KnowledgeEntry } from '@/features/knowledgeBase/types';

interface KnowledgeDetailsProps {
  entry: KnowledgeEntry | null;
  onClose: () => void;
}

export function KnowledgeDetails({ entry, onClose }: KnowledgeDetailsProps) {
  return (
    <Modal open={entry !== null} onClose={onClose} title={entry?.name} size="lg">
      {entry && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <RiskLevelBadge level={entry.riskLevel} />
            {(entry.domain ?? entry.associatedCompany) && (
              <span className="text-sm text-[var(--muted-foreground)]">
                {entry.domain ?? entry.associatedCompany}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs text-[var(--muted-foreground)] mb-1.5">Trust score</p>
            <TrustScoreBadge score={entry.trustScore} />
          </div>

          <p className="text-sm text-[var(--foreground)] leading-relaxed">{entry.description}</p>

          {entry.indicators.length > 0 && (
            <div>
              <h4 className="font-bold text-[var(--foreground)] mb-2.5">Known Indicators</h4>
              <div className="space-y-2">
                {entry.indicators.map((indicator) => (
                  <div
                    key={indicator}
                    className="flex items-start gap-2.5 text-sm text-[var(--foreground)]"
                  >
                    <AlertTriangleIcon size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    {indicator}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border)]">
            <CommunityReportsSummary
              reports={entry.communityReports}
              verificationStatus={entry.verificationStatus}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
