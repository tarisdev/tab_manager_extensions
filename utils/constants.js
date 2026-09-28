/**
 * Shared constants. No chrome.* usage so this module is Node-testable.
 */

/** Message types exchanged between UI (popup/dashboard) and the service worker. */
export const MSG = {
  GET_STATE: 'GET_STATE',
  ACTIVATE_TAB: 'ACTIVATE_TAB',
  CLOSE_TABS: 'CLOSE_TABS',
  CLOSE_OTHER_TABS: 'CLOSE_OTHER_TABS',
  MOVE_TABS: 'MOVE_TABS',
  CLEAN_DUPLICATES: 'CLEAN_DUPLICATES',
  GET_SETTINGS: 'GET_SETTINGS',
  SET_SETTINGS: 'SET_SETTINGS',
  RESET_SETTINGS: 'RESET_SETTINGS',
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',
  STATE_CHANGED: 'STATE_CHANGED'
};

/** Which duplicate of a group survives a cleanup. */
export const KEEP_RULES = {
  ACTIVE: 'keep-active',
  NEWEST: 'keep-newest',
  OLDEST: 'keep-oldest',
  MANUAL: 'manual'
};

export const KEEP_RULE_LABELS = {
  [KEEP_RULES.ACTIVE]: 'Keep Active',
  [KEEP_RULES.NEWEST]: 'Keep Newest',
  [KEEP_RULES.OLDEST]: 'Keep Oldest',
  [KEEP_RULES.MANUAL]: 'Manual'
};

/** How the dashboard groups the tab list. */
export const GROUP_MODES = {
  DOMAIN: 'domain',
  WINDOW: 'window',
  SPREADSHEET: 'spreadsheet'
};

/** Only settings are persisted; tab state is always read live from chrome.tabs. */
export const DEFAULT_SETTINGS = {
  duplicateRule: KEEP_RULES.ACTIVE,
  groupBy: GROUP_MODES.DOMAIN,
  showClosedTabs: false,
  warningEnabled: true,
  theme: 'system',
  autoCloseDuplicates: false
};

/**
 * Tab events fire in bursts (a page load emits onUpdated several times).
 * Coalesce them into one recompute per window instead of polling.
 */
export const REFRESH_DEBOUNCE_MS = 200;

/** Filter chips rendered next to the search box. */
export const FILTER = {
  ALL: 'all',
  DUPLICATES: 'duplicates',
  ACTIVE: 'active'
};
