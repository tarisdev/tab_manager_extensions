import { useState } from 'react';
import { Search, Table } from 'lucide-react';
import { FILTER, GROUP_MODES, KEEP_RULES, MSG, SORT_MODES } from '@/constants/index.js';
import { applyTranslations, categoryLabel, resolveLocale, t } from '@/i18n/index.js';
import { groupTabs, sortGroupTabs } from '@/utils/tab-grouper.js';
import { ConfirmDialog } from '@/components/shared/confirm-dialog.jsx';
import { EmptyState } from '@/components/ui/empty-state.jsx';
import { Stat } from '@/components/ui/stat.jsx';
import { Toast } from '@/components/ui/toast.jsx';
import { useConfirm } from '@/hooks/useConfirm.js';
import { useTabState } from '@/hooks/useTabState.js';
import { nextTheme, useTheme } from '@/hooks/useTheme.js';
import { useToast } from '@/hooks/useToast.js';
import { send } from '@/services/messaging.js';
import { BulkBar } from './components/BulkBar.jsx';
import { GroupSection } from './components/GroupSection.jsx';
import { HeaderBar } from './components/HeaderBar.jsx';
import { HelpDialog } from './components/HelpDialog.jsx';
import { MoveDialog } from './components/MoveDialog.jsx';
import { SettingsDialog } from './components/SettingsDialog.jsx';
import { TabRow } from './components/TabRow.jsx';
import { Toolbar } from './components/Toolbar.jsx';
import { useTabCommands } from './hooks/useTabCommands.js';
import { useTabMove } from './hooks/useTabMove.js';
import { windowOptions } from './utils.js';

export function Dashboard() {
  const { state, settings, refresh, updateSettings, resetSettings } = useTabState();
  const confirmState = useConfirm();
  const { toast, show } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(FILTER.ALL);
  const [collapsed, setCollapsed] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  resolveLocale(settings?.locale);
  useTheme(settings?.theme);
  applyTranslations();

  const stats = state.stats || {};
  const groupBy = settings?.groupBy || GROUP_MODES.DOMAIN;
  const sortBy = settings?.sortBy || SORT_MODES.GROUP;
  const search = query.trim().toLowerCase();
  const duplicateIds = new Set(state.duplicateTabIds);
  const tabs = state.tabs.filter((tab) => {
    if (search && !tab.searchable?.includes(search)) return false;
    if (filter === FILTER.DUPLICATES) return duplicateIds.has(tab.id);
    if (filter === FILTER.ACTIVE) return tab.active;
    if (filter !== FILTER.ALL && tab.category !== filter) return false;
    return true;
  });
  // Grouped on the filtered subset, then sorted with the very same helper the
  // worker uses, so the preview is the order the tab strip ends up in.
  const groups = groupTabs(tabs, groupBy, duplicateIds)
    .map((group) => ({ ...group, tabs: sortGroupTabs(group.tabs, sortBy) }));
  const chips = [
    { key: FILTER.ALL, label: t('filter.all'), count: stats.totalTabs ?? 0 },
    { key: FILTER.DUPLICATES, label: t('filter.duplicates'), count: stats.duplicateTabs ?? 0 },
    { key: FILTER.ACTIVE, label: t('filter.active'), count: state.tabs.filter((tab) => tab.active).length },
    ...[...new Set(state.tabs.map((tab) => tab.category))].map((key) => ({
      key,
      label: categoryLabel(key),
      count: state.tabs.filter((tab) => tab.category === key).length
    }))
  ];

  /** Toast helper: green when the worker said ok, red with its error otherwise. */
  const report = (result, okMessage, failMessage = okMessage) =>
    show(result.ok ? okMessage : result.error || failMessage, result.ok ? 'success' : 'error');

  const move = useTabMove(state.tabs, report);
  const commands = useTabCommands({
    state, settings, stats, sortBy, report, ask: confirmState.ask, notify: show
  });

  const reload = async () => report(await refresh(), t('status.refreshed'));

  const copy = async (text, message) => {
    await navigator.clipboard.writeText(text);
    show(message);
  };

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleGroup = (key) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const closeSelected = async () => {
    const ids = [...selected];
    if (await commands.closeTabs(ids, t('confirm.closeSelected', { count: ids.length }))) setSelected(new Set());
  };

  const collapseAll = () => setCollapsed(collapsed.size > 0 ? new Set() : new Set(groups.map((group) => group.key)));

  const openSettings = () => {
    setDraft({
      duplicateRule: settings?.duplicateRule || KEEP_RULES.ACTIVE,
      theme: settings?.theme || 'system',
      locale: settings?.locale || 'auto',
      ignoreGoogleTabId: settings?.ignoreGoogleTabId === true,
      sameOriginDuplicates: settings?.sameOriginDuplicates === true,
      warningEnabled: settings?.warningEnabled !== false,
      autoCloseDuplicates: settings?.autoCloseDuplicates === true
    });
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const result = await updateSettings(draft);
    // A refused write must not look like a success: the dialog used to close
    // and claim "saved" even when the worker answered ok:false.
    if (!result.ok) return show(result.error || t('status.settingsFailed'), 'error');
    setSettingsOpen(false);
    show(t('status.settingsSaved'), 'success');
  };

  const resetAll = async () => {
    const result = await resetSettings();
    if (!result.ok) return show(result.error || t('status.settingsFailed'), 'error');
    setSettingsOpen(false);
    show(t('status.settingsReset'));
  };

  return (
    <>
      <HeaderBar
        onToggleTheme={() => updateSettings({ theme: nextTheme(settings?.theme) }, true)}
        onHelp={() => setHelpOpen(true)}
        onSettings={openSettings}
        onRefresh={reload}
        onCollapseAll={collapseAll}
        onCleanDuplicates={commands.cleanDuplicates}
        onCloseAllDuplicates={commands.closeAllDuplicates}
      />

      <section className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4">
        <Stat value={stats.totalTabs ?? 0} label={t('stat.totalTabs')} />
        <Stat value={stats.totalWindows ?? 0} label={t('stat.windows')} />
        <Stat value={stats.duplicateTabs ?? 0} label={t('stat.duplicateTabs')} tone="dup" />
        <Stat value={stats.sheetsTabs ?? 0} label={t('stat.googleSheets')} tone="sheets" />
      </section>

      <div className="sticky top-0 z-30 mt-4 border-b border-border bg-background/95 backdrop-blur">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          chips={chips}
          filter={filter}
          onFilterChange={setFilter}
          groupBy={groupBy}
          sortBy={sortBy}
          onUpdate={updateSettings}
          sorting={commands.sorting}
          onApplySort={commands.applySort}
        />
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            moveDisabled={move.options === 0}
            onClose={closeSelected}
            onMove={() => move.open([...selected])}
            onClear={() => setSelected(new Set())}
          />
        )}
      </div>

      <main className="flex flex-col gap-3 px-4 py-4">
        {tabs.length === 0 ? (
          <EmptyState message={query ? t('status.noResults') : t('status.noTabs')} icon={Search} />
        ) : groups.length === 0 ? (
          // Reachable in spreadsheet mode when the search matched no Google Sheet.
          <EmptyState message={t('status.noSheets')} icon={Table} />
        ) : groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            collapsed={collapsed.has(group.key)}
            onToggle={() => toggleGroup(group.key)}
          >
            {group.tabs.map((tab) => (
              <TabRow
                key={tab.id}
                tab={tab}
                duplicate={duplicateIds.has(tab.id)}
                selected={selected.has(tab.id)}
                targets={windowOptions(state.tabs, tab.windowId)}
                onSelect={() => toggleSelect(tab.id)}
                onActivate={() => send(MSG.ACTIVATE_TAB, { tabId: tab.id, windowId: tab.windowId })}
                onClose={() => send(MSG.CLOSE_TABS, { tabIds: [tab.id] })}
                onCloseOthers={() => send(MSG.CLOSE_OTHER_TABS, { tabId: tab.id })}
                onMove={() => move.open([tab.id], tab.windowId)}
                onCopy={copy}
              />
            ))}
          </GroupSection>
        ))}
      </main>

      <SettingsDialog
        open={settingsOpen}
        draft={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onSave={saveSettings}
        onReset={resetAll}
        onClose={() => setSettingsOpen(false)}
      />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
      {move.pending && move.targets.length > 0 && (
        <MoveDialog
          targets={move.targets}
          value={move.windowId}
          onChange={move.setWindowId}
          onConfirm={move.confirm}
          onClose={move.close}
        />
      )}
      <ConfirmDialog
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.confirm}
        onCancel={confirmState.cancel}
      />
      <Toast toast={toast} />
    </>
  );
}
