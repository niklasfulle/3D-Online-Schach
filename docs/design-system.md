# Design system

The client uses Tailwind CSS v4 as its component styling layer.

## Rules

- New component layout, spacing, typography, states, and responsive behavior use Tailwind utility classes.
- Reusable colors and surfaces are semantic CSS variables declared in `apps/client/src/styles.css` and consumed through the Tailwind theme.
- `styles.css` is reserved for Tailwind setup, design tokens, browser defaults, focus treatment, and reduced-motion behavior. It must not contain page- or component-specific selectors.
- Interactive controls must expose visible focus, hover, disabled, and reduced-motion states.
- Dark and light themes share the same semantic token names; components must not hard-code a theme-specific surface color when a token exists.

## Review checklist

Before merging a client UI change, verify the page at narrow and wide widths, in both themes, and with keyboard focus. Run the client typecheck and test suite. Any intentional global rule belongs in `styles.css` and should be documented here.
