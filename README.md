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

## Other Scripts

```bash
pnpm lint        # Run ESLint
pnpm type-check  # TypeScript check
pnpm preview     # Preview production build locally
```
