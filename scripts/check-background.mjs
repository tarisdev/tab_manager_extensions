/**
 * Runtime check for the service worker, run by `npm run check:worker` (which
 * builds first). It stubs the chrome APIs the worker touches, imports the built
 * dist/background/background.js and drives it through the message router, so a
 * broken event/listener wiring fails here instead of inside the browser.
 * plain node:assert, no test framework - same style as check-i18n.mjs.
 */
import assert from 'node:assert/strict';

let nextId = 100;
let tabs = [];
let windows = [{ id: 1, focused: true }, { id: 2, focused: false }];
let stored = {};
const moveLog = [];
const messageListeners = [];
const eventListeners = new Map();

const event = (name) => ({
  addListener(fn) {
    if (!eventListeners.has(name)) eventListeners.set(name, []);
    eventListeners.get(name).push(fn);
  }
});

const reset = (list) => {
  tabs = list.map((tab, index) => ({ index, active: false, pinned: false, ...tab }));
};

globalThis.chrome = {
  tabs: {
    query: async ({ url } = {}) => (url ? tabs.filter((tab) => tab.url === url) : tabs.map((tab) => ({ ...tab }))),
    update: async (id) => tabs.find((tab) => tab.id === id),
    create: async ({ url }) => ({ id: nextId++, url }),
    remove: async (ids) => {
      const doomed = new Set([ids].flat());
      tabs = tabs.filter((tab) => !doomed.has(tab.id));
    },
    move: async (ids, { index }) => { moveLog.push({ ids: [ids].flat(), index }); },
    onCreated: event('tabs.onCreated'),
    onRemoved: event('tabs.onRemoved'),
    onUpdated: event('tabs.onUpdated'),
    onActivated: event('tabs.onActivated'),
    onMoved: event('tabs.onMoved'),
    onAttached: event('tabs.onAttached'),
    onDetached: event('tabs.onDetached')
  },
  windows: {
    getAll: async () => windows,
    update: async () => {},
    onCreated: event('windows.onCreated'),
    onRemoved: event('windows.onRemoved')
  },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  storage: {
    local: {
      get: async (key) => ({ [key]: stored[key] }),
      set: async (patch) => { stored = { ...stored, ...patch }; },
      remove: async (key) => { delete stored[key]; }
    }
  },
  i18n: { getUILanguage: () => 'en-US' },
  runtime: {
    id: 'self',
    getURL: (path) => `chrome-extension://self/${path}`,
    sendMessage: async () => {},
    onMessage: { addListener: (fn) => messageListeners.push(fn) },
    onInstalled: event('runtime.onInstalled'),
    onStartup: event('runtime.onStartup')
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

/** Deliver a message the way chrome does: first listener that returns true answers. */
function route(message) {
  return new Promise((resolve) => {
    for (const listener of messageListeners) {
      if (listener(message, { id: 'self' }, resolve) === true) return;
    }
    resolve(false);
  });
}

const trigger = (name) => {
  for (const fn of eventListeners.get(name) || []) fn();
};

// Import the built worker (run `npm run build` first - see check:worker).
await import(new URL('../dist/background/background.js', import.meta.url).href);
await tick();

// 1. Wiring: one router, all the events the worker depends on.
assert.equal(messageListeners.length, 1, 'exactly one message router must be registered');
for (const name of ['tabs.onCreated', 'tabs.onRemoved', 'tabs.onActivated', 'tabs.onMoved', 'windows.onRemoved', 'runtime.onInstalled']) {
  assert.ok((eventListeners.get(name) || []).length > 0, `${name} has no listener`);
}
assert.equal(await route({ type: 'NOT_A_MESSAGE' }), false, 'unknown message types are not handled');
assert.equal(await route(null), false, 'malformed messages are not handled');

// 2. GET_STATE: parsed tabs, duplicate report and translated window labels.
reset([
  { id: 1, windowId: 1, url: 'https://example.com/a', title: 'A', active: true },
  { id: 2, windowId: 1, url: 'https://example.com/a/', title: 'A copy' },
  { id: 3, windowId: 2, url: 'https://other.test/b', title: 'B', active: true }
]);
const state = await route({ type: 'GET_STATE' });
assert.equal(state.ok, true, 'GET_STATE must answer ok');
assert.deepEqual(state.state.stats, { totalTabs: 3, totalWindows: 2, duplicateTabs: 1, sheetsTabs: 0 });
assert.deepEqual(state.state.duplicateTabIds, [1, 2]);
assert.equal(state.state.tabs[0].windowLabel, 'Window 1');
assert.equal(state.settings.locale, 'auto', 'defaults come from storage');

// 3. CLOSE_TABS: never close the last tab of a window.
const closed = await route({ type: 'CLOSE_TABS', tabIds: [1, 2] });
assert.deepEqual(closed, { ok: true, closed: 1, skipped: 1 });
assert.deepEqual(tabs.map((tab) => tab.id), [2, 3]);
assert.deepEqual(await route({ type: 'CLOSE_TABS', tabIds: [999] }), { ok: true, closed: 0, skipped: 1 });
assert.deepEqual(await route({ type: 'CLOSE_TABS', tabIds: 'nope' }), { ok: true, closed: 0, skipped: 0 });

// 4. MOVE_TABS forwards to chrome.tabs.move, ACTIVATE_TAB focuses the window.
moveLog.length = 0;
assert.deepEqual(await route({ type: 'MOVE_TABS', tabIds: [3], windowId: 1 }), { ok: true });
assert.deepEqual(moveLog, [{ ids: [3], index: -1 }]);
assert.equal((await route({ type: 'ACTIVATE_TAB', tabId: 3, windowId: 2 })).ok, true);

// 5. SET_SETTINGS sanitizes, persists and rebuilds the state.
const saved = await route({ type: 'SET_SETTINGS', patch: { theme: 'neon', duplicateRule: 'keep-newest' } });
assert.equal(saved.settings.theme, 'system', 'an unknown enum value must be dropped');
assert.equal(saved.settings.duplicateRule, 'keep-newest');
assert.equal(stored.settings.duplicateRule, 'keep-newest', 'settings must be persisted');
assert.equal((await route({ type: 'RESET_SETTINGS' })).settings.duplicateRule, 'keep-active');

// 6. CLEAN_DUPLICATES: dry run reports the plan, the real run closes the copies.
reset([
  { id: 1, windowId: 1, url: 'https://example.com/a', title: 'A', active: true },
  { id: 2, windowId: 1, url: 'https://example.com/a', title: 'A copy' }
]);
await route({ type: 'GET_STATE' });
const preview = await route({ type: 'CLEAN_DUPLICATES', dryRun: true, rule: 'keep-active' });
assert.deepEqual({ total: preview.total, keepId: preview.plan[0].keepId }, { total: 1, keepId: 1 });
assert.deepEqual(
  await route({ type: 'CLEAN_DUPLICATES', dryRun: false, rule: 'keep-active' }),
  { ok: true, closed: 1, skipped: 0, rule: 'keep-active' }
);
assert.deepEqual(tabs.map((tab) => tab.id), [1]);

// 7. Auto-close only when the user opted in.
reset([
  { id: 1, windowId: 1, url: 'https://example.com/a', title: 'A', active: true },
  { id: 2, windowId: 1, url: 'https://example.com/a', title: 'A copy' },
  { id: 3, windowId: 2, url: 'https://other.test/b', title: 'B', active: true }
]);
trigger('tabs.onCreated');
await tick();
assert.deepEqual(tabs.map((tab) => tab.id), [1, 2, 3], 'auto-close is off by default');
await route({ type: 'SET_SETTINGS', patch: { autoCloseDuplicates: true } });
trigger('tabs.onCreated');
await tick();
assert.deepEqual(tabs.map((tab) => tab.id), [1, 3], 'with auto-close on, the extra copy goes');

console.log('worker ok: router, state, close guard, move, settings and auto-close all wired');
