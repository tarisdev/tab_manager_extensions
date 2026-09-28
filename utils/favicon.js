/**
 * Favicon helper for the extension pages. Uses the MV3 `_favicon` endpoint
 * (requires the "favicon" permission) and falls back to a neutral glyph.
 */

const UNKNOWN_FAVICON = 'data:image/svg+xml;charset=utf-8,'
  + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
    + '<rect width="16" height="16" rx="3" fill="#5f6368"/>'
    + '<path d="M4 11.5 8 4l4 7.5z" fill="#fff"/></svg>');

export function faviconUrl(url, size = 32) {
  if (!url || !/^https?:\/\//i.test(url)) return UNKNOWN_FAVICON;
  try {
    return chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=${size}`
    );
  } catch {
    return UNKNOWN_FAVICON;
  }
}

export { UNKNOWN_FAVICON };
