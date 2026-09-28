import { MSG, KEEP_RULES, GROUP_MODES, FILTER } from '../utils/constants.js';
import { groupTabs } from '../utils/tab-grouper.js';
import { categoryLabel, t, applyTranslations, resolveLocale } from '../utils/i18n.js';
import { faviconUrl } from '../utils/favicon.js';
import { hydrateIcons, icon, withIcon } from '../utils/icons.js';

async function send(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...payload });
  } catch (error) {
    console.warn('[tab-manager] message failed', type, error);
    return { ok: false, error: 'Background unavailable' };
  }
}

const el = (id) => document.getElementById(id);
const ui = {
  state: { tabs: [], duplicateGroups: [], duplicateTabIds: [], stats: {} },
  settings: {},
  query: '',
  filter: FILTER.ALL,
  collapsed: new Set(),
  selected: new Set()
};

let statusTimer = null;
function setStatus(message, isError = false) {
  const node = el('status');
  node.textContent = message;
  node.classList.toggle('error', isError);
  node.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => node.classList.remove('show'), 2500);
}

function applyTheme() {
  const theme = ui.settings?.theme || 'system';
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  applyTranslations();
}

/** Tabs left after applying the active search box and filter chip. */
function visibleTabs() {
  const query = ui.query.trim().toLowerCase();
  const duplicateIds = new Set(ui.state.duplicateTabIds);
  return ui.state.tabs.filter((tab) => {
    if (query && !tab.searchable.includes(query)) return false;
    if (ui.filter === FILTER.DUPLICATES) return duplicateIds.has(tab.id);
    if (ui.filter === FILTER.ACTIVE) return tab.active;
    if (ui.filter !== FILTER.ALL && tab.category !== ui.filter) return false;
    return true;
  });
}

function renderStats() {
  const { totalTabs, totalWindows, duplicateTabs, sheetsTabs } = ui.state.stats;
  const cells = [
    { value: totalTabs, label: t('stat.totalTabs') },
    { value: totalWindows, label: t('stat.windows') },
    { value: duplicateTabs, label: t('stat.duplicateTabs'), cls: 'dup' },
    { value: sheetsTabs, label: t('stat.googleSheets'), cls: 'sheets' }
  ];
  el('stats').replaceChildren(...cells.map(({ value, label, cls }) => {
    const box = document.createElement('div');
    box.className = `stat${cls ? ` ${cls}` : ''}`;
    const num = document.createElement('div');
    num.className = 'stat-value';
    num.textContent = String(value ?? 0);
    const name = document.createElement('div');
    name.className = 'stat-label';
    name.textContent = label;
    box.append(num, name);
    return box;
  }));
}

/** All / Duplicates / Active plus one chip per category actually present. */
function renderFilters() {
  const categories = [...new Set(ui.state.tabs.map((tab) => tab.category))];
  const chips = [
    { key: FILTER.ALL, label: t('filter.all'), count: ui.state.stats.totalTabs },
    { key: FILTER.DUPLICATES, label: t('filter.duplicates'), count: ui.state.stats.duplicateTabs },
    { key: FILTER.ACTIVE, label: t('filter.active'), count: ui.state.tabs.filter((tab) => tab.active).length },
    ...categories.map((key) => ({
      key,
      label: categoryLabel(key),
      count: ui.state.tabs.filter((tab) => tab.category === key).length
    }))
  ];

  el('filters').replaceChildren(...chips.map(({ key, label, count }) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', String(ui.filter === key));
    chip.textContent = `${label} ${count}`;
    chip.addEventListener('click', () => {
      ui.filter = key;
      render();
    });
    return chip;
  }));
}

function windowOptions(currentWindowId) {
  return ui.state.tabs
    .map((tab) => tab.windowId)
    .filter((id, index, all) => all.indexOf(id) === index && id !== currentWindowId)
    .map((id) => {
      const tab = ui.state.tabs.find((item) => item.windowId === id);
      return { id, label: tab?.windowLabel || t('windowLabel', { n: id }) };
    });
}

function menuButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

/** The ⋮ menu: activate, close, close copies, move, copy. */
function buildMenu(tab, duplicateIds) {
  const details = document.createElement('details');
  details.className = 'menu';
  const summary = document.createElement('summary');
  summary.append(icon('ellipsis-vertical'));
  summary.title = t('action.more');
  summary.setAttribute('aria-label', t('action.more'));
  const panel = document.createElement('div');
  panel.className = 'menu-panel';

  panel.append(
    menuButton(t('action.activate'), () => send(MSG.ACTIVATE_TAB, { tabId: tab.id, windowId: tab.windowId })),
    menuButton(t('action.close'), () => send(MSG.CLOSE_TABS, { tabIds: [tab.id] }))
  );

  if (duplicateIds.has(tab.id)) {
    panel.append(menuButton(t('action.closeOthers'), () => send(MSG.CLOSE_OTHER_TABS, { tabId: tab.id })));
  }

  const targets = windowOptions(tab.windowId);
  if (targets.length > 0) {
    const label = document.createElement('div');
    label.className = 'menu-label';
    label.textContent = t('moveToWindow');
    const select = document.createElement('select');
    select.setAttribute('aria-label', t('moveToWindow'));
    select.append(new Option(t('chooseWindow'), ''));
    for (const target of targets) select.append(new Option(target.label, String(target.id)));
    select.addEventListener('change', () => {
      if (select.value) send(MSG.MOVE_TABS, { tabIds: [tab.id], windowId: Number(select.value) });
      details.open = false;
    });
    panel.append(label, select);
  }

  panel.append(
    menuButton(t('action.copyUrl'), async () => {
      await navigator.clipboard.writeText(tab.url);
      setStatus(t('status.urlCopied'));
    }),
    menuButton(t('action.copyTitleUrl'), async () => {
      await navigator.clipboard.writeText(`${tab.title}\n${tab.url}`);
      setStatus(t('status.titleUrlCopied'));
    })
  );

  details.append(summary, panel);
  return details;
}

function buildTabRow(tab, duplicateIds) {
  const row = document.createElement('li');
  row.className = 'tab-row';
  if (tab.active) row.classList.add('active');
  if (duplicateIds.has(tab.id)) row.classList.add('duplicate');
  if (ui.selected.has(tab.id)) row.classList.add('selected');

  const select = document.createElement('input');
  select.type = 'checkbox';
  select.checked = ui.selected.has(tab.id);
  select.setAttribute('aria-label', `Select ${tab.title || tab.url}`);
  select.addEventListener('change', () => {
    if (select.checked) ui.selected.add(tab.id);
    else ui.selected.delete(tab.id);
    row.classList.toggle('selected', select.checked);
    renderBulkbar();
  });

  const img = document.createElement('img');
  img.className = 'favicon';
  img.alt = '';
  img.src = faviconUrl(tab.url);

  const info = document.createElement('div');
  info.className = 'tab-info';
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title || tab.url;
  const sub = document.createElement('div');
  sub.className = 'tab-sub';
  const parts = [tab.domain || tab.url, `${tab.windowLabel} • ${t('tabId', { id: tab.id })}`];
  if (tab.isGoogleSheets) parts.push(t('sheetLabel', { gid: tab.gid }));
  if (tab.active) parts.unshift(t('activeTag'));
  sub.textContent = parts.join(' • ');
  info.append(title, sub);

  const actions = document.createElement('div');
  actions.className = 'tab-actions';
  const open = menuButton(tab.active ? t('action.active') : t('action.open'), () => {
    send(MSG.ACTIVATE_TAB, { tabId: tab.id, windowId: tab.windowId });
  });
  if (tab.active) open.disabled = true;
  const close = menuButton(t('action.close'), () => send(MSG.CLOSE_TABS, { tabIds: [tab.id] }));
  actions.append(open, close, buildMenu(tab, duplicateIds));

  row.append(select, img, info, actions);
  return row;
}

function buildGroup(group, duplicateIds) {
  const section = document.createElement('section');
  section.className = 'group';

  const isCollapsed = ui.collapsed.has(group.key);
  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'group-header';
  header.setAttribute('aria-expanded', String(!isCollapsed));

  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.append(icon(isCollapsed ? 'chevron-right' : 'chevron-down'));
  const title = document.createElement('span');
  title.className = 'group-title';
  title.textContent = group.label;
  const count = document.createElement('span');
  count.className = 'group-meta';
  count.textContent = t('tabCount', { n: group.count });
  header.append(caret, title, count);

  // Only duplicates are closable, so the badge appears only when there are some.
  if (group.duplicateCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = t('dupCount', { count: group.duplicateCount });
    header.append(badge);
  }
  if (group.sheetCount > 1) {
    const sheets = document.createElement('span');
    sheets.className = 'group-meta';
    sheets.textContent = t('sheetCount', { count: group.sheetCount });
    header.append(sheets);
  }

  header.addEventListener('click', () => {
    if (ui.collapsed.has(group.key)) ui.collapsed.delete(group.key);
    else ui.collapsed.add(group.key);
    renderGroups();
  });

  section.append(header);
  if (!isCollapsed) {
    const list = document.createElement('ul');
    list.className = 'tab-list';
    for (const tab of group.tabs) list.append(buildTabRow(tab, duplicateIds));
    section.append(list);
  }
  return section;
}

function renderGroups() {
  const container = el('groups');
  const duplicateIds = new Set(ui.state.duplicateTabIds);
  const tabs = visibleTabs();

  if (tabs.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = ui.query ? t('status.noResults') : t('status.noTabs');
    container.replaceChildren(empty);
    return;
  }

  // Group on the filtered subset so group counts match what is on screen.
  const groups = groupTabs(tabs, ui.settings.groupBy || GROUP_MODES.DOMAIN, duplicateIds);
  if (groups.length === 0) {
    // Reachable in spreadsheet mode when the search matched no Google Sheet.
    const empty = document.createElement('p');
    empty.className = 'empty';
    withIcon(empty, 'table');
    empty.append(document.createTextNode(t('status.noSheets')));
    container.replaceChildren(empty);
    return;
  }
  container.replaceChildren(...groups.map((group) => buildGroup(group, duplicateIds)));
}

function renderBulkbar() {
  const bar = el('bulkbar');
  bar.hidden = ui.selected.size === 0;
  el('bulk-count').textContent = t('bulk.selected', { count: ui.selected.size });

  const select = el('bulk-window');
  const current = select.value;
  select.replaceChildren(new Option(t('moveToWindow'), ''));
  for (const { id, label } of windowOptions(null)) select.append(new Option(label, String(id)));
  select.value = current;
}

function render() {
  resolveLocale(ui.settings?.locale);
  applyTheme();
  renderStats();
  renderFilters();
  renderGroups();
  renderBulkbar();
}

async function load() {
  const result = await send(MSG.GET_STATE);
  if (!result.ok) {
    setStatus(result.error || t('status.workerDown'), true);
    return;
  }
  ui.state = result.state;
  ui.settings = result.settings;
  el('group-mode').value = ui.settings.groupBy || GROUP_MODES.DOMAIN;
  render();
}

/** Ask the worker what it would close, show it, then act only on consent. */
async function cleanDuplicates() {
  const rule = ui.settings.duplicateRule || KEEP_RULES.ACTIVE;
  const preview = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: true });
  if (!preview.ok) {
    setStatus(preview.error || t('status.cleanupFailed'), true);
    return;
  }
  if (preview.total === 0) {
    setStatus(t('status.nothingToClean'));
    return;
  }

  const lines = preview.plan.map((entry) =>
    t('confirm.planLine', { title: entry.title || entry.domain, count: entry.count }));
  const confirmed = window.confirm(
    t('confirm.cleanPlan', { count: preview.total, plan: lines.join('\n'), total: preview.total })
  );
  if (!confirmed) return;

  const result = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: false });
  setStatus(result.ok && result.closed ? t('status.dupesClosed', { count: result.closed }) : t('status.nothingClosed'),
    !result.ok);
}

async function closeSelected() {
  const ids = [...ui.selected];
  if (ids.length === 0) return;
  if (!window.confirm(t('confirm.closeSelected', { count: ids.length }))) return;
  const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
  ui.selected.clear();
  setStatus(result.ok && result.closed ? t('status.tabsClosed', { count: result.closed }) : t('status.nothingClosed'), !result.ok);
}

async function moveSelected() {
  const windowId = Number(el('bulk-window').value);
  const ids = [...ui.selected];
  if (!windowId || ids.length === 0) return;
  const result = await send(MSG.MOVE_TABS, { tabIds: ids, windowId });
  if (result.ok) setStatus(t('status.moved', { count: ids.length }));
  else setStatus(result.error || t('status.moveFailed'), true);
}

function openSettings() {
  el('set-rule').value = ui.settings.duplicateRule || KEEP_RULES.ACTIVE;
  el('set-theme').value = ui.settings.theme || 'system';
  el('set-locale').value = ui.settings.locale || 'auto';
  el('set-warning').checked = ui.settings.warningEnabled !== false;
  el('set-autoclose').checked = ui.settings.autoCloseDuplicates === true;
  el('settings-dialog').showModal();
}

el('search').addEventListener('input', (event) => {
  ui.query = event.target.value;
  renderGroups();
});

el('group-mode').addEventListener('change', async (event) => {
  const result = await send(MSG.SET_SETTINGS, { patch: { groupBy: event.target.value } });
  if (result.ok) {
    ui.settings = result.settings;
    renderGroups();
  }
});

el('refresh').addEventListener('click', load);
el('clean').addEventListener('click', cleanDuplicates);
el('bulk-close').addEventListener('click', closeSelected);
el('bulk-move').addEventListener('click', moveSelected);
el('bulk-clear').addEventListener('click', () => {
  ui.selected.clear();
  render();
});

el('collapse-all').addEventListener('click', () => {
  if (ui.collapsed.size > 0) {
    ui.collapsed.clear();
  } else {
    // Collapse whatever the current grouping mode produced.
    for (const group of groupTabs(visibleTabs(), ui.settings.groupBy || GROUP_MODES.DOMAIN)) {
      ui.collapsed.add(group.key);
    }
  }
  renderGroups();
});

el('close-all-dupes').addEventListener('click', async () => {
  const total = ui.state.stats.duplicateTabs;
  if (total === 0) {
    setStatus(t('status.noDupesToClose'));
    return;
  }
  if (!window.confirm(t('confirm.closeAll', { count: total }))) return;
  const ids = ui.state.duplicateGroups.flatMap((group) => group.tabIds.slice(1));
  const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
  setStatus(result.ok && result.closed ? t('status.tabsClosed', { count: result.closed }) : t('status.nothingClosed'), !result.ok);
});

el('theme-toggle').addEventListener('click', async () => {
  const order = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(ui.settings.theme || 'system') + 1) % order.length];
  const result = await send(MSG.SET_SETTINGS, { patch: { theme: next } });
  if (result.ok) {
    ui.settings = result.settings;
    applyTheme();
  }
});

el('open-settings').addEventListener('click', openSettings);
el('open-help').addEventListener('click', () => el('help-dialog').showModal());
el('help-close').addEventListener('click', () => el('help-dialog').close());

el('settings-save').addEventListener('click', async () => {
  const result = await send(MSG.SET_SETTINGS, {
    patch: {
      duplicateRule: el('set-rule').value,
      theme: el('set-theme').value,
      locale: el('set-locale').value,
      warningEnabled: el('set-warning').checked,
      autoCloseDuplicates: el('set-autoclose').checked
    }
  });
  if (result.ok) {
    ui.settings = result.settings;
    render();
    setStatus(t('status.settingsSaved'));
  }
});

el('settings-reset').addEventListener('click', async () => {
  const result = await send(MSG.RESET_SETTINGS);
  if (result.ok) {
    ui.settings = result.settings;
    el('settings-dialog').close();
    render();
    setStatus(t('status.settingsReset'));
  }
});

// Realtime: the worker pushes fresh state on every tab/window event.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    ui.state = message.state;
    render();
  }
});

// Static <i data-icon="…"> placeholders become real SVGs once the DOM is parsed.
hydrateIcons();

load();

