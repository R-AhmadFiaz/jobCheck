import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Badge,
  Button,
  Input,
  Modal,
  StatCard,
  Pagination,
  Alert,
  EmptyState,
  StatusChip,
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  DatabaseIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@/components/ui';
import {
  createScamRule,
  deleteScamRule,
  listScamRules,
  updateScamRule,
} from '@/features/admin/api/adminRules.api';
import type { CreateScamRuleInput, RuleSeverity, ScamRule } from '@/features/admin/types';
import { RuleFormModal } from '@/features/admin/RuleFormModal';

const PAGE_SIZE = 10;

const severityBadge = (s: RuleSeverity) => {
  const map: Record<RuleSeverity, 'danger' | 'warning' | 'info'> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  };
  return <Badge variant={map[s]}>{s}</Badge>;
};

export function AdminRulesPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ScamRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScamRule | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'scam-rules', page],
    queryFn: () =>
      listScamRules({ page, limit: PAGE_SIZE, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'scam-rules'] });

  const createMutation = useMutation({
    mutationFn: createScamRule,
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateScamRuleInput }) =>
      updateScamRule(id, input),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteScamRule,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const items = data?.items ?? [];
  const filtered = items.filter(
    (r) =>
      r.key.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSubmit = async (input: CreateScamRuleInput) => {
    if (editingRule) {
      await updateMutation.mutateAsync({ id: editingRule._id, input });
    } else {
      await createMutation.mutateAsync(input);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1
          className="text-2xl font-extrabold text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Admin — Rule Manager
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Create, edit, enable/disable, and delete fraud detection rules.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up stagger-1">
        <StatCard
          label="Rules (this page)"
          value={items.length}
          icon={<DatabaseIcon size={18} />}
          color="primary"
        />
        <StatCard
          label="Active"
          value={items.filter((r) => r.isActive).length}
          icon={<CheckCircleIcon size={18} />}
          color="safe"
        />
        <StatCard
          label="Inactive"
          value={items.filter((r) => !r.isActive).length}
          icon={<XCircleIcon size={18} />}
          color="warning"
        />
      </div>

      <Card padding="none" className="animate-fade-up stagger-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder="Search rules…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<SearchIcon size={15} />}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              size="sm"
              icon={<PlusIcon size={13} />}
              onClick={() => {
                setEditingRule(null);
                setModalOpen(true);
              }}
            >
              Create rule
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<DatabaseIcon />}
            title="No rules found"
            description="Try a different search, or create a new rule."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((rule) => (
                  <tr key={rule._id} className="hover:bg-[var(--muted)]/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-[var(--foreground)] font-mono text-xs">
                        {rule.key}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="default">{rule.category}</Badge>
                    </td>
                    <td className="px-4 py-3.5">{severityBadge(rule.severity)}</td>
                    <td className="px-4 py-3.5">
                      <StatusChip status={rule.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-sm text-[var(--foreground)]">
                      {rule.weight}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rule)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted-foreground)] hover:text-red-600 transition-colors"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)]">
              Showing page {data.page} of {data.totalPages} ({data.total} rules)
            </p>
            <Pagination page={page} total={data.total} perPage={PAGE_SIZE} onChange={setPage} />
          </div>
        )}
      </Card>

      <RuleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingRule={editingRule}
        onSubmit={handleSubmit}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete rule"
        size="sm"
      >
        <div className="space-y-4">
          {deleteMutation.isError && (
            <Alert variant="error">Failed to delete this rule. Please try again.</Alert>
          )}
          <p className="text-sm text-[var(--muted-foreground)]">
            Delete{' '}
            <span className="font-mono font-semibold text-[var(--foreground)]">
              {deleteTarget?.key}
            </span>
            ? This cannot be undone and may reduce scam detection coverage.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              Delete rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
