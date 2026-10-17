import { useState } from 'react';
import {
  ArrowDownUp, ChevronDown, ChevronRight, ChevronsDownUp, CircleHelp, EllipsisVertical, Eraser,
  MoveRight, RefreshCw, Search, Settings as SettingsIcon, SunMoon, Table, Trash, X
} from 'lucide-react';
import { FILTER, GROUP_MODES, KEEP_RULES, MSG, SORT_MODES } from '@/constants/index.js';
import { applyTranslations, categoryLabel, resolveLocale, t } from '@/i18n/index.js';
import { faviconUrl } from '@/services/favicon.js';
import { groupTabs, sortGroupTabs } from '@/utils/tab-grouper.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { ConfirmDialog } from '@/components/shared/confirm-dialog.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu.jsx';
import { EmptyState } from '@/components/ui/empty-state.jsx';
import { Input } from '@/components/ui/input.jsx';
import { RepoLink } from '@/components/ui/repo-link.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select.jsx';
import { Stat } from '@/components/ui/stat.jsx';
import { Toast } from '@/components/ui/toast.jsx';
import { useConfirm } from '@/hooks/useConfirm.js';
import { useTabState } from '@/hooks/useTabState.js';
import { nextTheme, useTheme } from '@/hooks/useTheme.js';
import { useToast } from '@/hooks/useToast.js';
import { cn } from '@/utils/cn.js';
import { send } from '@/services/messaging.js';

const CHIP_BASE = 'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors';

/** Every window a tab can be moved to, labelled the way the worker labels it. */
function windowOptions(tabs, currentWindowId = null) {
  const ids = [...new Set(tabs.map((tab) => tab.windowId))];
  return ids
    .filter((id) => id !== currentWindowId)
    .map((id) => {
      const tab = tabs.find((item) => item.windowId === id);
      return { id, label: tab?.windowLabel || t('windowLabel', { n: id }) };
    });
}

/** Select + trigger label come from the same option list, so they can never drift. */
function SelectField({ value, onChange, options, label, className }) {
  const current = options.find((option) => option.value === value) ?? options[0];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={className}>
        <span className="truncate">{current.label}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One tab: select box, favicon, title/sub-line, open/close and the ⋮ menu. */
function TabRow({ tab, duplicate, selected, targets, onSelect, onActivate, onClose, onCloseOthers, onMove, onCopy }) {
  const parts = [tab.domain || tab.url, `${tab.windowLabel} • ${t('tabId', { id: tab.id })}`];
  if (tab.isGoogleSheets && tab.gid !== null) parts.push(t('sheetLabel', { gid: tab.gid }));
  if (tab.active) parts.unshift(t('activeTag'));

  return (
    <li className={cn(
      'flex items-center gap-2 border-t border-border px-3 py-2 hover:bg-secondary/60',
      tab.active && 'shadow-[inset_3px_0_0_var(--ok)]',
      duplicate && 'bg-destructive/5'
    )}>
      <input
        type="checkbox"
        className="size-3.5 flex-none accent-primary"
        checked={selected}
        onChange={onSelect}
        aria-label={t('selectTab', { title: tab.title || tab.url })}
      />
      <img src={faviconUrl(tab.url)} alt="" className="size-4 flex-none rounded-sm" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{tab.title || tab.url}</div>
        <div className="truncate text-[11px] text-muted-foreground">{parts.join(' • ')}</div>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={tab.active} onClick={onActivate}>
          {tab.active ? t('action.active') : t('action.open')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('action.close')}</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon-sm" title={t('action.more')} aria-label={t('action.more')}>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onActivate}>{t('action.activate')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={onClose}>{t('action.close')}</DropdownMenuItem>
            {duplicate && <DropdownMenuItem onSelect={onCloseOthers}>{t('action.closeOthers')}</DropdownMenuItem>}
            {targets.length > 0 && <DropdownMenuItem onSelect={onMove}>{t('moveToWindow')}</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onCopy(tab.url, t('status.urlCopied'))}>{t('action.copyUrl')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCopy(`${tab.title}\n${tab.url}`, t('status.titleUrlCopied'))}>{t('action.copyTitleUrl')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** Collapsible card: the header is the toggle, the rows are only mounted when open. */
function GroupSection({ group, collapsed, onToggle, children }) {
  return (
    <section className="rounded-md border border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-t-md bg-secondary/60 px-3 py-2 text-left"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span className="flex w-3 flex-none justify-center text-muted-foreground">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold">{group.label}</span>
        <span className="flex-none text-[11px] font-normal text-muted-foreground">
          {t('tabCount', { count: group.count })}
        </span>
        {group.duplicateCount > 0 && (
          <Badge variant="destructive">{t('dupCount', { count: group.duplicateCount })}</Badge>
        )}
        {group.sheetCount > 1 && (
          <span className="flex-none text-[11px] font-normal text-muted-foreground">
            {t('sheetCount', { count: group.sheetCount })}
          </span>
        )}
      </button>
      {!collapsed && <ul className="m-0 list-none p-0">{children}</ul>}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({ checked, label, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" className="size-3.5 flex-none accent-primary" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function SettingsDialog({ open, draft, onChange, onSave, onReset, onClose }) {
  if (!draft) return null;
  const rules = [
    { value: KEEP_RULES.ACTIVE, label: t('settings.keepActive') },
    { value: KEEP_RULES.NEWEST, label: t('settings.keepNewest') },
    { value: KEEP_RULES.OLDEST, label: t('settings.keepOldest') }
  ];
  const themes = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') }
  ];
  const locales = [
    { value: 'auto', label: t('settings.langAuto') },
    { value: 'en', label: t('settings.langEn') },
    { value: 'vi', label: t('settings.langVi') }
  ];
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="w-[min(460px,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3 px-3 pb-3" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
          <Field label={t('settings.duplicateHandling')}>
            <SelectField
              value={draft.duplicateRule}
              onChange={(value) => onChange({ duplicateRule: value })}
              options={rules}
              label={t('settings.duplicateHandling')}
            />
          </Field>
          <Field label={t('settings.theme')}>
            <SelectField
              value={draft.theme}
              onChange={(value) => onChange({ theme: value })}
              options={themes}
              label={t('settings.theme')}
            />
          </Field>
          <Field label={t('settings.language')}>
            <SelectField
              value={draft.locale}
              onChange={(value) => onChange({ locale: value })}
              options={locales}
              label={t('settings.language')}
            />
          </Field>
          <CheckboxField
            checked={draft.ignoreGoogleTabId}
            label={t('settings.ignoreTabId')}
            onChange={(event) => onChange({ ignoreGoogleTabId: event.target.checked })}
          />
          <CheckboxField
            checked={draft.sameOriginDuplicates}
            label={t('settings.sameOrigin')}
            onChange={(event) => onChange({ sameOriginDuplicates: event.target.checked })}
          />
          <CheckboxField
            checked={draft.warningEnabled}
            label={t('settings.warning')}
            onChange={(event) => onChange({ warningEnabled: event.target.checked })}
          />
          <CheckboxField
            checked={draft.autoCloseDuplicates}
            label={t('settings.autoclose')}
            onChange={(event) => onChange({ autoCloseDuplicates: event.target.checked })}
          />
          <p className="text-[11px] text-muted-foreground">{t('settings.hint')}</p>
          <DialogFooter className="p-0 pt-1">
            <Button variant="danger" type="button" onClick={onReset}>{t('settings.reset')}</Button>
            <Button type="submit">{t('settings.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HelpDialog({ open, onClose }) {
  const points = ['help.badge', 'help.popup', 'help.dashboard', 'help.groups', 'help.clean', 'help.sheets', 'help.settings'];
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="w-[min(560px,calc(100vw-1rem))]">
        <DialogHeader>
          <DialogTitle>{t('help.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-3 pb-1 text-xs text-muted-foreground">
          <p>{t('help.intro')}</p>
          <ul className="ml-4 list-disc space-y-1.5">
            {points.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{t('action.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Target picker for Move: one list of the other windows, then confirm. */
function MoveDialog({ targets, value, onChange, onConfirm, onClose }) {
  const options = targets.map((target) => ({ value: String(target.id), label: target.label }));
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('moveToWindow')}</DialogTitle>
        </DialogHeader>
        <div className="px-3 pb-2">
          <SelectField value={value} onChange={onChange} options={options} label={t('moveToWindow')} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('action.cancel')}</Button>
          <Button onClick={onConfirm}>{t('action.confirm')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function Dashboard() {
  const { state, settings, refresh, updateSettings, resetSettings } = useTabState();
  const confirmState = useConfirm();
  const { toast, show } = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(FILTER.ALL);
  const [collapsed, setCollapsed] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [pendingMove, setPendingMove] = useState(null);
  const [moveTargets, setMoveTargets] = useState([]);
  const [moveWindowId, setMoveWindowId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sorting, setSorting] = useState(false);

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
  const moveOptions = windowOptions(state.tabs, null).length;
  const groupOptions = [
    { value: GROUP_MODES.DOMAIN, label: t('groupBy.domain') },
    { value: GROUP_MODES.WINDOW, label: t('groupBy.window') },
    { value: GROUP_MODES.SPREADSHEET, label: t('groupBy.spreadsheet') }
  ];
  const sortOptions = [
    { value: SORT_MODES.GROUP, label: t('sort.group') },
    { value: SORT_MODES.TITLE, label: t('sort.title') },
    { value: SORT_MODES.DOMAIN, label: t('sort.domain') },
    { value: SORT_MODES.RECENT, label: t('sort.recent') }
  ];

  /** Toast helper: green when the worker said ok, red with its error otherwise. */
  const report = (result, okMessage, failMessage = okMessage) =>
    show(result.ok ? okMessage : result.error || failMessage, result.ok ? 'success' : 'error');

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

  /** Nothing to move to when this is the only open window. */
  const openMove = (tabIds, excludeWindowId = null) => {
    const targets = windowOptions(state.tabs, excludeWindowId);
    if (targets.length === 0) return;
    setMoveTargets(targets);
    setMoveWindowId(String(targets[0].id));
    setPendingMove(tabIds);
  };

  const confirmMove = async () => {
    const tabIds = pendingMove;
    if (!tabIds) return;
    setPendingMove(null);
    const result = await send(MSG.MOVE_TABS, { tabIds, windowId: Number(moveWindowId) });
    report(result, t('status.moved', { count: tabIds.length }), t('status.moveFailed'));
  };

  /** Ask the worker what it would close, show the plan, act only on consent. */
  const cleanDuplicates = async () => {
    const rule = settings?.duplicateRule || KEEP_RULES.ACTIVE;
    const preview = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: true });
    if (!preview.ok) return show(preview.error || t('status.cleanupFailed'), 'error');
    if (preview.total === 0) return show(t('status.nothingToClean'));
    const lines = preview.plan.map((entry) =>
      t('confirm.planLine', { title: entry.title || entry.domain, count: entry.count }));
    const ok = await confirmState.ask(
      t('confirm.cleanPlan', { count: preview.total, plan: lines.join('\n'), total: preview.total }));
    if (!ok) return;
    const result = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: false });
    report(result, result.closed
      ? t('status.dupesClosed', { count: result.closed })
      : t('status.nothingClosed'), t('status.cleanupFailed'));
  };

  const closeAllDuplicates = async () => {
    const total = stats.duplicateTabs || 0;
    if (total === 0) return show(t('status.noDupesToClose'));
    if (!(await confirmState.ask(t('confirm.closeAll', { count: total })))) return;
    const ids = state.duplicateGroups.flatMap((group) => group.tabIds.slice(1));
    const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
    report(result, result.closed
      ? t('status.tabsClosed', { count: result.closed })
      : t('status.nothingClosed'));
  };

  const closeSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!(await confirmState.ask(t('confirm.closeSelected', { count: ids.length })))) return;
    const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
    setSelected(new Set());
    report(result, result.closed
      ? t('status.tabsClosed', { count: result.closed })
      : t('status.nothingClosed'));
  };

  /** Only reorders the real tab strip on demand: picking a rule never moves tabs. */
  const applySort = async () => {
    setSorting(true);
    const result = await send(MSG.SORT_TABS, { rule: sortBy });
    setSorting(false);
    report(result, t('status.sorted', { count: result.moved, windows: result.windows }), t('status.sortFailed'));
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
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2">
        <div className="flex items-center gap-1">
          <h1 className="text-base font-semibold tracking-wider">TAB MANAGER</h1>
          <Button
            variant="ghost" size="icon-sm"
            title={t('themeToggle')} aria-label={t('themeToggle')}
            onClick={() => updateSettings({ theme: nextTheme(settings?.theme) }, true)}
          >
            <SunMoon />
          </Button>
          <Button variant="ghost" size="icon-sm" title={t('help')} aria-label={t('help')} onClick={() => setHelpOpen(true)}>
            <CircleHelp />
          </Button>
          <Button variant="ghost" size="icon-sm" title={t('settings')} aria-label={t('settings')} onClick={openSettings}>
            <SettingsIcon />
          </Button>
          <RepoLink />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload}><RefreshCw />{t('refresh')}</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}><ChevronsDownUp />{t('collapseAll')}</Button>
          <Button size="sm" onClick={cleanDuplicates}><Eraser />{t('cleanDuplicates')}</Button>
          <Button variant="danger" size="sm" onClick={closeAllDuplicates}><Trash />{t('closeAllDuplicates')}</Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 px-4 pt-4 sm:grid-cols-4">
        <Stat value={stats.totalTabs ?? 0} label={t('stat.totalTabs')} />
        <Stat value={stats.totalWindows ?? 0} label={t('stat.windows')} />
        <Stat value={stats.duplicateTabs ?? 0} label={t('stat.duplicateTabs')} tone="dup" />
        <Stat value={stats.sheetsTabs ?? 0} label={t('stat.googleSheets')} tone="sheets" />
      </section>

      <div className="sticky top-0 z-30 mt-4 border-b border-border bg-background/95 backdrop-blur">
        <section className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative min-w-45 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search" autoComplete="off"
              value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')} aria-label={t('searchTabs')}
              className="pl-7"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('filter.label')}>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-pressed={filter === chip.key}
                onClick={() => setFilter(chip.key)}
                className={cn(CHIP_BASE, filter === chip.key
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-input text-muted-foreground hover:bg-secondary')}
              >
                {chip.label} {chip.count}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{t('groupBy')}</span>
            <SelectField
              className="w-37.5" value={groupBy} options={groupOptions} label={t('groupBy')}
              onChange={(value) => updateSettings({ groupBy: value }, true)}
            />
            <span className="text-[11px] text-muted-foreground">{t('sortBy')}</span>
            <SelectField
              className="w-37.5" value={sortBy} options={sortOptions} label={t('sortBy')}
              onChange={(value) => updateSettings({ sortBy: value }, true)}
            />
            <Button variant="outline" size="sm" disabled={sorting} onClick={applySort}>
              <ArrowDownUp />{t('action.sortTabs')}
            </Button>
          </div>
        </section>
        {selected.size > 0 && (
          <section className="flex flex-wrap items-center gap-2 border-t border-border bg-secondary/60 px-4 py-2">
            <span className="text-xs font-medium">{t('bulk.selected', { count: selected.size })}</span>
            <Button variant="danger" size="sm" onClick={closeSelected}><Trash />{t('bulk.close')}</Button>
            <Button
              variant="outline" size="sm" disabled={moveOptions === 0}
              onClick={() => openMove([...selected])}
            >
              <MoveRight />{t('bulk.move')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><X />{t('bulk.clear')}</Button>
          </section>
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
                onMove={() => openMove([tab.id], tab.windowId)}
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
      {pendingMove && moveTargets.length > 0 && (
        <MoveDialog
          targets={moveTargets}
          value={moveWindowId}
          onChange={setMoveWindowId}
          onConfirm={confirmMove}
          onClose={() => setPendingMove(null)}
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
