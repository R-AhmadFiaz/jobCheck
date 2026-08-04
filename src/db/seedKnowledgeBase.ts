import { configureDns } from '@/lib/configureDns';
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { Company } from '@/modules/companies/company.model';
import { Recruiter } from '@/modules/knowledgeBase/recruiter.model';
import { Identifier } from '@/modules/knowledgeBase/identifier.model';
import {
  KnowledgeBaseEntry,
  type KnowledgeBaseEntityType,
} from '@/modules/knowledgeBase/knowledgeBaseEntry.model';
import type { RiskLevel } from '@/shared/types/riskLevel';
import { logger } from '@/shared/utils/logger';

configureDns();

interface SeedCommunityReport {
  category: string;
  description: string;
  reportedAt: Date;
}

interface SeedEntry {
  entityType: KnowledgeBaseEntityType;
  name: string;
  description: string;
  indicators: string[];
  trustScore: number;
  riskLevel: RiskLevel;
  verificationStatus: string;
  domain: string | null;
  associatedCompany: string | null;
  communityReports: SeedCommunityReport[];
}

const SEED_ENTRIES: SeedEntry[] = [
  {
    entityType: 'company',
    name: 'Bright Path Solutions',
    description:
      'Established HR consultancy with a verified office address and a consistent hiring process across multiple job boards.',
    indicators: [
      'Uses a company-branded email domain for all recruiter contact',
      'Publishes verifiable office locations and registration details',
      'Never requests payment at any stage of the hiring process',
    ],
    trustScore: 92,
    riskLevel: 'low',
    verificationStatus: 'admin_verified',
    domain: 'brightpathsolutions.com',
    associatedCompany: null,
    communityReports: [],
  },
  {
    entityType: 'company',
    name: 'NovaWork Technologies',
    description:
      'Newer remote-staffing brand with a mix of legitimate postings and a handful of reports describing pressure to move conversations off official channels.',
    indicators: [
      'Some recruiters push candidates toward personal messaging apps',
      'Company website has limited verifiable history',
      'A minority of postings include unusually vague compensation details',
    ],
    trustScore: 48,
    riskLevel: 'medium',
    verificationStatus: 'community_verified',
    domain: null,
    associatedCompany: null,
    communityReports: [
      {
        category: 'communication',
        description: 'Recruiter insisted on moving the conversation to WhatsApp immediately.',
        reportedAt: new Date('2026-02-14'),
      },
    ],
  },
  {
    entityType: 'company',
    name: 'Quantum Career Partners',
    description:
      'Repeatedly reported for requesting upfront "processing fees" before issuing fabricated offer letters.',
    indicators: [
      'Requests registration or training fees before employment begins',
      'Offer letters lack any verifiable company registration details',
      'No verifiable physical office location',
    ],
    trustScore: 6,
    riskLevel: 'critical',
    verificationStatus: 'admin_verified',
    domain: null,
    associatedCompany: null,
    communityReports: [
      {
        category: 'payment',
        description: 'Asked for a $150 "equipment fee" before sending a laptop that never arrived.',
        reportedAt: new Date('2026-01-20'),
      },
      {
        category: 'payment',
        description: 'Requested a refundable deposit via a mobile-money transfer.',
        reportedAt: new Date('2026-03-02'),
      },
    ],
  },
  {
    entityType: 'recruiter',
    name: 'Alex Turner',
    description:
      'Long-standing recruiter with a verifiable professional history and consistent, transparent hiring communication.',
    indicators: [
      'Always communicates from a verified corporate email address',
      'Provides clear, written offer terms before any next steps',
    ],
    trustScore: 88,
    riskLevel: 'low',
    verificationStatus: 'admin_verified',
    domain: null,
    associatedCompany: 'Bright Path Solutions',
    communityReports: [],
  },
  {
    entityType: 'recruiter',
    name: 'Morgan Lee',
    description:
      'Associated with several postings that use urgency language and instant-hire claims without a screening process.',
    indicators: [
      'Frequently uses "hired instantly" and "no interview required" language',
      'Applies pressure to respond or decide within hours',
    ],
    trustScore: 28,
    riskLevel: 'high',
    verificationStatus: 'community_verified',
    domain: null,
    associatedCompany: null,
    communityReports: [
      {
        category: 'urgency',
        description: 'Pressured candidate to accept an offer within two hours with no interview.',
        reportedAt: new Date('2026-02-28'),
      },
    ],
  },
  {
    entityType: 'recruiter',
    name: 'Jordan Whitfield',
    description:
      'Confirmed to operate under multiple aliases while requesting upfront payments from candidates.',
    indicators: [
      'Uses multiple names across different job boards for the same postings',
      'Requests payment via informal money-transfer services',
    ],
    trustScore: 4,
    riskLevel: 'critical',
    verificationStatus: 'admin_verified',
    domain: null,
    associatedCompany: 'Quantum Career Partners',
    communityReports: [
      {
        category: 'payment',
        description: 'Requested payment via Western Union to "activate" a remote work account.',
        reportedAt: new Date('2026-01-05'),
      },
    ],
  },
  {
    entityType: 'identifier',
    name: 'brightpathsolutions.com',
    description:
      'Primary domain for Bright Path Solutions, consistent with its registered company details.',
    indicators: ['Domain age and registration details match the company profile'],
    trustScore: 90,
    riskLevel: 'low',
    verificationStatus: 'admin_verified',
    domain: 'brightpathsolutions.com',
    associatedCompany: 'Bright Path Solutions',
    communityReports: [],
  },
  {
    entityType: 'identifier',
    name: 'global-remote-staffing.info',
    description:
      'Recently registered domain used across several postings with inconsistent company branding.',
    indicators: [
      'Domain registered recently relative to claimed company history',
      'Hosts postings for more than one unrelated "company" name',
    ],
    trustScore: 42,
    riskLevel: 'medium',
    verificationStatus: 'community_verified',
    domain: 'global-remote-staffing.info',
    associatedCompany: null,
    communityReports: [
      {
        category: 'domain',
        description: 'Same domain used for postings under three different company names.',
        reportedAt: new Date('2026-02-10'),
      },
    ],
  },
  {
    entityType: 'identifier',
    name: 'quick-hire-remote.biz',
    description:
      'Domain directly linked to confirmed upfront-payment scam postings from Quantum Career Partners.',
    indicators: [
      'Directly linked to confirmed scam postings',
      'No verifiable ownership or business registration',
    ],
    trustScore: 2,
    riskLevel: 'critical',
    verificationStatus: 'admin_verified',
    domain: 'quick-hire-remote.biz',
    associatedCompany: 'Quantum Career Partners',
    communityReports: [
      {
        category: 'domain',
        description: 'Domain used to host the fabricated offer letter template.',
        reportedAt: new Date('2026-01-22'),
      },
    ],
  },
];

async function resolveEntityRef(
  entry: SeedEntry,
): Promise<{ entityType: KnowledgeBaseEntityType; entityRefId: mongoose.Types.ObjectId }> {
  if (entry.entityType === 'company') {
    const normalizedName = entry.name.trim().toLowerCase();
    const company = await Company.findOneAndUpdate(
      { normalizedName },
      { $set: { name: entry.name, normalizedName, website: entry.domain } },
      { upsert: true, new: true },
    );
    return { entityType: 'company', entityRefId: company._id as mongoose.Types.ObjectId };
  }

  if (entry.entityType === 'recruiter') {
    const recruiter = await Recruiter.findOneAndUpdate(
      { name: entry.name },
      { $set: { name: entry.name } },
      { upsert: true, new: true },
    );
    return { entityType: 'recruiter', entityRefId: recruiter._id as mongoose.Types.ObjectId };
  }

  const normalizedValue = entry.name.trim().toLowerCase();
  const identifier = await Identifier.findOneAndUpdate(
    { type: 'domain', normalizedValue },
    { $set: { type: 'domain', value: entry.name, normalizedValue } },
    { upsert: true, new: true },
  );
  return { entityType: 'identifier', entityRefId: identifier._id as mongoose.Types.ObjectId };
}

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, { dbName: 'jobcheck' });
  logger.info('Connected to MongoDB for seeding');

  for (const entry of SEED_ENTRIES) {
    const { entityType, entityRefId } = await resolveEntityRef(entry);

    await KnowledgeBaseEntry.findOneAndUpdate(
      { entityType, entityRefId },
      {
        $set: {
          entityType,
          entityRefId,
          searchTerms: [entry.name.trim().toLowerCase()],
          name: entry.name,
          description: entry.description,
          indicators: entry.indicators,
          domain: entry.domain,
          associatedCompany: entry.associatedCompany,
          communityReports: entry.communityReports,
          trustScore: entry.trustScore,
          riskLevel: entry.riskLevel,
          verificationStatus: entry.verificationStatus,
          lastActivityAt: new Date(),
          recomputedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
    logger.info(`Seeded knowledge base entry: ${entry.name}`);
  }

  logger.info(`Seed complete: ${SEED_ENTRIES.length} knowledge base entries ensured.`);
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Seeding knowledge base failed');
  process.exit(1);
});
