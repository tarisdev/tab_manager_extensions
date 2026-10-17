import { parseTab } from '@/utils/tab-parser.js';
import { findDuplicateGroups, countDuplicates, duplicateTabIds } from '@/utils/duplicate-detector.js';
import { getSettings } from '@/services/storage.js';
import { MSG, REFRESH_DEBOUNCE_MS } from '@/constants/index.js';
import { resolveLocale, t } from '@/i18n/index.js';

/**
 * Tab state cache: read every open tab, derive the duplicate report and push it
 * to any open popup/dashboard. Single source of truth - popup and dashboard only
 * send messages and render what comes back.
 */
function emptyStats() {
  return { totalTabs: 0, totalWindows: 0, duplicateTabs: 0, sheetsTabs: 0 };
}

let cachedState = { tabs: [], duplicateGroups: [], duplicateTabIds: [], stats: emptyStats() };
let refreshTimer = null;
let refreshInFlight = null;
let rerunAfterRefresh = false;

/** The last built state. Callers read it at call time, never capture it. */
export function getState() {
  return cachedState;
}

/** Read every open tab in every window and derive the duplicate report. */
async function buildState(settings) {
  const [tabs, windows] = await Promise.all([
    chrome.tabs.query({}),
    chrome.windows.getAll({})
  ]);

  const windowLabels = new Map();
  windows.forEach((win, order) => {
    windowLabels.set(win.id, t('windowLabel', { n: win.focused ? 1 : order + 1 }));
  });

  const parsed = tabs.map((tab) => {
    const item = parseTab(tab, settings);
    item.windowLabel = windowLabels.get(tab.windowId) || t('windowLabel', { n: tab.windowId });
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

export async function refresh() {
  // Guard against overlapping rebuilds; queue a follow-up run instead.
  if (refreshInFlight) {
    rerunAfterRefresh = true;
    return refreshInFlight;
  }
  refreshInFlight = (async () => {
    try {
      // Settings decide the language first: the window labels built below go
      // through t(), so the whole payload has to speak a single language.
      const settings = await getSettings();
      resolveLocale(settings.locale);
      cachedState = await buildState(settings);
      await updateBadge(cachedState, settings);
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
export function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    refresh();
  }, REFRESH_DEBOUNCE_MS);
}
