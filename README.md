# Tab Manager — Chrome Extension (Manifest V3)

Track, group and de-duplicate open tabs, with Google Sheets awareness: two tabs count as
the same only when the Spreadsheet ID **and** the `gid` match.

## Requirements

- Node.js 20.11+ (Vite 7)
- Chrome 114+

## Commands

```bash
npm install
npm run build    # production build -> dist/
npm run dev      # vite build --watch, rebuilds dist/ on change
npm run check    # locale parity + lookup check (no test framework)
```

## Load the extension

1. `npm run build`
2. Open `chrome://extensions` and enable **Developer mode**
3. **Load unpacked** → pick the `dist/` folder

`dist/` is generated (git-ignored) and is the only thing needed to install the extension.
After a rebuild, press ⟳ on the extension card to reload the service worker.

## Layout

| Path | Contents |
| --- | --- |
| `src/popup/` | Popup page: `popup.html` + React entry + view |
| `src/dashboard/` | Dashboard page: `dashboard.html` + React entry + view |
| `src/background/` | Service worker: tab state, message handlers, badge |
| `src/components/ui/` | UI primitives (Radix wrappers) |
| `src/components/shared/` | Components used by both popup and dashboard |
| `src/hooks/` | React hooks (tab state, theme, toast, confirm) |
| `src/services/` | Chrome API adapters: storage, favicon, messaging |
| `src/utils/` | Pure helpers: URL parsing, grouping, duplicate detection, `cn` |
| `src/constants/` | Message types, keep rules, modes, default settings |
| `src/i18n/` | Lookup + one file per locale in `locales/` |
| `src/styles/` | Tailwind entry stylesheet |
| `public/` | Copied verbatim into `dist/`: `manifest.json` and `icons/` |
| `scripts/` | Maintenance scripts (`npm run check`) |

## Build wiring

Vite's `root` is `src/`, so each page is built next to the entry it loads and the
output keeps the exact paths `public/manifest.json` asks for:

- `src/popup/popup.html` → `dist/popup/popup.html`
- `src/dashboard/dashboard.html` → `dist/dashboard/dashboard.html`
- `src/background/background.js` → `dist/background/background.js` (stable name, MV3 module)

The `@` alias points at `src/`. Page assets are content-hashed for cache busting; the
service worker deliberately is not, because the manifest cannot reference a hash.
`public/manifest.json` stays in `public/` so it is copied to the build root untouched.

## Notes

- Only settings are persisted (`chrome.storage.local`); tab state is always read live.
- Message names live in `src/constants/index.js` (`MSG`) and are shared by the worker and
  the UI; Chrome permissions (`tabs`, `storage`, `favicon`) match the manifest.

## License

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0) — free to use,
modify and share for **noncommercial** purposes only: personal use, study, hobby projects, research,
charities, schools and government. Commercial use is **not** permitted, so this is not an
OSI-approved open-source license. For commercial licensing, contact the maintainer.
