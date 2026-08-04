import type { ReactNode } from 'react';
import {
  Badge,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from '@/components/ui';
import type { KnowledgeRiskLevel } from '@/features/knowledgeBase/types';

const CONFIG: Record<
  KnowledgeRiskLevel,
  { label: string; variant: 'safe' | 'warning' | 'danger'; icon: ReactNode }
> = {
  safe: { label: 'Safe', variant: 'safe', icon: <CheckCircleIcon size={11} /> },
  suspicious: { label: 'Suspicious', variant: 'warning', icon: <AlertTriangleIcon size={11} /> },
  high_risk: { label: 'High Risk', variant: 'danger', icon: <ShieldAlertIcon size={11} /> },
  confirmed_scam: { label: 'Confirmed Scam', variant: 'danger', icon: <XCircleIcon size={11} /> },
};

export function RiskLevelBadge({ level }: { level: KnowledgeRiskLevel }) {
  const { label, variant, icon } = CONFIG[level];
  return (
    <Badge variant={variant}>
      {icon}
      {label}
    </Badge>
  );
}
