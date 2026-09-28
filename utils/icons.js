/**
 * Lucide (ISC, https://lucide.dev) icon set, vendored as shape data.
 *
 * Why vendored and not the CDN bundle: an MV3 extension may not execute remote
 * code, and the project has no build step. Each entry is the inner markup of
 * the upstream SVG, kept as [tag, attributes] pairs so the SVG is built with
 * createElementNS - no markup parsing, CSP-safe.
 *
 * ponytail: only the icons in use are vendored (~20 of 1500). To add one, copy
 * the <path>/<circle>/<rect> children from https://lucide.dev/icons/<name>
 * into ICONS below; no other file changes.
 */
const ICONS = {
  'sun-moon': [
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M14.837 16.385a6 6 0 1 1-7.223-7.222c.624-.147.97.66.715 1.248a4 4 0 0 0 5.26 5.259c.589-.255 1.396.09 1.248.715' }],
    ['path', { d: 'M16 12a4 4 0 0 0-4-4' }],
    ['path', { d: 'm19 5-1.256 1.256' }],
    ['path', { d: 'M20 12h2' }]
  ],
  'refresh-cw': [
    ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
    ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
    ['path', { d: 'M8 16H3v5' }]
  ],
  search: [
    ['path', { d: 'm21 21-4.34-4.34' }],
    ['circle', { cx: 11, cy: 11, r: 8 }]
  ],
  settings: [
    ['path', { d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915' }],
    ['circle', { cx: 12, cy: 12, r: 3 }]
  ],
  'circle-question-mark': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
    ['path', { d: 'M12 17h.01' }]
  ],
  'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
  'chevron-right': [['path', { d: 'm9 18 6-6-6-6' }]],
  'chevrons-down-up': [
    ['path', { d: 'm7 20 5-5 5 5' }],
    ['path', { d: 'm7 4 5 5 5-5' }]
  ],
  'ellipsis-vertical': [
    ['circle', { cx: 12, cy: 12, r: 1 }],
    ['circle', { cx: 12, cy: 5, r: 1 }],
    ['circle', { cx: 12, cy: 19, r: 1 }]
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }]
  ],
  trash: [
    ['path', { d: 'M10 11v6' }],
    ['path', { d: 'M14 11v6' }],
    ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]
  ],
  eraser: [
    ['path', { d: 'M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21' }],
    ['path', { d: 'm5.082 11.09 8.828 8.828' }]
  ],
  'move-right': [
    ['path', { d: 'M18 8L22 12L18 16' }],
    ['path', { d: 'M2 12H22' }]
  ],
  'layout-dashboard': [
    ['rect', { width: 7, height: 9, x: 3, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 5, x: 14, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 9, x: 14, y: 12, rx: 1 }],
    ['rect', { width: 7, height: 5, x: 3, y: 16, rx: 1 }]
  ],
  'circle-check': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm16 9-5.5 5.5L8 12' }]
  ],
  table: [
    ['path', { d: 'M12 3v18' }],
    ['rect', { width: 18, height: 18, x: 3, y: 3, rx: 2 }],
    ['path', { d: 'M3 9h18' }],
    ['path', { d: 'M3 15h18' }]
  ]
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Every icon name this extension can render (used by tests/run.mjs). */
export const ICON_NAMES = Object.keys(ICONS);

/**
 * Build the <svg> for `name`, sized in px and inheriting `currentColor` so it
 * follows the surrounding text/button colour. Returns null for an unknown name.
 */
export function icon(name, { size = 16, cls = '' } = {}) {
  const shapes = ICONS[name];
  if (!shapes) return null;

  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [attr, value] of Object.entries({
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false'
  })) {
    svg.setAttribute(attr, value);
  }
  if (cls) svg.setAttribute('class', cls);

  for (const [tag, attrs] of shapes) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    svg.append(node);
  }
  return svg;
}

/**
 * Swap every `<i data-icon="name">` placeholder in `root` for its SVG, so the
 * HTML stays readable instead of carrying inline <svg> boilerplate.
 */
export function hydrateIcons(root = document) {
  for (const node of root.querySelectorAll('[data-icon]')) {
    const svg = icon(node.dataset.icon, {
      size: Number(node.dataset.size) || 16,
      cls: node.className
    });
    if (svg) node.replaceWith(svg);
  }
}

/** Prepend an icon to an existing element (for JS-built buttons). */
export function withIcon(target, name, options) {
  const svg = icon(name, options);
  if (svg) target.prepend(svg);
  return target;
}
