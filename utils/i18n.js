/**
 * Minimal i18n: two dictionaries, a lookup and a DOM pass. No dependency, no
 * build step, no chrome.* at import time (detectLocale() touches it lazily), so
 * tests/run.mjs can exercise the Vietnamese strings in Node.
 */
export const LOCALES = ['en', 'vi'];

/** Sites that get a friendly group label instead of a bare domain. */
const CATEGORIES = ['sheets', 'docs', 'drive', 'gmail', 'other'];

/** English strings: the source of truth every other locale falls back to. */
const en = {
  themeToggle: 'Toggle theme',
  refresh: 'Refresh',
  settings: 'Settings',
  help: 'Usage guide',
  searchPlaceholder: 'Search tabs…',
  searchTabs: 'Search tabs',
  cleanDuplicates: 'Clean Duplicates',
  closeAllDuplicates: 'Close All Duplicate Tabs',
  openDashboard: 'Open Dashboard',
  collapseAll: 'Collapse all',

  'stat.tabs': 'Tabs',
  'stat.windows': 'Windows',
  'stat.dup': 'Dup',
  'stat.sheets': 'Sheets',
  'stat.totalTabs': 'Total Tabs',
  'stat.duplicateTabs': 'Duplicate Tabs',
  'stat.googleSheets': 'Google Sheets',

  'filter.all': 'All',
  'filter.duplicates': 'Duplicates',
  'filter.active': 'Active',
  'filter.label': 'Filter tabs',

  'groupBy': 'Group by',
  'groupBy.domain': 'Domain',
  'groupBy.window': 'Window',
  'groupBy.spreadsheet': 'Google Sheets file',

  sortBy: 'Sort by',
  'sort.group': 'Group',
  'sort.title': 'Title (A-Z)',
  'sort.domain': 'Domain',
  'sort.recent': 'Newest first',

  'category.sheets': 'Google Sheets',
  'category.docs': 'Google Docs',
  'category.drive': 'Google Drive',
  'category.gmail': 'Gmail',
  'category.other': 'Other',

  'bulk.selected': '{count} selected',
  'bulk.close': 'Close Selected',
  'bulk.move': 'Move Selected',
  'bulk.clear': 'Clear',
  moveToWindow: 'Move to window',

  tabCount: '{count} tabs',
  dupCount: '×{count} duplicate',
  sheetCount: '{count} sheets',
  activeTag: 'ACTIVE',
  sheetLabel: 'sheet {gid}',
  tabId: 'Tab {id}',
  windowLabel: 'Window {n}',
  selectTab: 'Select {title}',

  'action.open': 'Open',
  'action.close': 'Close',
  'action.activate': 'Activate',
  'action.active': 'Active',
  'action.switch': 'Switch',
  'action.more': 'More actions',
  'action.closeOthers': 'Close Other Tabs',
  'action.copyUrl': 'Copy URL',
  'action.copyTitleUrl': 'Copy Title + URL',
  'action.jumpFirstCopy': 'Jump to the first copy',
  'action.closeCopies': 'Close the other copies',
  'action.closeN': 'Close {count}',
  'action.confirm': 'Confirm',
  'action.cancel': 'Cancel',
  'action.sortTabs': 'Sort tabs',

  'status.urlCopied': 'URL copied',
  'status.titleUrlCopied': 'Title and URL copied',
  'status.sorted': 'Sorted {count} tabs in {windows} windows',
  'status.sortFailed': 'Sorting failed',
  'status.settingsSaved': 'Settings saved',
  'status.settingsReset': 'Settings reset',
  'status.moved': 'Moved {count} tab(s)',
  'status.tabsClosed': '{count} tab(s) closed',
  'status.dupesClosed': '{count} duplicate tab(s) closed',
  'status.sheetsClosed': 'Closed {count} duplicate tab(s).',
  'status.nothingClosed': 'Nothing closed.',
  'status.nothingToClose': 'Nothing to close.',
  'status.nothingToClean': 'Nothing to clean.',
  'status.noDupesToClose': 'No duplicate tabs to close.',
  'status.noDupesToClean': 'No duplicate tabs to clean.',
  'status.noDupes': 'No duplicates found.',
  'status.noResults': 'No tabs match your search.',
  'status.noTabs': 'No tabs to show.',
  'status.noSheets': 'No Google Sheets open.',
  'status.workerDown': 'Cannot reach the background worker.',
  'status.cleanupFailed': 'Cleanup failed',
  'status.moveFailed': 'Move failed',

  'confirm.clean': 'Close {count} duplicate tab(s)?',
  'confirm.cleanPlan': 'Found {count} duplicate tab(s).\n\n{plan}\n\nTotal tabs to close: {total}',
  'confirm.closeAll': 'Close ALL {count} duplicate tab(s)? One copy of each is kept.',
  'confirm.closeSelected': 'Close {count} tab(s)?',
  'confirm.planLine': '• {title} — {count} → keep 1',
  dupHeading: 'Duplicates ({count} closable)',

  'settings.title': 'Settings',
  'settings.duplicateHandling': 'Duplicate handling',
  'settings.keepActive': 'Keep Active tab',
  'settings.keepNewest': 'Keep Newest tab',
  'settings.keepOldest': 'Keep Oldest tab',
  'settings.theme': 'Theme',
  'settings.themeSystem': 'System',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.warning': 'Warn when a Google Sheet is already open',
  'settings.ignoreTabId': 'Detect duplicates per Google file, ignoring sheet / page / slide',
  'settings.autoclose': 'Automatically close duplicates',
  'settings.hint': 'Off by default - the extension only reports duplicates.',
  'settings.reset': 'Reset',
  'settings.save': 'Save',
  'settings.language': 'Language',
  'settings.langAuto': 'Auto (browser language)',
  'settings.langEn': 'English',
  'settings.langVi': 'Tiếng Việt',

  'help.title': 'Usage guide',
  'help.intro': 'Tab Manager watches every open tab, groups them and finds the duplicates - with first-class handling for Google Sheets.',
  'help.badge': 'The number on the toolbar icon is how many duplicate tabs you could close. Click it to open this popup.',
  'help.popup': 'Popup: stats at a glance, search, jump to the copy already open, or close the extras in one click.',
  'help.dashboard': 'Dashboard: the full list, filter chips, grouping and bulk close/move.',
  'help.groups': 'Group by domain, window or Google Sheets file. Click a group header to collapse it.',
  'help.clean': 'Clean Duplicates always shows the exact plan before closing anything.',
  'help.sheets': 'Sheets are compared by Spreadsheet ID + gid, so two different tabs of one file are not duplicates.',
  'help.settings': 'Settings holds the language (English / Tiếng Việt), the theme, which copy to keep and the badge warning.'
};

/** Vietnamese strings. Same keys as `en` - a missing key falls back to English. */
const vi = {
  themeToggle: 'Đổi giao diện sáng/tối',
  refresh: 'Làm mới',
  settings: 'Cài đặt',
  help: 'Hướng dẫn sử dụng',
  searchPlaceholder: 'Tìm kiếm tab…',
  searchTabs: 'Tìm kiếm tab',
  cleanDuplicates: 'Dọn tab trùng',
  closeAllDuplicates: 'Đóng tất cả tab trùng',
  openDashboard: 'Mở bảng điều khiển',
  collapseAll: 'Thu gọn tất cả',

  'stat.tabs': 'Tab',
  'stat.windows': 'Cửa sổ',
  'stat.dup': 'Trùng',
  'stat.sheets': 'Sheets',
  'stat.totalTabs': 'Tổng tab',
  'stat.duplicateTabs': 'Tab trùng',
  'stat.googleSheets': 'Google Sheets',

  'filter.all': 'Tất cả',
  'filter.duplicates': 'Trùng',
  'filter.active': 'Đang mở',
  'filter.label': 'Lọc tab',

  groupBy: 'Nhóm theo',
  'groupBy.domain': 'Tên miền',
  'groupBy.window': 'Cửa sổ',
  'groupBy.spreadsheet': 'Tệp Google Sheets',

  sortBy: 'Sắp xếp theo',
  'sort.group': 'Nhóm',
  'sort.title': 'Tên (A-Z)',
  'sort.domain': 'Tên miền',
  'sort.recent': 'Mới nhất trước',

  'category.sheets': 'Google Sheets',
  'category.docs': 'Google Docs',
  'category.drive': 'Google Drive',
  'category.gmail': 'Gmail',
  'category.other': 'Khác',

  'bulk.selected': 'Đã chọn {count}',
  'bulk.close': 'Đóng đã chọn',
  'bulk.move': 'Chuyển đã chọn',
  'bulk.clear': 'Bỏ chọn',
  moveToWindow: 'Chuyển sang cửa sổ',

  tabCount: '{count} tab',
  dupCount: '×{count} trùng',
  sheetCount: '{count} sheet',
  activeTag: 'ĐANG MỞ',
  sheetLabel: 'sheet {gid}',
  tabId: 'Tab {id}',
  windowLabel: 'Cửa sổ {n}',
  selectTab: 'Chọn {title}',

  'action.open': 'Mở',
  'action.close': 'Đóng',
  'action.activate': 'Chuyển tới',
  'action.active': 'Đang mở',
  'action.switch': 'Chuyển tới',
  'action.more': 'Thao tác khác',
  'action.closeOthers': 'Đóng các bản khác',
  'action.copyUrl': 'Sao chép URL',
  'action.copyTitleUrl': 'Sao chép tiêu đề + URL',
  'action.jumpFirstCopy': 'Nhảy tới bản đầu tiên',
  'action.closeCopies': 'Đóng các bản còn lại',
  'action.closeN': 'Đóng {count}',
  'action.confirm': 'Xác nhận',
  'action.cancel': 'Huỷ',
  'action.sortTabs': 'Sắp xếp tab',

  'status.urlCopied': 'Đã sao chép URL',
  'status.titleUrlCopied': 'Đã sao chép tiêu đề và URL',
  'status.settingsSaved': 'Đã lưu cài đặt',
  'status.settingsReset': 'Đã đặt lại cài đặt',
  'status.moved': 'Đã chuyển {count} tab',
  'status.sorted': 'Đã sắp xếp {count} tab trong {windows} cửa sổ',
  'status.sortFailed': 'Sắp xếp thất bại',
  'status.tabsClosed': 'Đã đóng {count} tab',
  'status.dupesClosed': 'Đã đóng {count} tab trùng',
  'status.sheetsClosed': 'Đã đóng {count} tab trùng.',
  'status.nothingClosed': 'Không có gì được đóng.',
  'status.nothingToClose': 'Không có gì để đóng.',
  'status.nothingToClean': 'Không có gì để dọn.',
  'status.noDupesToClose': 'Không có tab trùng nào để đóng.',
  'status.noDupesToClean': 'Không có tab trùng nào để dọn.',
  'status.noDupes': 'Không tìm thấy tab trùng.',
  'status.noResults': 'Không có tab nào khớp tìm kiếm.',
  'status.noTabs': 'Không có tab nào để hiển thị.',
  'status.noSheets': 'Không có Google Sheets nào đang mở.',
  'status.workerDown': 'Không kết nối được với service worker.',
  'status.cleanupFailed': 'Dọn tab trùng thất bại',
  'status.moveFailed': 'Chuyển tab thất bại',

  'confirm.clean': 'Đóng {count} tab trùng?',
  'confirm.cleanPlan': 'Tìm thấy {count} tab trùng.\n\n{plan}\n\nTổng số tab sẽ đóng: {total}',
  'confirm.closeAll': 'Đóng TẤT CẢ {count} tab trùng? Mỗi nhóm sẽ giữ lại 1 bản.',
  'confirm.closeSelected': 'Đóng {count} tab?',
  'confirm.planLine': '• {title} — {count} → giữ lại 1',
  dupHeading: 'Tab trùng ({count} có thể đóng)',

  'settings.title': 'Cài đặt',
  'settings.duplicateHandling': 'Xử lý tab trùng',
  'settings.keepActive': 'Giữ tab đang mở',
  'settings.keepNewest': 'Giữ tab mới nhất',
  'settings.keepOldest': 'Giữ tab cũ nhất',
  'settings.theme': 'Giao diện',
  'settings.themeSystem': 'Theo hệ thống',
  'settings.themeLight': 'Sáng',
  'settings.themeDark': 'Tối',
  'settings.warning': 'Cảnh báo khi Google Sheet đã được mở',
  'settings.ignoreTabId': 'Phát hiện trùng theo tệp Google, không tính trang tính / trang / slide',
  'settings.autoclose': 'Tự động đóng tab trùng',
  'settings.hint': 'Mặc định tắt - tiện ích chỉ thông báo, không tự hành động.',
  'settings.reset': 'Đặt lại',
  'settings.save': 'Lưu',
  'settings.language': 'Ngôn ngữ',
  'settings.langAuto': 'Tự động (theo trình duyệt)',
  'settings.langEn': 'English',
  'settings.langVi': 'Tiếng Việt',

  'help.title': 'Hướng dẫn sử dụng',
  'help.intro': 'Tab Manager theo dõi mọi tab đang mở, gom nhóm và phát hiện tab trùng - đặc biệt là Google Sheets.',
  'help.badge': 'Con số trên biểu tượng thanh công cụ là số tab trùng có thể đóng. Bấm vào để mở popup.',
  'help.popup': 'Popup: xem nhanh số liệu, tìm kiếm, chuyển tới bản đang mở hoặc đóng ngay các bản trùng.',
  'help.dashboard': 'Bảng điều khiển: danh sách đầy đủ, bộ lọc, gom nhóm và thao tác hàng loạt.',
  'help.groups': 'Nhóm theo tên miền, cửa sổ hoặc tệp Google Sheets. Bấm vào tiêu đề nhóm để thu gọn.',
  'help.clean': 'Dọn tab trùng luôn hiển thị kế hoạch cụ thể trước khi đóng bất kỳ tab nào.',
  'help.sheets': 'Google Sheets được so khớp bằng Spreadsheet ID + gid, nên hai tab khác sheet trong cùng tệp không bị coi là trùng.',
  'help.settings': 'Trong Cài đặt chọn ngôn ngữ (English / Tiếng Việt), giao diện, quy tắc giữ lại tab và cảnh báo badge.'
};

export const DICT = { en, vi };

let current = 'en';

/** Force a locale. Unknown values fall back to English. */
export function setLocale(locale) {
  current = LOCALES.includes(locale) ? locale : 'en';
  return current;
}

export function getLocale() {
  return current;
}

/** Chrome UI language ("vi-VN", "en-US", …) reduced to a supported locale. */
export function detectLocale() {
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

