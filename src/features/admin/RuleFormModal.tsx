'use client';

import { useEffect, useState } from 'react';
import { Modal, Button, Input, Alert } from '@/components/ui';
import type {
  CreateScamRuleInput,
  ExtractedFieldName,
  MatcherConfig,
  RuleSeverity,
  ScamRule,
} from '@/features/admin/types';
import { ApiClientError } from '@/lib/apiClient';

interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRule: ScamRule | null;
  onSubmit: (input: CreateScamRuleInput) => Promise<void>;
}

const CATEGORY_SUGGESTIONS = ['payment', 'salary', 'contact', 'urgency', 'company_info'];
const EXTRACTED_FIELDS: ExtractedFieldName[] = [
  'companyName',
  'jobTitle',
  'salaryRange',
  'contactEmail',
  'contactPhone',
  'location',
];

interface FormState {
  key: string;
  description: string;
  category: string;
  severity: RuleSeverity;
  weight: string;
  matcherType: MatcherConfig['type'];
  keywords: string;
  pattern: string;
  flags: string;
  genericDomains: string;
  requiredField: ExtractedFieldName;
  recommendation: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return {
    key: '',
    description: '',
    category: 'payment',
    severity: 'medium',
    weight: '20',
    matcherType: 'keyword',
    keywords: '',
    pattern: '',
    flags: 'i',
    genericDomains: '',
    requiredField: 'companyName',
    recommendation: '',
    isActive: true,
  };
}

function ruleToForm(rule: ScamRule): FormState {
  const base: FormState = {
    ...emptyForm(),
    key: rule.key,
    description: rule.description,
    category: rule.category,
    severity: rule.severity,
    weight: String(rule.weight),
    matcherType: rule.matcher.type,
    isActive: rule.isActive,
    recommendation: rule.matcher.recommendation,
  };
  if (rule.matcher.type === 'keyword') base.keywords = rule.matcher.keywords.join('\n');
  if (rule.matcher.type === 'regex') {
    base.pattern = rule.matcher.pattern;
    base.flags = rule.matcher.flags ?? 'i';
  }
  if (rule.matcher.type === 'emailDomain')
    base.genericDomains = rule.matcher.genericDomains.join('\n');
  if (rule.matcher.type === 'fieldPresence') base.requiredField = rule.matcher.requiredField;
  return base;
}

function buildMatcher(form: FormState): MatcherConfig {
  switch (form.matcherType) {
    case 'keyword':
      return {
        type: 'keyword',
        keywords: form.keywords
          .split('\n')
          .map((k) => k.trim())
          .filter(Boolean),
        recommendation: form.recommendation.trim(),
      };
    case 'regex':
      return {
        type: 'regex',
        pattern: form.pattern.trim(),
        flags: form.flags.trim() || undefined,
        recommendation: form.recommendation.trim(),
      };
    case 'emailDomain':
      return {
        type: 'emailDomain',
        genericDomains: form.genericDomains
          .split('\n')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
        recommendation: form.recommendation.trim(),
      };
    case 'fieldPresence':
      return {
        type: 'fieldPresence',
        requiredField: form.requiredField,
        recommendation: form.recommendation.trim(),
      };
  }
}

export function RuleFormModal({ open, onClose, editingRule, onSubmit }: RuleFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-existing pattern, unchanged by the migration: resets the form's
  // local state when the modal (re)opens for a given rule, since the modal
  // itself never unmounts between opens.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(editingRule ? ruleToForm(editingRule) : emptyForm());
      setError('');
    }
  }, [open, editingRule]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setError('');
    const weight = Number(form.weight);
    if (
      !form.key.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.recommendation.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }
    if (Number.isNaN(weight) || weight < 0 || weight > 100) {
      setError('Weight must be a number between 0 and 100.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        key: form.key.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        severity: form.severity,
        weight,
        matcher: buildMatcher(form),
        isActive: form.isActive,
      });
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? 'Edit rule' : 'Create fraud detection rule'}
      size="lg"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {error && (
          <Alert variant="error" onDismiss={() => setError('')}>
            {error}
          </Alert>
        )}

        <Input
          label="Rule key (unique, cannot be changed later)"
          placeholder="e.g. UPFRONT_PAYMENT_REQUEST"
          value={form.key}
          onChange={(e) => set('key', e.target.value)}
          disabled={Boolean(editingRule)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            placeholder="What does this rule detect?"
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Category</label>
            <input
              list="category-suggestions"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Severity</label>
            <select
              value={form.severity}
              onChange={(e) => set('severity', e.target.value as RuleSeverity)}
              className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
            >
              {(['low', 'medium', 'high'] as RuleSeverity[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Weight (0-100, contributes to the risk score when this rule matches)"
          type="number"
          min={0}
          max={100}
          value={form.weight}
          onChange={(e) => set('weight', e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">Matcher type</label>
          <select
            value={form.matcherType}
            onChange={(e) => set('matcherType', e.target.value as MatcherConfig['type'])}
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
          >
            <option value="keyword">Keyword match</option>
            <option value="regex">Regex pattern</option>
            <option value="emailDomain">Generic email domain</option>
            <option value="fieldPresence">Missing extracted field</option>
          </select>
        </div>

        {form.matcherType === 'keyword' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Keywords (one per line)
            </label>
            <textarea
              value={form.keywords}
              onChange={(e) => set('keywords', e.target.value)}
              rows={4}
              placeholder={'processing fee\napplication fee'}
              className="px-3.5 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors font-mono"
            />
          </div>
        )}

        {form.matcherType === 'regex' && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Input
                label="Pattern"
                value={form.pattern}
                onChange={(e) => set('pattern', e.target.value)}
                placeholder="\\$\\s?\\d{3,}\\s*per\\s*day"
              />
            </div>
            <Input
              label="Flags"
              value={form.flags}
              onChange={(e) => set('flags', e.target.value)}
              placeholder="i"
            />
          </div>
        )}

        {form.matcherType === 'emailDomain' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Generic domains (one per line)
            </label>
            <textarea
              value={form.genericDomains}
              onChange={(e) => set('genericDomains', e.target.value)}
              rows={4}
              placeholder={'gmail.com\nyahoo.com'}
              className="px-3.5 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors font-mono"
            />
          </div>
        )}

        {form.matcherType === 'fieldPresence' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Fires when this field is missing
            </label>
            <select
              value={form.requiredField}
              onChange={(e) => set('requiredField', e.target.value as ExtractedFieldName)}
              className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
            >
              {EXTRACTED_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">
            Recommendation shown to users
          </label>
          <textarea
            value={form.recommendation}
            onChange={(e) => set('recommendation', e.target.value)}
            rows={2}
            placeholder="What should the user do if this flag fires?"
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="rounded"
          />
          Active
        </label>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={submitting} onClick={() => void handleSubmit()}>
            {editingRule ? 'Save changes' : 'Create rule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
