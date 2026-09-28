/**
 * Self-check for the pure logic. No framework, no dependencies:
 *   node tests/run.mjs
 * The background worker cannot run in Node, so this covers the parsing and
 * duplicate-detection rules that everything else depends on.
 */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { getDuplicateKey, extractGid, extractSpreadsheetId, getCategory, parseTab } from '../utils/tab-parser.js';
import { findDuplicateGroups, countDuplicates, planCleanup, pickKeeper } from '../utils/duplicate-detector.js';
import { groupByCategory, groupBySpreadsheet, groupByWindow } from '../utils/tab-grouper.js';
import { KEEP_RULES } from '../utils/constants.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => readFile(path.join(root, file), 'utf8');
let passed = 0;
let failed = 0;

/** Accepts sync or async bodies; a thrown error or rejection fails the check. */
async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}\n      ${error.message}`);
    process.exitCode = 1;
  }
}

const SHEET = (id, gid, extra = '') =>
  `https://docs.google.com/spreadsheets/d/${id}/edit${extra}${gid === null ? '' : `#gid=${gid}`}`;

/** Minimal chrome.tabs.Tab shape for the parser. */
const tab = (id, url, extra = {}) => ({ id, windowId: 1, index: id, title: '', url, ...extra });

console.log('Google Sheets identity (spec 8-10)');

test('same spreadsheet + same gid is a duplicate', () => {
  assert.equal(
    getDuplicateKey(SHEET('1ABC123', '123')),
    getDuplicateKey(SHEET('1ABC123', '123', '?usp=sharing'))
  );
});

test('different gid is NOT a duplicate', () => {
  assert.notEqual(getDuplicateKey(SHEET('1ABC123', '123')), getDuplicateKey(SHEET('1ABC123', '456')));
});

test('missing gid falls back to gid 0', () => {
  assert.equal(extractGid(SHEET('1ABC', null)), null);
  assert.equal(getDuplicateKey(SHEET('1ABC', null)), getDuplicateKey(SHEET('1ABC', 0)));
});

test('gid in the query string is read too', () => {
  assert.equal(extractGid('https://docs.google.com/spreadsheets/d/X/edit?gid=77#range=A1'), '77');
});

test('spreadsheet id is extracted from the path', () => {
  assert.equal(extractSpreadsheetId(SHEET('1ABC123', '1')), '1ABC123');
});

test('duplicate key is spreadsheetId::gid', () => {
  assert.equal(getDuplicateKey(SHEET('1ABC123', '123')), 'sheets::1ABC123::123');
});

test('google docs is not treated as sheets', () => {
  const url = 'https://docs.google.com/document/d/1XYZ/edit';
  assert.equal(getCategory(url), 'docs');
  assert.equal(getDuplicateKey(url), `url::${new URL(url).toString()}`);
});

console.log('\nURL normalization');

test('tracking params and fragment are ignored', () => {
  assert.equal(
    getDuplicateKey('https://example.com/a?utm_source=x'),
    getDuplicateKey('https://example.com/a#top')
  );
});

test('www prefix and trailing slash collapse', () => {
  assert.equal(
    getDuplicateKey('https://www.example.com/a/'),
    getDuplicateKey('https://example.com/a')
  );
});

test('different paths stay different', () => {
  assert.notEqual(getDuplicateKey('https://example.com/a'), getDuplicateKey('https://example.com/b'));
});

test('internal pages are never duplicates', () => {
  assert.equal(getDuplicateKey('chrome://extensions'), null);
  assert.equal(getDuplicateKey('about:blank'), null);
  assert.equal(getDuplicateKey(''), null);
});

console.log('\nDuplicate detection');

test('3 identical sheets -> 2 duplicates', () => {
  const tabs = [
    tab(1, SHEET('A', '1')),
    tab(2, SHEET('A', '1')),
    tab(3, SHEET('A', '1')),
    tab(4, SHEET('B', '9'))
  ].map(parseTab);
  const groups = findDuplicateGroups(tabs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 3);
  assert.equal(countDuplicates(groups), 2);
});

test('one file with 3 different sheets is not a duplicate', () => {
  const tabs = [tab(1, SHEET('A', '1')), tab(2, SHEET('A', '2')), tab(3, SHEET('A', '3'))].map(parseTab);
  assert.equal(findDuplicateGroups(tabs).length, 0);
});

test('keep-active keeps the active tab', () => {
  const tabs = [
    tab(1, SHEET('A', '1')),
    tab(2, SHEET('A', '1'), { active: true })
  ].map(parseTab);
  const group = findDuplicateGroups(tabs)[0];
  const keeper = pickKeeper(group, KEEP_RULES.ACTIVE, new Map(tabs.map((t) => [t.id, t])));
  assert.equal(keeper.id, 2);
});

test('keep-newest keeps the highest tab id, keep-oldest the lowest', () => {
  const tabs = [tab(5, SHEET('A', '1')), tab(9, SHEET('A', '1')), tab(7, SHEET('A', '1'))].map(parseTab);
  const group = findDuplicateGroups(tabs)[0];
  const byId = new Map(tabs.map((t) => [t.id, t]));
  assert.equal(pickKeeper(group, KEEP_RULES.NEWEST, byId).id, 9);
  assert.equal(pickKeeper(group, KEEP_RULES.OLDEST, byId).id, 5);
});

test('manual rule closes nothing until the user picks a keeper', () => {
  const tabs = [tab(1, SHEET('A', '1')), tab(2, SHEET('A', '1'))].map(parseTab);
  const group = findDuplicateGroups(tabs)[0];
  const plan = planCleanup([group], KEEP_RULES.MANUAL, new Map(tabs.map((t) => [t.id, t])));
  assert.equal(plan.length, 0);
});

test('cleanup plan closes every extra copy', () => {
  const tabs = [
    tab(1, SHEET('A', '1')),
    tab(2, SHEET('A', '1')),
    tab(3, SHEET('A', '1'), { active: true }),
    tab(4, SHEET('B', '5')),
    tab(5, SHEET('B', '5'))
  ].map(parseTab);
  const byId = new Map(tabs.map((t) => [t.id, t]));
  const plan = planCleanup(findDuplicateGroups(tabs), KEEP_RULES.ACTIVE, byId);
  // Group A keeps the active tab 3. Group B has no active tab, so the first
  // one listed is kept - the rule never closes the tab it would fall back to.
  assert.deepEqual(plan.flatMap((entry) => entry.closeIds).sort(), [1, 2, 5]);
  assert.equal(plan.find((p) => p.group.spreadsheetId === 'A').keepId, 3);
  assert.equal(plan.find((p) => p.group.spreadsheetId === 'B').keepId, 4);
});

console.log('\nGrouping');

test('groups split Google Sheets out of the domain buckets', () => {
  const tabs = [
    tab(1, SHEET('A', '1')),
    tab(2, 'https://shopee.vn/x'),
    tab(3, 'https://shopee.vn/y')
  ].map(parseTab);
  const groups = groupByCategory(tabs);
  assert.equal(groups[0].key, 'domain:shopee.vn');
  assert.equal(groups[0].count, 2);
  assert.ok(groups.some((g) => g.key === 'domain:sheets' && g.count === 1));
});

test('group keys do not collide across modes', () => {
  const tabs = [{ ...parseTab(tab(1, SHEET('1', '1'))), windowLabel: 'Window 1' }];
  const keys = [
    groupByCategory(tabs)[0].key,
    groupByWindow(tabs)[0].key,
    groupBySpreadsheet(tabs)[0].key
  ];
  assert.equal(new Set(keys).size, 3);
});

test('spreadsheet grouping counts distinct sheets', () => {
  const tabs = [tab(1, SHEET('A', '1')), tab(2, SHEET('A', '2')), tab(3, SHEET('B', '1'))].map(parseTab);
  const fileA = groupBySpreadsheet(tabs).find((f) => f.key.endsWith('A'));
  assert.equal(fileA.sheetCount, 2);
  assert.equal(fileA.count, 2);
});

console.log('\nPackaging (spec 36 / 37)');

const FORBIDDEN = /eval\s*\(|new\s+Function\s*\(|innerHTML|\son[a-z]+\s*=\s*["']/;

await test('no eval, new Function, innerHTML or inline handlers', async () => {
  for (const dir of ['utils', 'background', 'popup', 'dashboard']) {
    for (const file of await readdir(path.join(root, dir))) {
      if (!file.endsWith('.js')) continue;
      const source = await read(`${dir}/${file}`);
      assert.equal(FORBIDDEN.test(source), false, `${dir}/${file} matches ${FORBIDDEN}`);
    }
  }
});

await test('html has no inline <script> and no on* attributes', async () => {
  for (const file of ['popup/popup.html', 'dashboard/dashboard.html']) {
    const html = await read(file);
    assert.equal(/<script(?![^>]*\ssrc=)/.test(html), false, `${file} has an inline script`);
    assert.equal(FORBIDDEN.test(html), false, `${file} has an inline handler`);
  }
});

await test('manifest is MV3 and every referenced file exists', async () => {
  const manifest = JSON.parse(await read('manifest.json'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.type, 'module');
  const referenced = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...Object.values(manifest.icons),
    'utils/constants.js', 'utils/tab-parser.js', 'utils/duplicate-detector.js',
    'utils/tab-grouper.js', 'utils/storage.js', 'utils/favicon.js',
    'popup/popup.js', 'popup/popup.css', 'dashboard/dashboard.js', 'dashboard/dashboard.css'
  ];
  for (const file of referenced) {
    assert.equal(existsSync(path.join(root, file)), true, `missing ${file}`);
  }
});

await test('every relative import resolves to a real file', async () => {
  for (const file of ['background/background.js', 'popup/popup.js', 'dashboard/dashboard.js']) {
    const source = await read(file);
    for (const match of source.matchAll(/from\s+'(\.[^']+)'/g)) {
      const target = path.resolve(path.dirname(path.join(root, file)), match[1]);
      assert.equal(existsSync(target), true, `${file} imports missing ${match[1]}`);
    }
  }
});

await test('every getElementById target exists in the HTML', async () => {
  for (const dir of ['popup', 'dashboard']) {
    const source = await read(`${dir}/${dir}.js`);
    const markup = await read(`${dir}/${dir}.html`);
    for (const match of source.matchAll(/el\('([^']+)'\)/g)) {
      assert.equal(markup.includes(`id="${match[1]}"`), true, `${dir}: #${match[1]} missing from HTML`);
    }
  }
});

console.log(`\n${passed} checks passed, ${failed} failed`);
