import { planCleanup } from '@/utils/duplicate-detector.js';
import { groupTabs, sortGroupTabs } from '@/utils/tab-grouper.js';
import { getSettings } from '@/services/storage.js';
import { KEEP_RULES, SORT_MODES } from '@/constants/index.js';
import { getState, refresh } from '@/background/state.js';

/**
 * Every mutating chrome.tabs / chrome.windows call. The worker is the only place
 * these run; `getState()` is read fresh on each call so no stale ids are used.
 */

/** Ids that still exist - guards every destructive call against stale ids. */
async function existingTabIds() {
  const tabs = await chrome.tabs.query({});
  return new Set(tabs.map((tab) => tab.id));
}

/** How many tabs each window holds, so the last one is never closed. */
function tabCountPerWindow() {
  const counts = new Map();
  for (const tab of getState().tabs) {
    counts.set(tab.windowId, (counts.get(tab.windowId) || 0) + 1);
  }
  return counts;
}

/**
 * Close tabs, skipping ids that vanished and never closing the last tab of a
 * window (that would close the window itself).
 */
export async function closeTabs(tabIds) {
  // Message payloads are the only untrusted input here: keep the shape checked.
  if (!Array.isArray(tabIds)) return { closed: 0, skipped: 0 };
  const alive = await existingTabIds();
  const windowsOf = tabCountPerWindow();

  const toClose = [];
  for (const id of tabIds) {
    if (!alive.has(id) || toClose.includes(id)) continue;
    const tab = getState().tabs.find((item) => item.id === id);
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

export async function activateTab({ tabId, windowId }) {
  try {
    if (windowId != null) await chrome.windows.update(windowId, { focused: true });
    await chrome.tabs.update(tabId, { active: true });
  } catch (error) {
    console.warn('[tab-manager] activate failed', error);
    return { ok: false, error: 'Tab no longer exists' };
  }
  await refresh();
  return { ok: true };
}

/** Close every other copy of the same content as `tabId`. */
export async function closeOtherTabs({ tabId }) {
  const tab = getState().tabs.find((item) => item.id === tabId);
  if (!tab || !tab.duplicateKey) return { closed: 0, skipped: 0 };
  const group = getState().duplicateGroups.find((item) => item.key === tab.duplicateKey);
  if (!group) return { closed: 0, skipped: 0 };
  return closeTabs(group.tabIds.filter((id) => id !== tabId));
}

export async function moveTabs({ tabIds, windowId, index = -1 }) {
  if (!Array.isArray(tabIds)) return { ok: false, error: 'Move failed' };
  try {
    await chrome.tabs.move(tabIds, { windowId, index });
  } catch (error) {
    console.warn('[tab-manager] move failed', error);
    return { ok: false, error: 'Move failed' };
  }
  await refresh();
  return { ok: true };
}

/**
 * Reorder the real tab strip. The order is exactly the one on screen: group
 * order first, then the chosen rule inside each group.
 */
export async function sortTabs({ rule }) {
  const settings = await getSettings();
  const useRule = Object.values(SORT_MODES).includes(rule) ? rule : settings.sortBy;
  const state = getState();
  const groups = groupTabs(state.tabs, settings.groupBy, new Set(state.duplicateTabIds));

  const perWindow = new Map();
  for (const group of groups) {
    for (const tab of sortGroupTabs(group.tabs, useRule)) {
      if (!perWindow.has(tab.windowId)) perWindow.set(tab.windowId, []);
      perWindow.get(tab.windowId).push(tab);
    }
  }

  let moved = 0;
  for (const [windowId, tabs] of perWindow) {
    // Chrome refuses to move a tab across the pinned boundary, so the pinned
    // block and the rest are each placed inside their own region.
    const pinned = tabs.filter((tab) => tab.pinned);
    const loose = tabs.filter((tab) => !tab.pinned);
    for (const [offset, chunk] of [[0, pinned], [pinned.length, loose]]) {
      for (let i = 0; i < chunk.length; i += 1) {
        await chrome.tabs.move(chunk[i].id, { windowId, index: offset + i });
        moved += 1;
      }
    }
  }
  await refresh();
  return { moved, windows: perWindow.size, rule: useRule };
}

/** Preview (dryRun) or execute the cleanup for every duplicate group. */
export async function cleanDuplicates({ rule, dryRun }) {
  const current = await getSettings();
  const useRule = Object.values(KEEP_RULES).includes(rule) ? rule : current.duplicateRule;
  const state = getState();
  const plan = planCleanup(state.duplicateGroups, useRule, new Map(state.tabs.map((tab) => [tab.id, tab])));
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
}

/** Focus an already open dashboard tab, else open one. */
export async function openDashboard() {
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

/**
 * A new tab may be a copy of something already open. Rebuild first so the
 * decision is made on fresh state, then auto-close only if the user opted in
 * (off by default - spec 27 says the extension reports, it does not act).
 */
export async function autoCloseNewDuplicates() {
  const settings = await getSettings();
  if (!settings.autoCloseDuplicates) return;
  await refresh();
  const state = getState();
  if (state.stats.duplicateTabs === 0) return;
  const tabsById = new Map(state.tabs.map((tab) => [tab.id, tab]));
  const ids = planCleanup(state.duplicateGroups, settings.duplicateRule, tabsById)
    .flatMap((entry) => entry.closeIds);
  if (ids.length > 0) await closeTabs(ids);
}
