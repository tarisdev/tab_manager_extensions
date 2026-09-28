import { parseTab } from '../utils/tab-parser.js';
import { findDuplicateGroups, countDuplicates, duplicateTabIds, planCleanup } from '../utils/duplicate-detector.js';
import { getSettings, setSettings, resetSettings } from '../utils/storage.js';
import { MSG, KEEP_RULES, REFRESH_DEBOUNCE_MS } from '../utils/constants.js';

/**
 * Single source of truth for tab state. The service worker owns every
 * chrome.tabs / chrome.windows call; popup and dashboard only send messages
 * and render what comes back.
 */

function emptyStats() {
  return { totalTabs: 0, totalWindows: 0, duplicateTabs: 0, sheetsTabs: 0 };
}

let cachedState = { tabs: [], duplicateGroups: [], duplicateTabIds: [], stats: emptyStats() };
let refreshTimer = null;
let refreshInFlight = null;
let rerunAfterRefresh = false;

/** Read every open tab in every window and derive the duplicate report. */
async function buildState() {
  const [tabs, windows] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getAll({})
  ]);

  const windowLabels = new Map();
  windows.forEach((win, order) => {
    windowLabels.set(win.id, `Window ${win.focused ? 1 : order + 1}`);
  });

  const parsed = tabs.map((tab) => {
    const item = parseTab(tab);
    item.windowLabel = windowLabels.get(tab.windowId) || `Window ${tab.windowId}`;
    return item;
  });

  const duplicateGroups = findDuplicateGroups(parsed);
  const stats = {
    totalTabs: parsed.length,
    totalWindows: windows.length,
    duplicateTabs: countDuplicates(duplicateGroups),
    sheetsTabs: parsed.filter((tab) => tab.isGoogleSheets).length
  };

  return {
    tabs: parsed,
    duplicateGroups,
    duplicateTabIds: [...duplicateTabIds(duplicateGroups)],
    stats
  };
}

async function updateBadge(state, settings) {
  // The badge is the "this sheet is already open" warning (spec 19/20).
  const count = settings.warningEnabled ? state.stats.duplicateTabs : 0;
  try {
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#c5221f' });
  } catch (error) {
    console.warn('[tab-manager] badge update failed', error);
  }
}

/** Push state to any open popup/dashboard. Errors only mean "nobody listening". */
async function broadcastState() {
  try {
    await chrome.runtime.sendMessage({ type: MSG.STATE_CHANGED, state: cachedState });
  } catch {
    // No receiver open - nothing to do.
  }
}

async function refresh() {
  // Guard against overlapping rebuilds; queue a follow-up run instead.
  if (refreshInFlight) {
    rerunAfterRefresh = true;
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    try {
      cachedState = await buildState();
      await updateBadge(cachedState, await getSettings());
      await broadcastState();
    } catch (error) {
      console.warn('[tab-manager] refresh failed', error);
    } finally {
      refreshInFlight = null;
    }
    if (rerunAfterRefresh) {
      rerunAfterRefresh = false;
      await refresh();
    }
  })();
  return refreshInFlight;
}

/** Coalesce event bursts into a single rebuild. Event-driven, never polled. */
function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refresh();
  }, REFRESH_DEBOUNCE_MS);
}

for (const event of ['onRemoved', 'onUpdated', 'onActivated', 'onMoved', 'onAttached', 'onDetached']) {
  chrome.tabs[event].addListener(scheduleRefresh);
}
chrome.windows.onCreated.addListener(scheduleRefresh);
chrome.windows.onRemoved.addListener(scheduleRefresh);

/**
 * A new tab may be a copy of something already open. Rebuild first so the
 * decision is made on fresh state, then auto-close only if the user opted in
 * (off by default - spec 27 says the extension reports, it does not act).
 */
chrome.tabs.onCreated.addListener(async () => {
  scheduleRefresh();
  const settings = await getSettings();
  if (!settings.autoCloseDuplicates) return;
  await refresh();
  if (cachedState.stats.duplicateTabs === 0) return;
  const tabsById = new Map(cachedState.tabs.map((tab) => [tab.id, tab]));
  const ids = planCleanup(cachedState.duplicateGroups, settings.duplicateRule, tabsById)
    .flatMap((entry) => entry.closeIds);
  if (ids.length > 0) await closeTabs(ids);
});

chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);

/** Ids that still exist - guards every destructive call against stale ids. */
async function existingTabIds() {
  const tabs = await chrome.tabs.query({});
  return new Set(tabs.map((tab) => tab.id));
}

/**
 * Close tabs, skipping ids that vanished and never closing the last tab of a
 * window (that would close the window itself).
 */
async function closeTabs(tabIds) {
  const alive = await existingTabIds();
  const windowsOf = new Map();
  for (const tab of cachedState.tabs) {
    windowsOf.set(tab.windowId, (windowsOf.get(tab.windowId) || 0) + 1);
  }

  const toClose = [];
  for (const id of tabIds) {
    if (!alive.has(id) || toClose.includes(id)) continue;
    const tab = cachedState.tabs.find((item) => item.id === id);
    if (tab) {
      // Count down as we go: selecting every tab of a window must not close
      // the window itself.
      if (windowsOf.get(tab.windowId) <= 1) continue;
      windowsOf.set(tab.windowId, windowsOf.get(tab.windowId) - 1);
    }
    toClose.push(id);
  }

  if (toClose.length === 0) return { closed: 0, skipped: tabIds.length };

  try {
    await chrome.tabs.remove(toClose);
  } catch (error) {
    console.warn('[tab-manager] close failed', error);
  }
  await refresh();
  return { closed: toClose.length, skipped: tabIds.length - toClose.length };
}

const HANDLERS = {
  async [MSG.GET_STATE]() {
    await refresh();
    return { state: cachedState, settings: await getSettings() };
  },

  async [MSG.ACTIVATE_TAB]({ tabId, windowId }) {
    try {
      if (windowId != null) await chrome.windows.update(windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
    } catch (error) {
      console.warn('[tab-manager] activate failed', error);
      return { ok: false, error: 'Tab no longer exists' };
    }
    await refresh();
    return { ok: true };
  },

  async [MSG.CLOSE_TABS]({ tabIds }) {
    return closeTabs(tabIds);
  },

  /** Close every other copy of the same content as `tabId`. */
  async [MSG.CLOSE_OTHER_TABS]({ tabId }) {
    const tab = cachedState.tabs.find((item) => item.id === tabId);
    if (!tab || !tab.duplicateKey) return { closed: 0, skipped: 0 };
    const group = cachedState.duplicateGroups.find((item) => item.key === tab.duplicateKey);
    if (!group) return { closed: 0, skipped: 0 };
    return closeTabs(group.tabIds.filter((id) => id !== tabId));
  },

  async [MSG.MOVE_TABS]({ tabIds, windowId, index = -1 }) {
    try {
      await chrome.tabs.move(tabIds, { windowId, index });
    } catch (error) {
      console.warn('[tab-manager] move failed', error);
      return { ok: false, error: 'Move failed' };
    }
    await refresh();
    return { ok: true };
  },

  /** Preview (dryRun) or execute the cleanup for every duplicate group. */
  async [MSG.CLEAN_DUPLICATES]({ rule, dryRun }) {
    const current = await getSettings();
    const useRule = Object.values(KEEP_RULES).includes(rule) ? rule : current.duplicateRule;
    const tabsById = new Map(cachedState.tabs.map((tab) => [tab.id, tab]));
    const plan = planCleanup(cachedState.duplicateGroups, useRule, tabsById);
    const closeIds = plan.flatMap((entry) => entry.closeIds);

    if (dryRun) {
      return {
        plan: plan.map(({ group, keepId, closeIds: ids }) => ({
          title: group.title, domain: group.domain, keepId, count: ids.length
        })),
        total: closeIds.length,
        rule: useRule
      };
    }
    if (closeIds.length === 0) return { closed: 0, skipped: 0, rule: useRule };
    const result = await closeTabs(closeIds);
    return { ...result, rule: useRule };
  },

  async [MSG.GET_SETTINGS]() {
    return { settings: await getSettings() };
  },

  async [MSG.SET_SETTINGS]({ patch }) {
    return { settings: await setSettings(patch) };
  },

  async [MSG.RESET_SETTINGS]() {
    return { settings: await resetSettings() };
  },

  async [MSG.OPEN_DASHBOARD]() {
    const url = chrome.runtime.getURL('dashboard/dashboard.html');
    const existing = await chrome.tabs.query({ url });
    if (existing.length > 0) {
      await chrome.tabs.update(existing[0].id, { active: true });
      await chrome.windows.update(existing[0].windowId, { focused: true });
      return { ok: true, reused: true };
    }
    await chrome.tabs.create({ url });
    return { ok: true, reused: false };
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;
  const handler = HANDLERS[message.type];
  if (!handler) return false;

  Promise.resolve(handler(message))
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => {
      console.warn('[tab-manager] message failed', message.type, error);
      sendResponse({ ok: false, error: String((error && error.message) || error) });
    });
  return true; // keep the channel open for the async response
});

// Warm up so the badge is correct before any UI opens.
refresh();

