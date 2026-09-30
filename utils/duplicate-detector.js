import { KEEP_RULES } from './constants.js';

/**
 * Group tabs that point at the same content.
 * A group is only a duplicate group when it holds 2+ tabs.
 * @param {Array} tabs parsed tabs (see tab-parser.parseTab)
 * @returns {Array<{key,tabIds,title,domain,category,count,isGoogleSheets,spreadsheetId,gid}>}
 */
export function findDuplicateGroups(tabs) {
  const byKey = new Map();
  for (const tab of tabs) {
    if (!tab.duplicateKey) continue;
    const bucket = byKey.get(tab.duplicateKey);
    if (bucket) bucket.push(tab);
    else byKey.set(tab.duplicateKey, [tab]);
  }

  const groups = [];
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    const first = group[0];
    groups.push({
      key,
      tabIds: group.map((tab) => tab.id),
      count: group.length,
      title: (group.find((tab) => tab.title) || first).title,
      domain: first.domain,
      category: first.category,
      isGoogleSheets: first.isGoogleSheets,
      spreadsheetId: first.spreadsheetId,
      // With ignoreSheetsGid a group can span several sheets, so there is no
      // single gid to name.
      gid: new Set(group.map((tab) => tab.gid)).size === 1 ? first.gid : null
    });
  }
  return groups;
}

/** Number of tabs that could be closed: every extra copy in every group. */
export function countDuplicates(groups) {
  return groups.reduce((total, group) => total + group.count - 1, 0);
}

/** Ids of every tab taking part in a duplicate group. */
export function duplicateTabIds(groups) {
  return new Set(groups.flatMap((group) => group.tabIds));
}

/**
 * Pick the tab of a group that must survive cleanup.
 * @returns the keeper tab, or null for MANUAL (caller decides) / empty group.
 */
export function pickKeeper(group, rule, tabsById) {
  const tabs = group.tabIds.map((id) => tabsById.get(id)).filter(Boolean);
  if (tabs.length === 0) return null;

  switch (rule) {
    case KEEP_RULES.NEWEST:
      // chrome.tabs ids grow monotonically within a browser session, which is
      // the closest thing to a creation timestamp the API exposes.
      return tabs.reduce((a, b) => (b.id > a.id ? b : a));
    case KEEP_RULES.OLDEST:
      return tabs.reduce((a, b) => (b.id < a.id ? b : a));
    case KEEP_RULES.MANUAL:
      return null;
    case KEEP_RULES.ACTIVE:
    default:
      return tabs.find((tab) => tab.active) || tabs[0];
  }
}

/** Tabs to close for every duplicate group, given the keep rule. */
export function planCleanup(groups, rule, tabsById) {
  const plan = [];
  for (const group of groups) {
    const keeper = pickKeeper(group, rule, tabsById);
    if (!keeper) continue;
    const closeIds = group.tabIds.filter((id) => id !== keeper.id);
    if (closeIds.length > 0) {
      plan.push({ group, keepId: keeper.id, keepTitle: keeper.title, closeIds });
    }
  }
  return plan;
}
