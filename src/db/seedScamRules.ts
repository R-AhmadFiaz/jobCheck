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
  // ── Payment ──────────────────────────────────────────────────────────────
  {
    key: 'UPFRONT_PAYMENT_REQUEST',
    description:
      'Detects requests for an upfront payment, fee, or deposit before employment begins. Covers advance-payment, registration-fee, security-deposit, training-fee, and equipment-purchase scams, which are all the same underlying pattern.',
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
        'pay to apply',
        'starter kit fee',
      ],
      // "fee" alone is genuinely ambiguous (gym membership fee, parking fee
      // in a benefits list, referral fee paid *to* a candidate, etc.) — only
      // one weak keyword is used here on purpose, so it can only be
      // reinforced by a strong phrase or a contextKeywords hit, never by
      // co-occurring with another weak term. contextKeywords must actually
      // indicate a payment is being demanded *from* the applicant — generic
      // job-posting vocabulary ("job", "apply", "hiring", "position",
      // "salary", "recruiter", "interview") used to sit here, but those
      // words appear in nearly every legitimate posting, which made the
      // "reinforcement" requirement nearly meaningless in practice (any
      // posting mentioning "fee" in an unrelated sense — or even just the
      // substring "fee" inside "coffee" — would get flagged as soon as it
      // also said "apply" or "salary", which is close to all of them).
      weakKeywords: ['fee'],
      contextKeywords: [
        'upfront',
        'refundable',
        'before you start',
        'before you begin',
        'before you can start',
        'processing charge',
        'wire transfer',
        'money order',
        'must pay',
        'required to pay',
        'to secure your position',
        'to activate your account',
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
    key: 'WORK_PERMIT_VISA_FEE_SCAM',
    description:
      'Detects requests for payment tied to visa sponsorship or work-permit processing — a common tactic in fake overseas-job scams.',
    category: 'immigration',
    severity: 'high',
    weight: 32,
    matcher: {
      type: 'keyword',
      keywords: [
        'visa processing fee',
        'work permit fee',
        'visa sponsorship fee',
        'pay for visa processing',
        'immigration processing fee',
        'work permit processing charges',
        'visa fee before joining',
      ],
      recommendation:
        "Legitimate employers and immigration authorities do not ask candidates to personally pay a recruiter for visa or work-permit processing. Verify any visa sponsorship claim directly with the employer's official channels or a licensed immigration authority.",
    },
  },

  // ── Salary ───────────────────────────────────────────────────────────────
  {
    key: 'UNREALISTIC_EARNINGS_CLAIM',
    description:
      'Detects exaggerated or guaranteed-income language typical of scam postings. Covers both unrealistic salary promises and guaranteed-income claims, which use the same phrasing patterns.',
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

  // ── Contact ──────────────────────────────────────────────────────────────
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
    key: 'OFF_PLATFORM_MESSAGING_ONLY_RECRUITER',
    description:
      'Detects recruiters who insist on WhatsApp- or Telegram-only communication with no other verifiable contact channel. Merges the WhatsApp-only and Telegram-only patterns, since they are the same underlying red flag.',
    category: 'contact',
    severity: 'low',
    weight: 12,
    matcher: {
      type: 'keyword',
      // Deliberately full phrases, not bare "whatsapp"/"telegram" — plenty of
      // legitimate postings mention one as an additional contact option.
      // The red flag is exclusivity ("only"), not the platform itself.
      keywords: [
        'whatsapp only',
        'telegram only',
        'contact us on whatsapp only',
        'message us on telegram only',
        'add us on telegram to proceed',
        'reach out on whatsapp only',
        'communication only through whatsapp',
        'communication only through telegram',
      ],
      recommendation:
        'Be cautious of recruiters who insist on communicating only through WhatsApp or Telegram with no company email or phone number — legitimate employers are reachable through verifiable, company-branded channels.',
    },
  },

  // ── Urgency ──────────────────────────────────────────────────────────────
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

  // ── Company identity ─────────────────────────────────────────────────────
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
      ],
      // "our client(s)" alone is completely ordinary language for a
      // staffing/recruiting/consulting firm describing its own business
      // (e.g. "we deliver solutions to clients like Google") — it says
      // nothing about vagueness by itself. It's only the classic
      // anonymous-employer pattern when it's standing in *for* the real
      // employer's name — "our client is hiring", "on behalf of our
      // client" — which is what the contextKeywords require here.
      weakKeywords: ['our client'],
      contextKeywords: [
        'is hiring',
        'is seeking',
        'is looking for',
        'on behalf of',
        "client's name is confidential",
        'undisclosed company',
      ],
      recommendation:
        'Ask for the specific, verifiable name of the hiring company before proceeding.',
    },
  },

  // ── Identity & financial-credential harvesting ───────────────────────────
  {
    key: 'IDENTITY_DOCUMENT_HARVESTING',
    description:
      'Detects early, unsolicited requests to send copies of identity documents such as a passport or national ID card.',
    category: 'identity_fraud',
    severity: 'high',
    weight: 30,
    matcher: {
      type: 'keyword',
      keywords: [
        'copy of your passport',
        'scan of your national id',
        'copy of your national id',
        'your cnic number',
        'photo of your id card',
        'copy of your driving license',
        'copy of your id card',
        'passport number and photo',
      ],
      recommendation:
        'Never send copies of your passport, national ID, or other identity documents to an unverified recruiter — legitimate employers only request identity documents after a formal, verifiable offer, typically through a secure company system.',
    },
  },
  {
    key: 'BANKING_OTP_HARVESTING',
    description:
      'Detects requests for a one-time password (OTP), card CVV/PIN, or online banking password — information no legitimate employer ever needs. Merges banking-credential and OTP/verification-code harvesting, since both target the same never-share-this secrets.',
    category: 'financial_fraud',
    severity: 'high',
    weight: 35,
    matcher: {
      type: 'keyword',
      keywords: [
        'share your otp',
        'send your otp',
        'the otp you received',
        'your card cvv',
        'your atm pin',
        'net banking password',
        'your card pin',
        'one time password to',
        'online banking password',
        'the verification code you received',
      ],
      recommendation:
        'Never share an OTP, card CVV, PIN, or online banking password with anyone — no legitimate employer, bank, or recruiter will ever ask for these. Sharing them can let someone drain your bank account.',
    },
  },

  // ── Business model / investment disguised as employment ─────────────────
  {
    key: 'MLM_RECRUITMENT_CHAIN',
    description:
      'Detects multi-level-marketing (MLM) or pyramid-style recruitment-chain language disguised as a standard job opening.',
    category: 'business_model',
    severity: 'medium',
    weight: 22,
    matcher: {
      type: 'keyword',
      keywords: [
        'recruit others to earn',
        // The "...and earn" qualifier is what distinguishes this from an
        // ordinary, legitimate "you'll build and lead your own team" line in
        // a management/leadership job posting.
        'build your own team and earn',
        'network marketing opportunity',
        'multi level marketing',
        'multi-level marketing',
        'earn from your downline',
        'invite friends to join and earn',
        'earn commission by recruiting',
      ],
      recommendation:
        'Be cautious of postings where your earnings depend mainly on recruiting other people rather than performing a defined job — this is characteristic of multi-level-marketing and pyramid-style schemes, not standard employment.',
    },
  },
  {
    key: 'CRYPTO_INVESTMENT_DISGUISED_AS_JOB',
    description:
      'Detects "task-based" crypto trading jobs that require depositing or topping up funds before earnings can be withdrawn.',
    category: 'crypto',
    severity: 'high',
    weight: 30,
    matcher: {
      type: 'keyword',
      keywords: [
        'deposit usdt to start working',
        'top up your wallet to unlock tasks',
        'crypto trading task job',
        'recharge your account to withdraw earnings',
        'complete tasks to earn commission crypto',
        'deposit funds to activate your account',
        'pay to unlock your withdrawal',
      ],
      // "usdt" alone is rare enough in ordinary text to be a safe single
      // weak term; "crypto"/"wallet"/"trading" are common in perfectly
      // legitimate blockchain-industry job ads, so they're context only —
      // they never trigger the rule by themselves.
      weakKeywords: ['usdt'],
      contextKeywords: ['deposit', 'recharge', 'top up', 'withdraw', 'task', 'wallet', 'commission'],
      recommendation:
        'Be extremely cautious of any "job" that asks you to deposit cryptocurrency or funds into a wallet or account before you can complete tasks or withdraw earnings — this is a well-documented scam pattern, not a real job.',
    },
  },

  // ── Mule schemes ─────────────────────────────────────────────────────────
  {
    key: 'PARCEL_RESHIPPING_MULE_JOB',
    description:
      'Detects "package forwarding" or "reshipping" job offers that ask candidates to receive and re-mail parcels from home. Merges package-forwarding and reshipping examples, since they describe the same scheme.',
    category: 'mule_scheme',
    severity: 'high',
    weight: 28,
    matcher: {
      type: 'keyword',
      keywords: [
        'reship packages from home',
        'receive and forward packages',
        'package forwarding job',
        'repackage and reship',
        'parcel forwarding agent',
        'receive packages and mail them out',
      ],
      recommendation:
        'Jobs that involve receiving packages at your home and reshipping them elsewhere are a well-known scam and money-laundering method (often called a "reshipping" or "parcel mule" scheme) and can expose you to criminal liability. Do not provide your address or accept packages for this purpose.',
    },
  },
  {
    key: 'MONEY_MULE_BANK_TRANSFER_JOB',
    description:
      'Detects "jobs" that ask candidates to receive funds into their personal bank account and transfer them onward.',
    category: 'mule_scheme',
    severity: 'high',
    weight: 30,
    matcher: {
      type: 'keyword',
      keywords: [
        'receive funds into your account and transfer',
        'receive money into your account and forward',
        'use your bank account to process payments for us',
        'use your personal account to receive client funds',
        'money transfer agent work from home',
        'receive payments on our behalf using your account',
      ],
      recommendation:
        "Never use your personal bank account to receive and forward money for someone else's \"job\" — this is a money-mule scheme and can make you legally liable for money laundering, even if you never keep any of the funds.",
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
