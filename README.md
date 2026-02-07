# Train Punctuality Tracker

Track punctuality of commuter trains between Lempäälä and Tampere using Digitraffic API data.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Installation

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Opens the app at http://localhost:5173

### Mock API mode

Run with mocked API responses (no network required):

```bash
pnpm dev:mock
```

Or add `?mock` to any dev URL: `http://localhost:5173/?mock`

## Build

```bash
pnpm build
```

Output is in `dist/` folder, ready for static hosting.

## Testing

```bash
pnpm test           # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage report
```

### E2E Tests

E2E tests use [Playwright](https://playwright.dev/) with Chromium.

```bash
# Install browsers (first time only)
pnpm exec playwright install chromium

# Run E2E tests
pnpm test:e2e

# Run E2E tests with interactive UI
pnpm test:e2e:ui
```

The tests automatically start the Vite dev server. If one is already running on port 5173, it will be reused.

### Accessibility Testing

Accessibility is checked at two levels:

- **Lint-time**: `eslint-plugin-jsx-a11y` catches common a11y issues during development (runs with `pnpm lint`)
- **E2E**: `@axe-core/playwright` runs WCAG 2.1 AA checks against the live app (runs with `pnpm test:e2e`)

## Other Scripts

```bash
pnpm lint        # Run ESLint
pnpm type-check  # TypeScript check
pnpm preview     # Preview production build locally
```
