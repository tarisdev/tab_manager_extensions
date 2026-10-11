/** Thin wrapper over chrome.runtime.sendMessage, used by the popup and dashboard. */
export async function send(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({ type, ...payload });
  } catch (error) {
    console.warn('[tab-manager] message failed', type, error);
    return { ok: false, error: 'Background unavailable' };
  }
}