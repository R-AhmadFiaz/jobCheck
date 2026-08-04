import { Progress } from '@/components/ui';

interface TrustScoreBadgeProps {
  score: number;
  className?: string;
}

function scoreVariant(score: number): 'safe' | 'warning' | 'danger' {
  if (score >= 70) return 'safe';
  if (score >= 40) return 'warning';
  return 'danger';
}

function scoreTextColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export function TrustScoreBadge({ score, className = '' }: TrustScoreBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 min-w-[60px]">
        <Progress value={score} variant={scoreVariant(score)} />
      </div>
      <span className={`text-sm font-bold font-mono ${scoreTextColor(score)}`}>{score}</span>
    </div>
  );
}
