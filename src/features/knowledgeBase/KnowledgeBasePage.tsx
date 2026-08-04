import { KnowledgeSearch } from '@/features/knowledgeBase/KnowledgeSearch';

export function KnowledgeBasePage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1
          className="text-2xl font-extrabold text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Knowledge Base
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Search company, recruiter, and domain reputation, backed by community reports.
        </p>
      </div>

      <KnowledgeSearch />
    </div>
  );
}
