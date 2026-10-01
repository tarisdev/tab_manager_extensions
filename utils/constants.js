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
  SORT_TABS: 'SORT_TABS',
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

/** How the dashboard groups the tab list. */
export const GROUP_MODES = {
  DOMAIN: 'domain',
  WINDOW: 'window',
  SPREADSHEET: 'spreadsheet'
};

/** Order the tabs end up in, both in the dashboard preview and in the real tab strip. */
export const SORT_MODES = {
  GROUP: 'group',
  TITLE: 'title',
  DOMAIN: 'domain',
  RECENT: 'recent'
};

/** UI language: 'auto' follows the browser, the rest are forced (see i18n.js). */
export const LOCALES = ['auto', 'en', 'vi'];

/** Only settings are persisted; tab state is always read live from chrome.tabs. */
export const DEFAULT_SETTINGS = {
  duplicateRule: KEEP_RULES.ACTIVE,
  groupBy: GROUP_MODES.DOMAIN,
  sortBy: SORT_MODES.GROUP,
  showClosedTabs: false,
  warningEnabled: true,
  theme: 'system',
  locale: 'auto',
  autoCloseDuplicates: false,
  // One flag for Sheets/Docs/Slides: compare the file, not the sheet/page/slide.
  ignoreGoogleTabId: false
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
