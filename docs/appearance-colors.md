# Appearance colors

Personal appearance settings are on `/settings/profile`, in გარეგნობა. They apply to this browser and are independent of light/dark/system mode. The neutral option preserves the existing theme and remains the default. Preferences are not synchronized between devices or accounts.

## Add a palette

Edit `src/lib/appearance.ts` and append one `palette(...)` entry to `accentPalettes`:

```ts
palette(
  'petrol',             // Stable, unique lowercase ID. Keep existing IDs unchanged.
  'მუქი ლურჯმწვანე',    // Georgian option label.
  '#245B63',            // Light primary and the swatch/selected-tab background.
  '#9DCAD1',            // Dark primary, link and focus-ring color.
  '#EDF5F6',            // Light subtle highlight background.
  '#203438',            // Dark subtle highlight background.
),
```

The settings options, Zod allowlist, startup allowlist and CSS are derived from this registry. No route, component, database or dependency change is required. Use trusted six-digit hex values; never put user-provided values in the registry or generated CSS.

The selector sorts once at module initialization: neutral first, then a hue progression from blues through purples, wine, oranges, gold, olive and greens. New colors enter their hue position automatically, wherever their entry appears in the source array. DOM and keyboard navigation follow the same order.

The helper pairs the light primary and selected tabs with white text, and the dark primary with `#171717` text. Highlight text uses the corresponding primary. Choose colors that meet 4.5:1 for normal text and 3:1 for focus indicators. Preserve the existing status, schedule and map color meanings.

The registry keeps all chosen base hex values unchanged. Dark mode uses a reviewed lighter shade for primary buttons, links, checked switches, checkboxes, radio buttons and focus rings. Selected tabs retain the deeper base shade with white labels. Button hover shades are computed once at module load, slightly darker in light mode and lighter in dark mode. The tests check both default and hover text contrast.

Subtle accent surfaces also identify active sidebar links, the current pagination page, selected table rows, calendar date ranges and text selection. Progress bars and selected calendar dates already consume primary tokens. Ordinary content surfaces and semantic status badges keep their existing colors. Neutral supplies no overrides, including for its existing green switches.

Selected select options and checked dropdown-menu checkbox/radio choices use the same subtle accent pair, including in portaled popups. Existing menu focus/hover highlights already consume these tokens. Keep ordinary cards, headings, separators and destructive actions independent of personal accent selection.

Keep notification popup headers, footers, borders, header icons and idle actions neutral in both themes. Unread rows use a neutral shade, with accent-colored unread icons/count badges to identify state. Apply accent surfaces on hover, keyboard focus, expanded controls and selected theme options. Footer links become accented on hover/focus. Preserve muted read metadata and red unread dots. Use the shared `soft` Button variant for selected-state emphasis and the `accent` Badge variant for unread counts, not business outcomes. Avoid decorative persistent accent washes or shiny surfaces.

The current order is neutral, sapphire, navy, cobalt, iris, indigo, wine, burnt orange, copper, antique gold, olive, forest, eucalyptus and jade. Antique gold is shared with the original set rather than duplicated.

Run `pnpm exec vitest run src/lib/appearance.test.ts src/features/account/components/appearance-settings.test.tsx`, then inspect the new palette in both themes, including keyboard focus, hover, selected tabs and narrow layouts. The contrast test covers every registry entry automatically.

## How switching works

Palette CSS is generated once at module initialization and included in the document head. A small script restores an allowlisted `teamwork.accent.v1` localStorage ID before first paint. Selecting an option validates the ID, persists it, then sets `document.documentElement.dataset.accent`. Only the settings control updates React state. There are no network calls, query invalidations or app-wide React subscriptions. Unknown IDs or inaccessible storage restore neutral. Failed saves keep the previous selection and show a Georgian error toast.
