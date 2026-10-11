/**
 * i18n gate run by `npm run check` (plain node:assert, exits non-zero on the
 * first failure):
 *   1. en and vi define exactly the same keys
 *   2. the same {placeholders} appear in both languages
 *   3. every key used in src/ (t('key'), data-i18n, data-i18n-attr) exists in en
 *   4. runtime-built keys (category.*) and the lookup fallbacks still work
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from '../src/i18n/locales/en.js';
import { vi } from '../src/i18n/locales/vi.js';
import { categoryLabel, resolveLocale, t } from '../src/i18n/index.js';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const EXT = ['.js', '.jsx', '.html'];
const CATEGORIES = ['sheets', 'docs', 'drive', 'gmail', 'other'];

/** Every source file, skipping the i18n folder that defines the wording itself. */
function sourceFiles(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'i18n' ? [] : sourceFiles(path);
    return EXT.includes(extname(entry.name)) ? [path] : [];
  });
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

// 1. Same key set, so no locale can silently fall back to English.
assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort(), 'en and vi must share every key');

// 2. Same placeholders, so no message can render a literal "{count}".
for (const key of Object.keys(en)) {
  assert.equal(placeholders(vi[key]), placeholders(en[key]), `placeholder mismatch in "${key}"`);
}

// 3. Every key the UI asks for is a real key.
const sources = sourceFiles().map((path) => readFileSync(path, 'utf8')).join('\n');
const used = new Set(
  [
    ...sources.matchAll(/\bt\(\s*'([\w.]+)'/g),
    ...sources.matchAll(/data-i18n="([\w.]+)"/g),
    ...sources.matchAll(/data-i18n-attr="[^"]*:\s*([\w.]+)/g)
  ].map((match) => match[1])
);
assert.ok(used.size > 50, `expected to find the UI's keys in src/, found ${used.size}`);
assert.deepEqual([...used].filter((key) => !(key in en)), [], 'keys used in src/ that en is missing');

// 4. Keys assembled at runtime plus the documented fallbacks.
resolveLocale('en');
assert.equal(categoryLabel('sheets'), en['category.sheets'], 'categoryLabel must translate known categories');
assert.equal(categoryLabel('example.com'), 'example.com', 'categoryLabel must pass unknown categories through');
for (const category of CATEGORIES) {
  assert.ok(en[`category.${category}`], `missing category.${category}`);
}
assert.equal(resolveLocale('nope'), 'en', 'an unsupported locale must fall back to English');
assert.equal(t('__missing__'), '__missing__', 'a missing key must render as the key itself');
assert.equal(t('bulk.selected', { count: 5 }), en['bulk.selected'].replace('{count}', '5'), 'placeholders must interpolate');

console.log(`i18n ok: ${Object.keys(en).length} keys in en + vi, placeholders, source usage (${used.size} keys), runtime keys and fallbacks intact`);
