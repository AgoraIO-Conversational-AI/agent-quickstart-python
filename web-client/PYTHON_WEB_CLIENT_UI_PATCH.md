# Python web-client UI updates (apply these changes)

Your environment was in **plan mode**, so edits were not applied automatically. Copy the changes below into the repo (or switch to **Agent** mode and ask to apply `PYTHON_WEB_CLIENT_UI_PATCH.md`).

---

## 1. `tailwind.config.js`

- Set `darkMode: 'media'` (replace `darkMode: ['class']`).
- Under `theme.extend.colors`, after `chart`, add:

```js
        status: {
          success: 'hsl(var(--status-success) / <alpha-value>)',
          warning: 'hsl(var(--status-warning) / <alpha-value>)',
          error: 'hsl(var(--status-error) / <alpha-value>)',
        },
```

---

## 2. `src/index.css`

**In `:root`**, after `--viz-stop-3`, add status tokens and change `--font-sans`:

```css
  /* design_tokens.json status + semantic light success */
  --status-success: 118 52% 36%;
  --status-warning: 44 86% 47%;
  --status-error: 352 72% 54%;

  --font-sans: var(--font-instrument-sans), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;
```

(Remove the old single-line `--font-sans: system-ui, ...`.)

**Inside `@media (prefers-color-scheme: dark)`’s `:root`**, before the closing `}` of that block, add:

```css
    --status-success: 117 49% 46%;
    --status-warning: 44 88% 52%;
    --status-error: 352 74% 58%;
```

Do not invert the footer logo in dark mode. The RGB asset should remain Agora blue.

---

## 3. `app/layout.tsx`

Add Instrument Sans via `next/font/google` and attach the CSS variable to `<html>`:

```tsx
import type { Metadata, Viewport } from 'next'
import { Instrument_Sans } from 'next/font/google'
import '@/index.css'

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-sans',
})

// ... existing metadata ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  )
}
```

---

## 4. `src/components/ConnectionStatusPanel.tsx`

Replace `bg-green-500` → `bg-status-success`, `bg-amber-500` → `bg-status-warning`, `bg-red-500` → `bg-status-error` (all four occurrences: ping ring and solid dot).

---

## 5. `src/components/app.tsx`

- **Hero gradient** (inline `style`): use `0.04` instead of `0.05` for the alpha to match the Next.js quickstart (`hsl(194 100% 50% / 0.04)`).

- **Primary CTA `Button`**: align with Next pre-call styling — use `w-56` (not `min-w-56` + pill), remove `rounded-full`, add disabled hover parity:

```tsx
            <Button
              className={cn(
                'animate-fade-up animate-fade-up-d3 w-56 border-2 text-sm font-medium transition-colors',
                isConnecting
                  ? 'cursor-wait border-border bg-secondary text-muted-foreground'
                  : 'border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-primary disabled:hover:bg-primary disabled:hover:text-primary-foreground',
              )}
              disabled={isConnecting}
              onClick={connect}
              type="button"
            >
```

- **Footer `<img>`**: add class `agora-footer-logo` next to existing classes, e.g.

```tsx
className='agora-footer-logo h-6 w-auto translate-y-1 transition-opacity hover:opacity-80'
```

---

## Verify

- Toggle OS light/dark: layout, CTA, connection dot colors, footer logo, transcript.
- `bun run lint` / `bun run build` in `web-client`.

---

*After you merge, you can delete this file if you do not want patch notes in the repo.*
