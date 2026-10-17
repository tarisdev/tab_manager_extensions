import { t } from '@/i18n/index.js';

/** Every window a tab can be moved to, labelled the way the worker labels it. */
export function windowOptions(tabs, currentWindowId = null) {
  const ids = [...new Set(tabs.map((tab) => tab.windowId))];
  return ids
    .filter((id) => id !== currentWindowId)
    .map((id) => {
      const tab = tabs.find((item) => item.windowId === id);
      return { id, label: tab?.windowLabel || t('windowLabel', { n: id }) };
    });
}
