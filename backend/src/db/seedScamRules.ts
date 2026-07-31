import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { ScamRule } from '@/modules/analysis/engine/scamRule.model';
import { logger } from '@/shared/utils/logger';

interface SeedRule {
  key: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  weight: number;
  matcher: Record<string, unknown>;
}

const SEED_RULES: SeedRule[] = [
  {
    key: 'UPFRONT_PAYMENT_REQUEST',
    description:
      'Detects requests for an upfront payment, fee, or deposit before employment begins.',
    category: 'payment',
    severity: 'high',
    weight: 32,
    matcher: {
      type: 'keyword',
      keywords: [
        'registration fee',
        'processing fee',
        'application fee',
        'training fee',
        'equipment fee',
        'security deposit',
        'refundable deposit',
        'pay before you start',
      ],
      recommendation:
        'Legitimate employers never ask candidates to pay money upfront. Do not send any payment, deposit, or fee to a recruiter or employer.',
    },
  },
  {
    key: 'INFORMAL_PAYMENT_CHANNEL',
    description:
      'Detects requests to send money through informal mobile-money or wire-transfer channels.',
    category: 'payment',
    severity: 'medium',
    weight: 18,
    matcher: {
      type: 'keyword',
      keywords: ['easypaisa', 'jazzcash', 'western union', 'moneygram', 'send money via'],
      recommendation:
        'Requests to use informal money-transfer services to "confirm" an application are a common scam pattern.',
    },
  },
  {
    key: 'UNREALISTIC_EARNINGS_CLAIM',
    description: 'Detects exaggerated or guaranteed-income language typical of scam postings.',
    category: 'salary',
    severity: 'high',
    weight: 32,
    matcher: {
      type: 'keyword',
      keywords: [
        'guaranteed income',
        'unlimited earning potential',
        'get rich quick',
        'earn thousands weekly',
        'double your income',
      ],
      recommendation:
        'Be skeptical of any job promising guaranteed or unusually high income with little effort or experience required.',
    },
  },
  {
    key: 'SUSPICIOUS_HIGH_PER_DAY_RATE',
    description: 'Detects unusually high daily pay rates often used to lure applicants.',
    category: 'salary',
    severity: 'medium',
    weight: 18,
    matcher: {
      type: 'regex',
      pattern: '\\$\\s?\\d{3,}\\s*(?:/|per)\\s*day',
      flags: 'i',
      recommendation:
        'Compare any quoted pay rate against typical market rates for the role before proceeding.',
    },
  },
  {
    key: 'GENERIC_EMAIL_DOMAIN',
    description:
      'Detects use of a free/generic email domain as the sole contact for a claimed corporate role.',
    category: 'contact',
    severity: 'low',
    weight: 10,
    matcher: {
      type: 'emailDomain',
      genericDomains: [
        'gmail.com',
        'yahoo.com',
        'hotmail.com',
        'outlook.com',
        'rocketmail.com',
        'icloud.com',
      ],
      recommendation:
        'A legitimate company usually contacts candidates from a company-branded email domain, not a free personal one.',
    },
  },
  {
    key: 'URGENCY_PRESSURE_LANGUAGE',
    description: "Detects urgency or pressure language designed to rush a candidate's decision.",
    category: 'urgency',
    severity: 'medium',
    weight: 18,
    matcher: {
      type: 'keyword',
      keywords: [
        'immediate joining',
        'urgent hiring',
        'limited seats',
        'apply within 24 hours',
        'hurry up',
        'act now',
        'first come first serve',
        'only today',
        'limited slots',
      ],
      recommendation:
        'Take your time to research any employer that pressures you to decide or pay quickly.',
    },
  },
  {
    key: 'IMMEDIATE_HIRING_NO_INTERVIEW',
    description: 'Detects claims of instant hiring with no interview or screening process.',
    category: 'urgency',
    severity: 'medium',
    weight: 18,
    matcher: {
      type: 'keyword',
      keywords: [
        'no interview required',
        'hired instantly',
        'instant hiring',
        'join immediately without interview',
      ],
      recommendation:
        'Legitimate employers virtually always interview or screen candidates before hiring.',
    },
  },
  {
    key: 'MISSING_COMPANY_NAME',
    description: 'Detects job postings that never clearly identify the hiring company.',
    category: 'company_info',
    severity: 'medium',
    weight: 18,
    matcher: {
      type: 'fieldPresence',
      requiredField: 'companyName',
      recommendation:
        'Be cautious of postings that never name the hiring company — research the employer before applying.',
    },
  },
  {
    key: 'VAGUE_COMPANY_DESCRIPTION',
    description: 'Detects vague, non-specific descriptions of the hiring company.',
    category: 'company_info',
    severity: 'low',
    weight: 10,
    matcher: {
      type: 'keyword',
      keywords: [
        'a leading company',
        'a fast growing organization',
        'confidential company',
        'a well known company',
        'our client',
      ],
      recommendation:
        'Ask for the specific, verifiable name of the hiring company before proceeding.',
    },
  },
];

async function main(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  logger.info('Connected to MongoDB for seeding');

  for (const rule of SEED_RULES) {
    await ScamRule.findOneAndUpdate({ key: rule.key }, { $set: rule }, { upsert: true, new: true });
    logger.info(`Seeded rule: ${rule.key}`);
  }

  logger.info(`Seed complete: ${SEED_RULES.length} rules ensured.`);
  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Seeding scam rules failed');
  process.exit(1);
});
