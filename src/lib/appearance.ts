type PaletteTokens = {
  primary: string
  primaryForeground: string
  primaryHover: string
  accent: string
  accentForeground: string
  ring: string
}

type AccentPalette = {
  id: string
  label: string
  swatch: string
  light?: PaletteTokens
  dark?: PaletteTokens
}

function palette(
  id: string,
  label: string,
  primary: string,
  darkPrimary: string,
  lightAccent: string,
  darkAccent: string,
) {
  return {
    id,
    label,
    swatch: primary,
    light: {
      primary,
      primaryForeground: '#ffffff',
      primaryHover: mix(primary, '#000000', 0.08),
      accent: lightAccent,
      accentForeground: primary,
      ring: primary,
    },
    dark: {
      primary: darkPrimary,
      primaryForeground: '#171717',
      primaryHover: mix(darkPrimary, '#ffffff', 0.08),
      accent: darkAccent,
      accentForeground: darkPrimary,
      ring: darkPrimary,
    },
  }
}

function mix(base: string, target: string, amount: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((i) => {
        const from = parseInt(base.slice(i, i + 2), 16)
        const to = parseInt(target.slice(i, i + 2), 16)
        return Math.round(from + (to - from) * amount)
          .toString(16)
          .padStart(2, '0')
      })
      .join('')
  )
}

// Start the hue wheel at blue, continuing through purple, red, orange, yellow and green.
function hueOrder(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  )
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return -1
  const hue =
    max === r
      ? (g - b) / delta
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4
  return (hue * 60 - 200 + 720) % 360
}

// Add reviewed palettes here. Options, validation, startup restoration and CSS share this registry.
const palettes: AccentPalette[] = [
  { id: 'neutral', label: 'ნეიტრალური', swatch: '#303030' },
  palette(
    'sapphire',
    'საფირონის ლურჯი',
    '#234E83',
    '#9dbce5',
    '#edf2f8',
    '#202e40',
  ),
  palette(
    'antique-gold',
    'ძველი ოქროსფერი',
    '#82702F',
    '#d9c783',
    '#fbf9f0',
    '#353020',
  ),
  palette(
    'copper',
    'სპილენძისფერი',
    '#965D35',
    '#e5b28b',
    '#f8efe8',
    '#3c2b20',
  ),
  palette('iris', 'ზამბახისფერი', '#5C6096', '#b9bce5', '#f0f0f8', '#2b2c40'),
  palette(
    'jade',
    'ნეფრიტის მწვანე',
    '#28705F',
    '#96d5c0',
    '#f0f8f4',
    '#20362e',
  ),
  palette(
    'eucalyptus',
    'ევკალიპტის მწვანე',
    '#4B6658',
    '#b0cebd',
    '#f1f6f3',
    '#28372f',
  ),
  palette('forest', 'ტყის მწვანე', '#166534', '#91d6a9', '#f0f8f2', '#1e3427'),
  palette('wine', 'ღვინისფერი', '#743C51', '#e2afc0', '#faf2f5', '#3b2630'),
  palette('navy', 'მუქი ლურჯი', '#263F66', '#a5bee4', '#f0f4fa', '#232e40'),
  palette('indigo', 'ინდიგო', '#4338CA', '#bab5fb', '#f3f2fd', '#2c2848'),
  palette(
    'cobalt',
    'კობალტის ლურჯი',
    '#2563EB',
    '#a5c4ff',
    '#f4f8ff',
    '#22334d',
  ),
  palette(
    'burnt-orange',
    'მუქი ნარინჯისფერი',
    '#C2410C',
    '#ffba92',
    '#fff6f0',
    '#402a20',
  ),
  palette(
    'olive',
    'ზეთისხილისფერი',
    '#4D5B26',
    '#c5d59b',
    '#f5f7ed',
    '#303521',
  ),
]

// Sort once at module initialization; render order also defines keyboard navigation order.
export const accentPalettes: readonly AccentPalette[] = palettes.sort(
  (a, b) => {
    if (a.id === 'neutral') return -1
    if (b.id === 'neutral') return 1
    return hueOrder(a.swatch) - hueOrder(b.swatch) || a.id.localeCompare(b.id)
  },
)

export const ACCENT_STORAGE_KEY = 'teamwork.accent.v1'
export const DEFAULT_ACCENT = 'neutral'
export const accentIds = accentPalettes.map(({ id }) => id)

function declarations(tokens: PaletteTokens) {
  return `--primary:${tokens.primary};--primary-foreground:${tokens.primaryForeground};--primary-hover:${tokens.primaryHover};--switch-checked:${tokens.primary};--switch-checked-foreground:${tokens.primaryForeground};--accent:${tokens.accent};--accent-foreground:${tokens.accentForeground};--calendar-range-background:${tokens.accent};--ring:${tokens.ring};--sidebar-primary:${tokens.primary};--sidebar-primary-foreground:${tokens.primaryForeground};--sidebar-accent:${tokens.accent};--sidebar-accent-foreground:${tokens.accentForeground};--sidebar-ring:${tokens.ring};`
}

// Prepared once per module load, never during selection or component rendering.
export const accentStyles = accentPalettes
  .flatMap(({ id, swatch, light, dark }) => {
    if (!light || !dark) return []
    const root = `:root[data-accent='${id}']`
    return [
      `${root}{${declarations(light)}}`,
      `${root}.dark{${declarations(dark)}--button-highlight:rgb(255 255 255 / 24%);}`,
      `${root} [data-slot='tabs-list'][data-variant='default'] [data-slot='tabs-trigger'][data-active]{background:${swatch};color:#fff;}`,
    ]
  })
  .join('\n')

// Shared selection surfaces stay subtle; business-status badges keep their own tokens.
const accentRoot = ":root[data-accent]:not([data-accent='neutral'])"
export const accentControlStyles = `
${accentRoot} ::selection{background:var(--accent);color:var(--accent-foreground);}
${accentRoot} [data-slot='pagination'] [aria-current='page']{background:var(--accent);color:var(--accent-foreground);border-color:var(--primary);}
${accentRoot} [data-slot='table-row'][data-state='selected']{background:var(--accent);}
${accentRoot} [data-slot='select-item'][data-selected],${accentRoot} [data-slot='dropdown-menu-checkbox-item'][data-checked],${accentRoot} [data-slot='dropdown-menu-radio-item'][data-checked]{background:var(--accent);color:var(--accent-foreground);}
${accentRoot} [data-range-middle='true']{background:var(--accent);color:var(--accent-foreground);}
${accentRoot} [data-selected-single='true'],${accentRoot} [data-range-start='true'],${accentRoot} [data-range-end='true']{background:var(--primary);color:var(--primary-foreground);}
`

// Only trusted registry IDs enter this script. Storage never supplies CSS or script text.
export const ACCENT_INIT_SCRIPT = `(function(){try{var id=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});document.documentElement.dataset.accent=${JSON.stringify(accentIds)}.includes(id)?id:${JSON.stringify(DEFAULT_ACCENT)};}catch(e){document.documentElement.dataset.accent=${JSON.stringify(DEFAULT_ACCENT)};}})();`
