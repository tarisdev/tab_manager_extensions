import { DEFAULT_SETTINGS, KEEP_RULES, GROUP_MODES } from './constants.js';

const STORAGE_KEY = 'settings';

const ALLOWED = {
  duplicateRule: Object.values(KEEP_RULES),
  groupBy: Object.values(GROUP_MODES),
  theme: ['system', 'dark', 'light']
};

/** Only booleans and the enum values above are accepted; anything else is dropped. */
function sanitize(stored) {
  const settings = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== 'object') return settings;
  for (const [key, value] of Object.entries(stored)) {
    if (ALLOWED[key]) {
      if (ALLOWED[key].includes(value)) settings[key] = value;
    } else if (typeof DEFAULT_SETTINGS[key] === 'boolean' && typeof value === 'boolean') {
      settings[key] = value;
    }
  }
  return settings;
}

export async function getSettings() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return sanitize(stored[STORAGE_KEY]);
  } catch (error) {
    console.warn('[tab-manager] cannot read settings', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setSettings(patch) {
  const next = sanitize({ ...(await getSettings()), ...patch });
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  } catch (error) {
    console.warn('[tab-manager] cannot save settings', error);
  }
  return next;
}

export async function resetSettings() {
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch (error) {
    console.warn('[tab-manager] cannot reset settings', error);
  }
  return { ...DEFAULT_SETTINGS };
}
