import { useState } from 'react';
import { KEEP_RULES, MSG } from '@/constants/index.js';
import { t } from '@/i18n/index.js';
import { send } from '@/services/messaging.js';

/**
 * Every mutating call the dashboard makes to the service worker, plus the local
 * side effects they need. Kept out of the view so the render stays declarative.
 *
 * @param report (result, okMessage, failMessage) => void  toast from a worker reply
 * @param ask    (message) => Promise<boolean>           confirm dialog
 * @param notify (message, type?) => void                one-off toast
 */
export function useTabCommands({ state, settings, stats, sortBy, report, ask, notify }) {
  const [sorting, setSorting] = useState(false);

  /** Ask the worker what it would close, show the plan, act only on consent. */
  const cleanDuplicates = async () => {
    const rule = settings?.duplicateRule || KEEP_RULES.ACTIVE;
    const preview = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: true });
    if (!preview.ok) return notify(preview.error || t('status.cleanupFailed'), 'error');
    if (preview.total === 0) return notify(t('status.nothingToClean'));
    const lines = preview.plan.map((entry) =>
      t('confirm.planLine', { title: entry.title || entry.domain, count: entry.count }));
    const ok = await ask(
      t('confirm.cleanPlan', { count: preview.total, plan: lines.join('\n'), total: preview.total }));
    if (!ok) return;
    const result = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: false });
    report(result, result.closed
      ? t('status.dupesClosed', { count: result.closed })
      : t('status.nothingClosed'), t('status.cleanupFailed'));
  };

  const closeAllDuplicates = async () => {
    const total = stats.duplicateTabs || 0;
    if (total === 0) return notify(t('status.noDupesToClose'));
    if (!(await ask(t('confirm.closeAll', { count: total })))) return;
    const ids = state.duplicateGroups.flatMap((group) => group.tabIds.slice(1));
    const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
    report(result, result.closed
      ? t('status.tabsClosed', { count: result.closed })
      : t('status.nothingClosed'));
  };

  /** Returns true when the worker was actually asked to close something. */
  const closeTabs = async (ids, confirmMessage) => {
    if (ids.length === 0) return false;
    if (confirmMessage && !(await ask(confirmMessage))) return false;
    const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
    report(result, result.closed
      ? t('status.tabsClosed', { count: result.closed })
      : t('status.nothingClosed'));
    return true;
  };

  /** Only reorders the real tab strip on demand: picking a rule never moves tabs. */
  const applySort = async () => {
    setSorting(true);
    const result = await send(MSG.SORT_TABS, { rule: sortBy });
    setSorting(false);
    report(result, t('status.sorted', { count: result.moved, windows: result.windows }), t('status.sortFailed'));
  };

  return { sorting, cleanDuplicates, closeAllDuplicates, closeTabs, applySort };
}
