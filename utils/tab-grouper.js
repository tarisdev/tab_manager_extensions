import { getCategoryLabel } from './tab-parser.js';
import { GROUP_MODES } from './constants.js';

/** Domain/Google grouping, biggest group first. */
export function groupByCategory(tabs, duplicateIds = new Set()) {
  const byCategory = new Map();
  for (const tab of tabs) {
    const bucket = byCategory.get(tab.category);
    if (bucket) bucket.push(tab);
    else byCategory.set(tab.category, [tab]);
  }

  return [...byCategory.entries()]
    .map(([key, group]) => ({
      // Prefixed so keys stay unique across grouping modes in the collapse set.
      key: `${GROUP_MODES.DOMAIN}:${key}`,
      label: getCategoryLabel(key),
      tabs: group,
      count: group.length,
      duplicateCount: group.filter((tab) => duplicateIds.has(tab.id)).length
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** One bucket per Chrome window, ordered by tab count. */
export function groupByWindow(tabs, duplicateIds = new Set()) {
  const byWindow = new Map();
  for (const tab of tabs) {
    const bucket = byWindow.get(tab.windowId);
    if (bucket) bucket.push(tab);
    else byWindow.set(tab.windowId, [tab]);
  }

  return [...byWindow.entries()]
    .map(([key, group]) => ({
      key: `${GROUP_MODES.WINDOW}:${key}`,
      label: group[0].windowLabel || `Window ${key}`,
      tabs: group,
      count: group.length,
      duplicateCount: group.filter((tab) => duplicateIds.has(tab.id)).length
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/**
 * One bucket per spreadsheet, each tab annotated with its sheet (gid).
 * Different sheets of the same file stay visible as separate rows.
 */
export function groupBySpreadsheet(tabs, duplicateIds = new Set()) {
  const sheets = tabs.filter((tab) => tab.isGoogleSheets);
  const byFile = new Map();

  for (const tab of sheets) {
    if (!byFile.has(tab.spreadsheetId)) {
      byFile.set(tab.spreadsheetId, {
        key: `${GROUP_MODES.SPREADSHEET}:${tab.spreadsheetId}`,
        label: tab.title,
        tabs: [],
        gids: new Set(),
        count: 0,
        sheetCount: 0,
        duplicateCount: 0
      });
    }
    const file = byFile.get(tab.spreadsheetId);
    file.tabs.push(tab);
    file.count += 1;
    file.gids.add(tab.gid);
    if (duplicateIds.has(tab.id)) file.duplicateCount += 1;
  }

  return [...byFile.values()]
    .map(({ gids, ...file }) => ({ ...file, sheetCount: gids.size }))
    .sort((a, b) => b.duplicateCount - a.duplicateCount || b.count - a.count);
}

/** Dispatch helper used by the dashboard when the grouping mode changes. */
export function groupTabs(tabs, mode, duplicateIds = new Set()) {
  if (mode === GROUP_MODES.WINDOW) return groupByWindow(tabs, duplicateIds);
  if (mode === GROUP_MODES.SPREADSHEET) return groupBySpreadsheet(tabs, duplicateIds);
  return groupByCategory(tabs, duplicateIds);
}
