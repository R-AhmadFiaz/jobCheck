'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Button, EmptyState, Skeleton, Alert, SearchIcon } from '@/components/ui';
import { SearchTypeSelector } from '@/features/knowledgeBase/SearchTypeSelector';
import { KnowledgeResultCard } from '@/features/knowledgeBase/KnowledgeResultCard';
import { KnowledgeDetails } from '@/features/knowledgeBase/KnowledgeDetails';
import { searchKnowledgeBase } from '@/features/knowledgeBase/api/knowledgeBase.api';
import type { KnowledgeEntry, KnowledgeEntryType } from '@/features/knowledgeBase/types';

const PLACEHOLDER_BY_TYPE: Record<KnowledgeEntryType, string> = {
  company: 'Search by company name, e.g. "Bright Path Solutions"',
  recruiter: 'Search by recruiter name, e.g. "Alex Turner"',
  domain: 'Search by domain, e.g. "example.com"',
};

export function KnowledgeSearch() {
  const [searchType, setSearchType] = useState<KnowledgeEntryType>('company');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeEntry | null>(null);

  const hasSearched = submittedQuery !== null;

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['knowledge-base', 'search', searchType, submittedQuery],
    queryFn: () => searchKnowledgeBase(searchType, submittedQuery ?? ''),
    enabled: hasSearched,
  });

  const handleTypeChange = (type: KnowledgeEntryType) => {
    setSearchType(type);
    // Require an explicit re-search under the new type rather than silently
    // reusing stale results from a different entity type.
    setSubmittedQuery(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSubmittedQuery(query.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up stagger-1">
        <SearchTypeSelector value={searchType} onChange={handleTypeChange} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 animate-fade-up stagger-2"
      >
        <div className="flex-1">
          <Input
            placeholder={PLACEHOLDER_BY_TYPE[searchType]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<SearchIcon size={16} />}
          />
        </div>
        <Button type="submit" icon={<SearchIcon size={14} />} disabled={!query.trim()}>
          Search
        </Button>
      </form>

      <div className="animate-fade-in">
        {!hasSearched && (
          <EmptyState
            icon={<SearchIcon />}
            title="Search the Knowledge Base"
            description={`Enter a ${searchType} above and press Search to look up its reputation.`}
          />
        )}

        {hasSearched && isFetching && (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        )}

        {hasSearched && !isFetching && isError && (
          <Alert variant="error" title="Couldn't complete this search">
            {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
          </Alert>
        )}

        {hasSearched && !isFetching && !isError && data && data.items.length === 0 && (
          <EmptyState
            icon={<SearchIcon />}
            title="No results found"
            description={`No ${searchType} matching "${submittedQuery}" was found in the Knowledge Base.`}
          />
        )}

        {hasSearched && !isFetching && !isError && data && data.items.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              {data.items.length} result{data.items.length === 1 ? '' : 's'} for &quot;{submittedQuery}&quot;
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {data.items.map((entry) => (
                <KnowledgeResultCard
                  key={entry.id}
                  entry={entry}
                  onViewDetails={setSelectedEntry}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <KnowledgeDetails entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}
