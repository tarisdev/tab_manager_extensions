import { MSG } from '@/constants/index.js';
import { getSettings, setSettings, resetSettings } from '@/services/storage.js';
import { getState, refresh, scheduleRefresh } from '@/background/state.js';
import {
  activateTab, autoCloseNewDuplicates, cleanDuplicates, closeOtherTabs, closeTabs,
  moveTabs, openDashboard, sortTabs
} from '@/background/tabs.js';

/**
 * Service worker entry point: wires the chrome events and routes every message
 * to the module that owns the operation. The tab state cache lives in state.js,
 * the chrome.tabs/windows calls in tabs.js.
 */
const HANDLERS = {
  async [MSG.GET_STATE]() {
    await refresh();
    return { state: getState(), settings: await getSettings() };
  },

  [MSG.ACTIVATE_TAB]: activateTab,
  [MSG.MOVE_TABS]: moveTabs,
  [MSG.SORT_TABS]: sortTabs,
  [MSG.CLEAN_DUPLICATES]: cleanDuplicates,
  [MSG.CLOSE_OTHER_TABS]: closeOtherTabs,
  [MSG.OPEN_DASHBOARD]: openDashboard,

  async [MSG.CLOSE_TABS]({ tabIds }) {
    return closeTabs(tabIds);
  },

  async [MSG.SET_SETTINGS]({ patch }) {
    const settings = await setSettings(patch);
    // The window labels inside the state are translated, so switching language
    // means the cached state has to be rebuilt and pushed again.
    await refresh();
    return { settings };
  },

  async [MSG.RESET_SETTINGS]() {
    const settings = await resetSettings();
    await refresh();
    return { settings };
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Chrome lets every other extension connect while `externally_connectable` is
  // absent, so reject any sender that is not this extension's own page.
  if (sender?.id && sender.id !== chrome.runtime.id) return false;
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

// Any tab/window change invalidates the cached state; coalesced, never polled.
for (const event of ['onRemoved', 'onUpdated', 'onActivated', 'onMoved', 'onAttached', 'onDetached']) {
  chrome.tabs[event].addListener(scheduleRefresh);
}
chrome.windows.onCreated.addListener(scheduleRefresh);
chrome.windows.onRemoved.addListener(scheduleRefresh);

chrome.tabs.onCreated.addListener(() => {
  scheduleRefresh();
  autoCloseNewDuplicates().catch((error) => console.warn('[tab-manager] auto-close failed', error));
});

chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);

// Warm up so the badge is correct before any UI opens.
refresh();
