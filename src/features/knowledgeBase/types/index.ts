// Frontend-only data model for the Knowledge Base feature. This intentionally
// mirrors the shape the real backend (docs/ARCHITECTURE.md §12, not built yet)
// is expected to return, so `api/knowledgeBase.api.ts` can later swap its mock
// implementation for a real `apiRequest(...)` call without touching any
// component that consumes `KnowledgeEntry`.

export type KnowledgeEntryType = 'company' | 'recruiter' | 'domain';

// Distinct from the analyzer's RiskLevel ('low'|'medium'|'high'|'critical' in
// components/ui.tsx) — a Knowledge Base entity's standing is a different
// concept from one job posting's score, so this is its own taxonomy.
export type KnowledgeRiskLevel = 'safe' | 'suspicious' | 'high_risk' | 'confirmed_scam';

export type VerificationStatus = 'unverified' | 'community_verified' | 'admin_verified';

export interface CommunityReportEntry {
  id: string;
  category: string;
  description: string;
  reportedAt: string;
}

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeEntryType;
  name: string;
  trustScore: number;
  riskLevel: KnowledgeRiskLevel;
  description: string;
  indicators: string[];
  communityReports: CommunityReportEntry[];
  verificationStatus: VerificationStatus;
  createdAt: string;
  /** Present on company/recruiter entries when a domain is associated. */
  domain?: string | null;
  /** Present on recruiter entries claiming to represent a company. */
  associatedCompany?: string | null;
}

export interface KnowledgeSearchResult {
  query: string;
  type: KnowledgeEntryType;
  items: KnowledgeEntry[];
}
