import { Badge, EmptyState, ClockIcon, ShieldCheckIcon } from '@/components/ui';
import type { CommunityReportEntry, VerificationStatus } from '@/features/knowledgeBase/types';

interface CommunityReportsSummaryProps {
  reports: CommunityReportEntry[];
  verificationStatus: VerificationStatus;
}

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  community_verified: 'Community Verified',
  admin_verified: 'Admin Verified',
};

const VERIFICATION_VARIANT: Record<VerificationStatus, 'default' | 'info' | 'safe'> = {
  unverified: 'default',
  community_verified: 'info',
  admin_verified: 'safe',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CommunityReportsSummary({
  reports,
  verificationStatus,
}: CommunityReportsSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-[var(--foreground)]">Community Reports</h4>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {reports.length} report{reports.length === 1 ? '' : 's'} on file
          </p>
        </div>
        <Badge variant={VERIFICATION_VARIANT[verificationStatus]}>
          <ShieldCheckIcon size={10} />
          {VERIFICATION_LABEL[verificationStatus]}
        </Badge>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={<ShieldCheckIcon />}
          title="No community reports"
          description="No issues have been reported for this entry."
        />
      ) : (
        <div className="space-y-2.5">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {report.category}
                </span>
                <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1 flex-shrink-0">
                  <ClockIcon size={10} />
                  {formatDate(report.reportedAt)}
                </span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1 leading-relaxed">
                {report.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
