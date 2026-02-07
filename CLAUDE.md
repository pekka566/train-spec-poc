# Train Punctuality Tracker

React SPA tracking commuter train punctuality between Lempäälä and Tampere, Finland using the Digitraffic API.

## Quick Reference

- **Stack**: Vite + React 19 + TypeScript + Mantine UI 7 + TanStack Query 5
- **Package manager**: pnpm (v9.15.0)
- **Node**: >=20.0.0
- **Key libraries**: dayjs (timezone handling), @tabler/icons-react (icons), @mantine/dates (date inputs)

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
├── components/
│   ├── DateRangePicker.tsx   # Date inputs + train selection dropdowns + fetch button
│   ├── SummaryCard.tsx       # Statistics card (on-time %, avg delay, progress bar)
│   ├── Timeline.tsx          # Color-coded grid of daily results (green/yellow/red/gray)
│   ├── DataTable.tsx         # Sortable results table (date, times, delay, status)
│   ├── TabNavigation.tsx     # Summary / Table tab switcher
│   └── StatusLegend.tsx      # Reusable color legend (on time / slight / delayed / cancelled)
├── hooks/
│   └── useTrainData.ts       # Data fetching hook (cache check → API → merge → sort)
├── utils/
│   ├── api.ts                # REST API: fetchTrain(), parseTrainResponse(), getTrainStatus()
│   ├── apiGraphql.ts         # GraphQL: route fetch, direction splitting, return filtering
│   ├── dateUtils.ts          # Finnish timezone dates, weekday ranges, formatting
│   ├── statsCalculator.ts    # computeSummary(), filterByTrain(), sortByDate()
│   ├── trainStorage.ts       # LocalStorage: get/set/cache check, API call counting
│   └── trainUtils.ts         # getTrainTitle() display formatter
├── types/
│   └── train.ts              # TrainRecord, TrainResponse, TrainConfig, TrainSummary, TrainStatus
├── constants/
│   └── statusLegend.ts       # STATUS_LEGEND_ITEMS (4 status colors + labels)
├── test/
│   ├── setup.ts              # Vitest setup: jest-dom matchers, window.matchMedia polyfill
│   └── test-utils.tsx        # Custom render() wrapping MantineProvider for component tests
├── App.tsx                   # Main component: state, route fetch, train selection, layout
└── main.tsx                  # Entry: StrictMode → QueryClientProvider → MantineProvider → App
```

## Architecture

### Provider hierarchy (main.tsx)
```
StrictMode → QueryClientProvider → MantineProvider → App
```
- QueryClient: `refetchOnWindowFocus: false`, `retry: 1`
- MantineProvider: default theme (no custom overrides)

### State management (App.tsx)
- **UI state**: React `useState` — dates, activeTab, selected trains
- **Server state**: TanStack Query via `useTrainData` hook (manual trigger, staleTime 5min)
- **Derived state**: `useMemo` for route filtering, record filtering, summary computation
- **One-time route fetch**: `useRef` flag prevents double-fetch in React StrictMode

### Data flow
```
App load → runRouteFetchOnce() → GraphQL → localStorage (train:route:weekday)
                                                 ↓
User selects dates/trains → clicks Fetch → useTrainData:
  1. getApiCallsNeeded() → list of (date, trainNumber) pairs
  2. If > 30 pairs → show error, no API calls
  3. For each pair: check localStorage cache → fetch from REST API if missing
  4. Store results (except today) → merge cached + fresh → sort → return
```

### Train selection logic
- Outbound dropdown: all Lempäälä → Tampere trains, default to 1719
- Return dropdown: filtered to trains departing **after** selected outbound, default to 9700
- When outbound changes, return selection resets if no longer valid

## Code Conventions

### Components
- Explicit props interfaces (not `React.FC`)
- `hideTitle` prop pattern for conditional heading rendering
- Inline Mantine styles only — no custom CSS files
- CSS variables: `var(--mantine-color-{name}-{shade})` (hyphenated form, e.g. `green-5`)
- Colors defined in `constants/statusLegend.ts`, referenced by components

### Accessibility
- Semantic HTML: `<main>`, `<header>`, `<section>`
- Skip-to-content link (visually hidden, visible on focus)
- `role="status"` + `aria-live="polite"` for loading/empty states
- `aria-sort` on sortable table headers
- `aria-hidden` on decorative icons
- Focus management: `mainContentRef` auto-focuses content area after data load
- WCAG 2.1 AA color contrast: `--mantine-color-dimmed` overridden to `gray.7`; `primaryShade: 9` in light mode; green shade 9 darkened
- `eslint-plugin-jsx-a11y` for compile-time a11y linting
- `@axe-core/playwright` E2E tests in `e2e/accessibility.spec.ts` covering loading, selection, summary, table, and error states
- `ariaLabels` prop on `DateInput` calendar navigation buttons
- `aria-label` on `Progress.Section` components for screen readers

### Performance
- `useMemo` for expensive derived state (route filtering, record filtering, summaries)
- `useCallback` for the fetch function
- TanStack Query deduplication by `['train', date, trainNumber]` query key
- localStorage cache avoids refetching historical data

### Date handling
- **Internal format**: always `YYYY-MM-DD` (ISO, sortable as strings)
- **Display format**: Finnish `"ma 27.1."` or 24h time `"08:20"`
- **Timezone**: dayjs with UTC + timezone plugins, always `Europe/Helsinki`
- **Weekdays only**: `getWeekdaysInRange()` excludes Sat/Sun and future dates

## Testing Conventions

- **Framework**: Vitest + jsdom + React Testing Library
- **Custom render**: Always import `render` from `@/test/test-utils` (not `@testing-library/react`) — it wraps components with MantineProvider
- **Setup** (`src/test/setup.ts`): polyfills `window.matchMedia` for Mantine, imports jest-dom matchers
- **API mocking**: `vi.stubGlobal('fetch', vi.fn(...))` for REST API tests
- **Time mocking**: `vi.useFakeTimers()` + `vi.setSystemTime()` for timezone-dependent tests
- **Pattern**: Arrange–Act–Assert; explicit error case tests; verify accessibility attributes
- **E2E accessibility**: `e2e/accessibility.spec.ts` runs axe-core checks (WCAG 2.1 AA) on every app state (loading, selection, summary, table, error)

## Domain Knowledge

### Trains
- **Default outbound 1719**: Lempäälä (LPÄ) → Tampere (TPE), 8:20
- **Default return 9700**: Tampere (TPE) → Lempäälä (LPÄ), 16:35
- User can select any weekday train on the route via dropdowns (populated from GraphQL)
- Return options are filtered: only trains departing after the selected outbound

### Status Classification
- `ON_TIME`: delay ≤ 1 min
- `SLIGHT_DELAY`: 2–5 min delay
- `DELAYED`: >5 min delay
- `CANCELLED`: train cancelled (delay = 0, actualDeparture/Arrival = null)

### Statistics calculation
- Percentages (onTime, slightDelay, delayed): calculated from `totalCount` (includes cancelled)
- `averageDelay`: mean of `delayMinutes` **excluding** cancelled trains
- `averageDelay` rounded to 1 decimal place

### API
- **REST (single train)**: `GET https://rata.digitraffic.fi/api/v1/trains/{date}/{trainNumber}`
- **Date format**: YYYY-MM-DD
- **Times**: API returns UTC, display in Europe/Helsinki timezone
- **Max API calls**: 30 per fetch (enforced before fetching; if exceeded, no calls made)
- **Parsing**: Finds DEPARTURE row by `from` station code, ARRIVAL row by `to` station code

### GraphQL (route fetch)
- **Usage**: Run once per day to fetch **weekday** route trains (Lempäälä–Tampere) for the train selection dropdowns; implementation in `src/utils/apiGraphql.ts`. The app shows only weekday trains; the fetch uses a **reference weekday date** (today if Mon–Fri, else next Monday) so the API returns weekday-only trains.
- **Endpoint**: `POST https://rata.digitraffic.fi/api/v2/graphql/graphql`, headers `Content-Type: application/json`, `Accept-Encoding: gzip`.
- **Query**: `trainsByDepartureDate(departureDate, where: …)`; request `trainNumber`, `trainType.name`, `timeTableRows(where: Lempäälä or Tampere asema)` including `type`, `scheduledTime`, `station { name }`, `trainStopping`. Only trains with a stop at Lempäälä (`trainStopping === true`) are stored.
- **Direction derivation**: Compares DEPARTURE timestamps at Lempäälä vs Tampere to determine direction.
- **Storage**: Weekday route stored under `train:route:weekday`; idempotent fetch flag `train:route:fetched`; read via `getRouteWeekdayFromStorage()`.
- **Error handling**: On failure, `runRouteFetchOnce()` logs to `console.warn` and re-throws. App.tsx catches it and shows a red Alert ("Failed to load train routes") with error message and Retry button. A loading spinner ("Loading train routes...") is shown during the fetch, and the Fetch Data button is disabled until the route fetch completes.
- **API documentation**: [Digitraffic – Railway traffic](https://www.digitraffic.fi/rautatieliikenne/) (REST APIs → GraphQL, Train data, Response types → Trains / timeTableRows).
- **Try queries**: [GraphiQL](https://rata.digitraffic.fi/api/v2/graphql/graphiql).

### Local Storage
- **Train data**: key `train:{date}:{trainNumber}` — cached for past dates, never for today
- **Route data**: key `train:route:weekday` — updated once per day
- **Route fetch flag**: key `train:route:fetched` — prevents redundant fetches

### Versioning
- Version in `package.json` is auto-bumped (patch) on every commit via pre-commit hook (`.githooks/pre-commit`)
- To bump minor/major manually: change version in `package.json` before committing — the hook detects the change and skips auto-bump
- Version is displayed in the app footer and used to clear localStorage when it changes (see `src/utils/versionCheck.ts`)
- Git hooks path is set via `prepare` script (`git config core.hooksPath .githooks`), activated automatically on `pnpm install`

## Specifications

- [FUNCTIONAL-SPEC.md](FUNCTIONAL-SPEC.md) - Requirements and user stories
- [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md) - Architecture and implementation details
- [VISUAL-SPEC.md](VISUAL-SPEC.md) - UI/UX design

### After every change

- **Run the linter** and fix any reported errors: `pnpm lint`. Do not consider a change complete until lint passes.
- **Run all tests** and ensure they pass: `pnpm test -- --run`
- **Run test coverage report**: `pnpm test:coverage`. If the report shows uncovered lines or branches, **ask the user** whether to write tests to cover them before considering the change complete.
- **Run build** and ensure it succeeds: `pnpm build`
- **Check spec sync**: After every change, verify that the spec files ([FUNCTIONAL-SPEC.md](FUNCTIONAL-SPEC.md), [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md), [VISUAL-SPEC.md](VISUAL-SPEC.md)) are in sync with the implementation. If they are not, **ask the user** whether to update the specs or the implementation.
- Do not consider a change complete until lint passes, tests pass, coverage has been checked (and any requested coverage gaps addressed), build succeeds, and specs are verified in sync.
