# Train Punctuality Tracker

React SPA tracking commuter train punctuality between Lempäälä and Tampere, Finland using the Digitraffic API.

## Quick Reference

- **Stack**: Vite + React 19 + TypeScript + Mantine UI + TanStack Query
- **Package manager**: pnpm (v9.15.0)
- **Node**: >=20.0.0

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Type check + build (tsc -b && vite build)
pnpm test         # Run tests (vitest)
pnpm test:ui      # Run tests with UI
pnpm test:coverage # Run tests with coverage
pnpm lint         # ESLint
pnpm type-check   # TypeScript check (tsc --noEmit)
```

## Project Structure

```
src/
├── components/     # React components (DateRangePicker, SummaryCard, Timeline, DataTable, TabNavigation)
├── hooks/          # Custom hooks (useTrainData)
├── utils/          # Utilities (api.ts, dateUtils.ts, statsCalculator.ts, trainStorage.ts)
├── types/          # TypeScript types (train.ts)
├── test/           # Test setup
├── App.tsx         # Main app component
└── main.tsx        # Entry point with MantineProvider
```

## Key Conventions

- **Path alias**: `@/*` maps to `src/*`
- **Strict TypeScript**: Enabled with `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- **Testing**: Vitest with jsdom, React Testing Library, setup in `src/test/setup.ts`
- **Styling**: Mantine components and theme (no custom CSS files needed)

## Domain Knowledge

### Trains
- **Morning train 1719**: Lempäälä (LPÄ) → Tampere (TPE), 8:20
- **Evening train 9700**: Tampere (TPE) → Lempäälä (LPÄ), 16:35

### Status Classification
- `ON_TIME`: delay ≤ 1 min
- `SLIGHT_DELAY`: 2-5 min delay
- `DELAYED`: >5 min delay
- `CANCELLED`: train cancelled

### API
- **Endpoint**: `GET https://rata.digitraffic.fi/api/v1/trains/{date}/{trainNumber}`
- **Date format**: YYYY-MM-DD
- **Times**: API returns UTC, display in Europe/Helsinki timezone
- **Max API calls**: 30 per fetch (enforced before fetching)

### Local Storage
- Key format: `train:{date}:{trainNumber}`
- Never store today's data (always fetch fresh)
- Use cached data for past dates

## Specifications

- [FUNCTIONAL-SPEC.md](FUNCTIONAL-SPEC.md) - Requirements and user stories
- [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md) - Architecture and implementation details
- [VISUAL-SPEC.md](VISUAL-SPEC.md) - UI/UX design
