export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RedFlag {
  ruleId: string;
  label: string;
  description: string;
  weight: number;
  severity: 'low' | 'medium' | 'high';
}

export interface GreenFlag {
  label: string;
  description: string;
}

export interface ExtractedFields {
  companyName: string | null;
  jobTitle: string | null;
  salaryRange: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location: string | null;
}

export interface JobAnalysis {
  _id: string;
  userId: string | null;
  rawJobText: string;
  normalizedText: string;
  extractedFields: ExtractedFields;
  companyId: string | null;
  riskScore: number;
  riskLevel: RiskLevel;
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
  aiExplanation: string | null;
  aiConfidence: number | null;
  engineVersion: string;
  isSaved: boolean;
  createdAt: string;
}

export type AnalysisStatus = 'pending' | 'evaluated';

export interface AnalysisWithStatus {
  analysis: JobAnalysis;
  status: AnalysisStatus;
}

export interface AnalysisHistoryResult {
  items: AnalysisWithStatus[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
