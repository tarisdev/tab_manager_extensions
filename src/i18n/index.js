/**
 * Minimal i18n: two dictionaries, a lookup and a DOM pass. No dependency, no
 * build step, no chrome.* at import time (detectLocale() touches it lazily).
 */
import { en } from './locales/en.js';
import { vi } from './locales/vi.js';

const LOCALES = ['en', 'vi'];

/** Sites that get a friendly group label instead of a bare domain. */
const CATEGORIES = ['sheets', 'docs', 'drive', 'gmail', 'other'];

const DICT = { en, vi };

let current = 'en';

/** Force a locale. Unknown values fall back to English. */
function setLocale(locale) {
  current = LOCALES.includes(locale) ? locale : 'en';
  return current;
}

/** Chrome UI language ("vi-VN", "en-US", …) reduced to a supported locale. */
function detectLocale() {
  try {
    return chrome.i18n.getUILanguage().slice(0, 2).toLowerCase();
  } catch {
    return 'en';
  }
}

/**
 * Point the UI at a language. `pref` is the stored setting: 'auto' follows the
 * browser, anything else is forced.
 */
export function resolveLocale(pref) {
  return setLocale(pref && pref !== 'auto' ? pref : detectLocale());
}

/** Look up `key`, interpolating `{name}` placeholders. Falls back: vi → en → key. */
export function t(key, params) {
  const template = DICT[current][key] ?? DICT.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
}

/** Group label: a known Google surface, or the raw domain for any other site. */
export function categoryLabel(category) {
  return CATEGORIES.includes(category) ? t(`category.${category}`) : category;
}

/**
 * Repaint the static markup: `data-i18n` sets text, `data-i18n-attr` sets
 * attributes ("title:refresh, aria-label:refresh"). The wording lives only in
 * the dictionaries, so it is never written twice.
 */
export function applyTranslations(root = document) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll('[data-i18n-attr]')) {
    for (const chunk of node.dataset.i18nAttr.split(/[|,;]/)) {
      const at = chunk.indexOf(':');
      if (at < 0) continue;
      node.setAttribute(chunk.slice(0, at).trim(), t(chunk.slice(at + 1).trim()));
    }
  }
  document.documentElement.lang = current;
}

