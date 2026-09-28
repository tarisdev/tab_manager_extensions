import { MSG, KEEP_RULES } from '../utils/constants.js';
import { faviconUrl } from '../utils/favicon.js';
import { askConfirm } from '../utils/confirm.js';
import { applyTranslations, resolveLocale, t } from '../utils/i18n.js';
import { hydrateIcons, withIcon } from '../utils/icons.js';

/** Thin wrapper: all Chrome access happens in the background worker. */
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
  state: { tabs: [], duplicateGroups: [], stats: {} },
  settings: null,
  query: ''
};

function setStatus(message, isError = false) {
  const node = el('status');
  node.textContent = message;
  node.classList.toggle('error', isError);
}

function applyTheme() {
  const theme = ui.settings?.theme || 'system';
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  applyTranslations();
}

function render() {
  resolveLocale(ui.settings?.locale);
  applyTheme();
  renderStats();
  renderSearchResults();
}

function renderStats() {
  const { totalTabs, totalWindows, duplicateTabs, sheetsTabs } = ui.state.stats;
  const cells = [
    { value: totalTabs, label: t('stat.tabs') },
    { value: totalWindows, label: t('stat.windows') },
    { value: duplicateTabs, label: t('stat.dup'), cls: 'dup' },
    { value: sheetsTabs, label: t('stat.sheets'), cls: 'sheets' }
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

/** Search results replace the duplicate list while the query is non-empty. */
function renderSearchResults() {
  const container = el('duplicates');
  const query = ui.query.trim().toLowerCase();
  if (!query) {
    renderDuplicates();
    return;
  }

  const matches = ui.state.tabs.filter((tab) => tab.searchable.includes(query)).slice(0, 25);
  if (matches.length === 0) {
    container.replaceChildren(el('p', 'empty', t('status.noResults')));
    return;
  }
  container.replaceChildren(...matches.map((tab) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'result';
    const img = document.createElement('img');
    img.className = 'favicon';
    img.alt = '';
    img.src = faviconUrl(tab.url);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('span');
    title.textContent = tab.title || tab.url;
    const domain = document.createElement('span');
    domain.className = 'domain';
    domain.textContent = tab.domain || tab.url;
    meta.append(title, domain);
    row.append(img, meta);
    row.addEventListener('click', async () => {
      await send(MSG.ACTIVATE_TAB, { tabId: tab.id, windowId: tab.windowId });
      window.close();
    });
    return row;
  }));
}

function renderDuplicates() {
  const container = el('duplicates');
  const groups = ui.state.duplicateGroups;
  if (groups.length === 0) {
    const empty = el('p', 'empty');
    withIcon(empty, 'circle-check');
    empty.append(document.createTextNode(t('status.noDupes')));
    container.replaceChildren(empty);
    return;
  }

  const heading = document.createElement('h2');
  heading.textContent = t('dupHeading', { count: ui.state.stats.duplicateTabs });
  const rows = groups.slice(0, 8).map((group) => {
    const row = document.createElement('div');
    row.className = 'dup-group';

    const info = document.createElement('div');
    info.className = 'dup-title';
    const title = document.createElement('strong');
    title.textContent = group.title || group.domain;
    const meta = document.createElement('div');
    meta.className = 'dup-meta';
    meta.textContent = group.isGoogleSheets
      ? `${group.domain} · ${t('sheetLabel', { gid: group.gid })}`
      : group.domain;
    info.append(title, meta);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `×${group.count}`;

    const target = group.tabIds[0];
    const keep = document.createElement('button');
    keep.type = 'button';
    keep.textContent = t('action.switch');
    keep.title = t('action.jumpFirstCopy');
    keep.addEventListener('click', async () => {
      const tab = ui.state.tabs.find((item) => item.id === target);
      await send(MSG.ACTIVATE_TAB, { tabId: target, windowId: tab?.windowId });
      window.close();
    });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'danger';
    withIcon(close, 'trash');
    close.append(document.createTextNode(t('action.closeN', { count: group.count - 1 })));
    close.title = t('action.closeCopies');
    close.addEventListener('click', async () => {
      const result = await send(MSG.CLOSE_OTHER_TABS, { tabId: target });
      setStatus(result.ok && result.closed
        ? t('status.sheetsClosed', { count: result.closed })
        : t('status.nothingToClose'), !result.ok);
    });

    row.append(info, badge, keep, close);
    return row;
  });

  container.replaceChildren(heading, ...rows);
}

async function load() {
  const result = await send(MSG.GET_STATE);
  if (result.ok) {
    ui.state = result.state;
    ui.settings = result.settings;
    render();
  } else {
    setStatus(t('status.workerDown'), true);
  }
}

el('search').addEventListener('input', (event) => {
  ui.query = event.target.value;
  renderSearchResults();
});

el('refresh').addEventListener('click', load);

el('theme-toggle').addEventListener('click', async () => {
  const order = ['system', 'light', 'dark'];
  const current = ui.settings?.theme || 'system';
  const next = order[(order.indexOf(current) + 1) % order.length];
  const result = await send(MSG.SET_SETTINGS, { patch: { theme: next } });
  if (result.ok) {
    ui.settings = result.settings;
    applyTheme();
  }
});

el('clean').addEventListener('click', async () => {
  const rule = ui.settings?.duplicateRule || KEEP_RULES.ACTIVE;
  const preview = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: true });
  if (!preview.ok) {
    setStatus(preview.error || t('status.cleanupFailed'), true);
    return;
  }
  if (preview.total === 0) {
    setStatus(t('status.nothingToClean'));
    return;
  }
  if (!(await askConfirm(t('confirm.clean', { count: preview.total })))) return;
  const result = await send(MSG.CLEAN_DUPLICATES, { rule, dryRun: false });
  setStatus(result.ok && result.closed ? t('status.dupesClosed', { count: result.closed }) : t('status.nothingClosed'),
    !result.ok);
});

el('close-all-dupes').addEventListener('click', async () => {
  const total = ui.state.stats.duplicateTabs;
  if (total === 0) {
    setStatus(t('status.noDupesToClose'));
    return;
  }
  if (!(await askConfirm(t('confirm.closeAll', { count: total })))) return;
  const ids = ui.state.duplicateGroups.flatMap((group) => group.tabIds.slice(1));
  const result = await send(MSG.CLOSE_TABS, { tabIds: ids });
  setStatus(result.ok && result.closed ? t('status.tabsClosed', { count: result.closed }) : t('status.nothingClosed'), !result.ok);
});

el('open-dashboard').addEventListener('click', () => {
  send(MSG.OPEN_DASHBOARD).then(() => window.close());
});

// Realtime: the worker pushes a new state on every tab/window event.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === MSG.STATE_CHANGED) {
    ui.state = message.state;
    render();
  }
});

// Static <i data-icon="…"> placeholders become real SVGs once the DOM is parsed.
hydrateIcons();

load();
