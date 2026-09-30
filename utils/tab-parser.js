/**
 * Pure URL/tab parsing. Deliberately free of chrome.* so it can be unit tested
 * in Node (see tests/run.mjs).
 */

/**
 * Query params that never change which document is displayed. Stripping them
 * is what lets `?usp=sharing` and `#gid=0` style variants collapse into the
 * same duplicate key.
 */
const NOISE_PARAM = /^(utm_|fbclid$|gbraid$|wbraid$|mc_|ref$|referrer$|usp$|s$|ved$|authuser$)/i;

const SHEETS_ID_PATH = /^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/;

/** Every Docs-hosted file, whatever its sub-page: Sheets, Docs and Slides. */
const GOOGLE_FILE_PATH = /^\/(?:spreadsheets|document|presentation)\/d\/([A-Za-z0-9_-]+)/;

/** Google defaults to the first sheet (gid=0) when the URL carries no gid. */
export const DEFAULT_GID = '0';

/** Internal pages (new tab, settings, our own dashboard) are never duplicates. */
export function isEligibleUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

export function getDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function isGoogleSheetsUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'docs.google.com' && SHEETS_ID_PATH.test(u.pathname);
  } catch {
    return false;
  }
}

export function extractSpreadsheetId(url) {
  try {
    const match = SHEETS_ID_PATH.exec(new URL(url).pathname);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** File id of a Sheets/Docs/Slides URL, or null for anything else. */
export function extractGoogleFileId(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== 'docs.google.com') return null;
    const match = GOOGLE_FILE_PATH.exec(u.pathname);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** gid may sit in the fragment (`#gid=123`) or in the query string (`?gid=123`). */
export function extractGid(url) {
  try {
    const u = new URL(url);
    const raw = new URLSearchParams(u.hash.replace(/^#/, '')).get('gid')
      ?? u.searchParams.get('gid');
    return raw && /^\d+$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** `{ spreadsheetId, gid }` for a Sheets URL, otherwise null. */
export function getGoogleSheetsInfo(url) {
  if (!isGoogleSheetsUrl(url)) return null;
  return {
    spreadsheetId: extractSpreadsheetId(url),
    gid: extractGid(url) ?? DEFAULT_GID
  };
}

/**
 * Canonical form of a normal (non-Sheets) URL: lowercase host without `www.`,
 * no fragment, no tracking params, sorted query, no trailing slash.
 */
export function normalizeUrl(url) {
  const u = new URL(url);
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (NOISE_PARAM.test(key)) u.searchParams.delete(key);
  }
  u.searchParams.sort();
  if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
    u.pathname = u.pathname.slice(0, -1);
  }
  return u.toString();
}

/**
 * Identity of the *content* a tab shows.
 * Google Sheets: spreadsheetId + gid, so different tabs of one file are NOT
 * duplicates. Everything else: the normalized URL.
 * With `ignoreGoogleTabId` on, every Docs-hosted file (Sheets, Docs, Slides)
 * is compared by file id alone: the sheet, page or slide a tab is parked on
 * stops separating them.
 */
export function getDuplicateKey(url, settings = {}) {
  if (!isEligibleUrl(url)) return null;
  if (settings.ignoreGoogleTabId) {
    const fileId = extractGoogleFileId(url);
    if (fileId) return `gfile::${fileId}`;
  }
  const sheets = getGoogleSheetsInfo(url);
  if (sheets) return `sheets::${sheets.spreadsheetId}::${sheets.gid}`;
  return `url::${normalizeUrl(url)}`;
}

/** Grouping bucket: known Google surfaces, otherwise the domain, else "other". */
export function getCategory(url) {
  if (isGoogleSheetsUrl(url)) return 'sheets';
  const domain = getDomain(url);
  if (domain === 'docs.google.com') return 'docs';
  if (domain === 'drive.google.com') return 'drive';
  if (domain === 'mail.google.com') return 'gmail';
  return domain || 'other';
}

/** Attach everything the UI needs to a raw `chrome.tabs.Tab`. */
export function parseTab(tab, settings = {}) {
  const url = tab.url || '';
  const sheets = getGoogleSheetsInfo(url);
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title || '',
    url,
    favIconUrl: tab.favIconUrl || '',
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    discarded: Boolean(tab.discarded),
    domain: getDomain(url),
    category: getCategory(url),
    isGoogleSheets: Boolean(sheets),
    spreadsheetId: sheets ? sheets.spreadsheetId : null,
    gid: sheets ? sheets.gid : null,
    duplicateKey: getDuplicateKey(url, settings),
    // Lower-cased haystack for search: title + url (which contains domain,
    // spreadsheet id and gid).
    searchable: `${tab.title || ''} ${url}`.toLowerCase()
  };
}
