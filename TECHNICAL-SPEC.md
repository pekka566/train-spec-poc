# Train Punctuality Tracker – Technical Solutions Spec

## Overview & references

This document describes **how** to implement the Train Punctuality Tracker: tech stack, architecture, data flow, API usage, deployment, and testing. It does not repeat product or UX requirements; those are defined in the functional and visual specifications.

**Functional specification:** [FUNCTIONAL-SPEC.md](FUNCTIONAL-SPEC.md)  
**Visual specification:** [VISUAL-SPEC.md](VISUAL-SPEC.md)

The application is a client-only React SPA that tracks punctuality of two commuter trains (Lempäälä ↔ Tampere) using the Digitraffic Railway Traffic API. It provides summary statistics, a day-by-day timeline, and a sortable detail table. All behaviour and acceptance criteria are defined in the functional spec; visual design is in the visual spec. This document focuses on technical implementation.

---

## Tech stack

| Technology | Purpose |
| ---------- | ------- |
| **Vite** | Build tool and dev server |
| **React 19.2** | UI framework |
| **TypeScript** | Typing and tooling |
| **Mantine** | UI components and theming. Use at least `@mantine/core` and `@mantine/dates` (for date inputs). Implement visual spec with Mantine components and theme. |
| **TanStack Query (React Query)** | Server state, caching, and data fetching for Digitraffic API |

- No backend; the app runs entirely in the browser and calls Digitraffic directly.
- Styling and layout follow the visual spec (colors, cards, table, timeline) using Mantine’s component library and theme (e.g. Mantine colors for green/yellow/red/gray status and orange/indigo gradients for train cards).

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Client SPA]
    UI[React UI]
    Query[TanStack Query]
    API_Client[api.ts]
  end
  UI --> Query
  Query --> API_Client
  API_Client -->|HTTPS| Digitraffic[Digitraffic API]
```

- **SPA**: Single-page application; no server-side rendering or API proxy.
- **Data flow**: User selects date range and clicks "Fetch" → (1) compute weekdays in range (end not in future); (2) for each (date, trainNumber) in that set, determine if an API call is needed: **yes** if date is today, or if date is not today and there is no valid data in local storage for that (date, trainNumber); (3) **needed API calls** = number of such pairs; if **> 30**, set an error (e.g. "Too many API calls") and **do not** call the API; if **≤ 30**, proceed to fetch only for those pairs that need it and use local storage for the rest → `api.ts` performs `GET https://rata.digitraffic.fi/api/v1/trains/{date}/{trainNumber}` when needed → responses are parsed into `TrainRecord` → successful results for **past dates only** are written to local storage → Query cache holds the data → Summary, Timeline, and Table views read from the same hook output.
- **State**: All Digitraffic-derived data is **server state** managed by TanStack Query, with **local storage** as a persistence layer for past dates. UI state (selected date range, active tab) stays in React state (e.g. `useState` in the top-level component or a small context if preferred).

---

## Data layer (TanStack Query)

### Query key design

Use a stable query key per train per date so cache is deduplicated and reusable:

```typescript
const trainQueryKey = (date: string, trainNumber: number) =>
  ['train', date, trainNumber] as const;
```

- **Example:** `['train', '2026-01-27', 1719]` for the morning train on that date.

### Batching and aggregation

- For a given date range (start, end), compute the list of **weekdays only** (Monday–Friday, end date not in future). Then compute **needed API calls** from this list and local storage: each (date, trainNumber) not satisfied from storage, or today, counts as 1. If needed API calls **> 30**, abort with error and do not fetch. If **≤ 30**, for each (date, trainNumber) that needs data, call API (or read from storage), then aggregate.
- For each (date, trainNumber) that requires an API call, either:
  - use **`useQueries`** to run multiple queries in parallel, or
  - use a single hook that calls `queryClient.fetchQuery` (or `prefetchQuery`) for each `(date, trainNumber)` when the user clicks “Fetch”.
- Show a **loading** state until all queries for the selected range have settled (success or skipped).
- **Aggregate** successful results: map each API response to one `TrainRecord` (see API integration below), collect into a single `TrainRecord[]`, sort by date (newest first) for the table. Return `{ data: TrainRecord[], isLoading, error }` from the hook (e.g. `useTrainData(startDate, endDate)`).
- **Cache and stale time**: Set `staleTime` (e.g. 5–15 minutes) so the same date/train is not re-fetched on every tab switch; historical data is effectively immutable.

### Local storage

- **Purpose**: Persist fetched train data in the browser so repeat visits or re-fetches for the same date range avoid unnecessary API calls.
- **Key format**: Use a stable key per (date, trainNumber), e.g. `train:{date}:{trainNumber}` (e.g. `train:2026-01-27:1719`). Store the parsed **TrainRecord** (or the raw API response if you parse on read) as JSON.
- **Read**: When resolving data for (date, trainNumber), if **date is not today** (compare as YYYY-MM-DD in Finnish timezone), check `localStorage.getItem(key)` first. If present and valid, use it and do not call the API. If **date is today**, skip local storage and always fetch from the API.
- **Write**: After a successful API fetch, parse to TrainRecord; then **only if date is not today**, call `localStorage.setItem(key, JSON.stringify(trainRecord))`. Never write today’s data to local storage.
- **Placement**: Implement the read/write in the same layer that triggers the API (e.g. inside the TanStack Query fetcher or in a thin wrapper around `fetchTrain`). The hook calls a function that: (1) if date === today → fetch from API, do not persist; (2) else check localStorage → if hit, return parsed data; (3) else fetch from API, then persist and return.

### Needed API calls helper

- **`getNeededApiCalls(startDate: string, endDate: string): number`** — Implement in `trainStorage.ts` or `dateUtils.ts`. Takes the date range (ISO YYYY-MM-DD), computes the list of weekdays only (end not in future), and returns the number of (date, trainNumber) pairs that would require an API call: for each weekday in range and each train (1719, 9700), count 1 if date is today (Finnish timezone) or if there is no valid data in local storage for that (date, trainNumber). The UI or hook calls this **before** triggering fetch; if the result is > 30, show error and do not fetch; if ≤ 30, proceed with fetch.

### Hook contract

- **`useTrainData(startDate: string, endDate: string)`** (or with an “enabled” flag so it only runs after “Fetch”):
  - **When it runs:** Queries run only when the user has triggered a fetch (e.g. Fetch clicked). Before that, return empty data; use an `enabled` option so TanStack Query does not run until fetch is requested.
  - **Input:** ISO date strings (YYYY-MM-DD), weekday-only, end not in future (validate in UI or hook). **Before** running queries, the hook (or its caller) must compute **needed API calls** from the range and local storage (e.g. via `getNeededApiCalls(startDate, endDate)`); if > 30, do not run queries and instead set/return an error (e.g. `error: { type: 'TOO_MANY_API_CALLS', needed: number }`).
  - **Output:** `{ data: TrainRecord[] | undefined, isLoading: boolean, error: Error | null }`; optionally expose `neededApiCalls?: number` or an error with code `TOO_MANY_API_CALLS` and `needed` so the UI can show the right message.
  - **Internally:** TanStack Query (`useQueries` or `queryClient.fetchQuery`), local storage read/write per "Local storage" above, parse to `TrainRecord`, merge and sort by date (newest first).

---

## API integration

### API reference (Digitraffic Railway Traffic API)

- **Base URL:** `https://rata.digitraffic.fi/api/v1`
- **Endpoint:** `GET /trains/{departure_date}/{train_number}` (e.g. `GET /trains/2026-01-30/1719`)
- **Train numbers:** Morning 8:20 LPÄ→TPE: `1719`; Evening 16:35 TPE→LPÄ: `9700`
- **Station codes:** Lempäälä `LPÄ`, Tampere `TPE`
- **Response:** JSON array with a single train object. All times UTC; Finland is UTC+2/UTC+3. Historical data ~720 days.

```typescript
interface TrainResponse {
  trainNumber: number;
  departureDate: string;        // "YYYY-MM-DD"
  trainType: string;
  operatorShortCode: string;
  runningCurrently: boolean;
  cancelled: boolean;
  timeTableRows: TimeTableRow[];
}

interface TimeTableRow {
  stationShortCode: string;
  type: "DEPARTURE" | "ARRIVAL";
  scheduledTime: string;        // ISO 8601 UTC
  actualTime?: string;
  differenceInMinutes?: number; // positive = late
  commercialStop: boolean;
  cancelled: boolean;
}
```

**Example API calls:**

```bash
curl 'https://rata.digitraffic.fi/api/v1/trains/2026-01-30/1719' --compressed
curl 'https://rata.digitraffic.fi/api/v1/trains/2026-01-30/9700' --compressed
```

### Client

- **Single function** in `src/utils/api.ts`:  
  `fetchTrain(date: string, trainNumber: number): Promise<TrainResponse | null>`  
  - Calls `GET https://rata.digitraffic.fi/api/v1/trains/{date}/{trainNumber}`.
  - Returns the first element of the JSON array (one train per response), or `null` if the response is empty or the train is missing.
  - Throws on network errors or non-OK HTTP status so TanStack Query can treat them as errors and optionally retry.
- **Local storage** is not inside `fetchTrain`; the **caller** (e.g. the TanStack Query fetcher or a wrapper in the hook) is responsible for: (1) checking localStorage for past dates and returning early if data exists; (2) calling `fetchTrain` when no cached data or when date is today; (3) after a successful fetch, writing to localStorage only when date is not today (using a key like `train:{date}:{trainNumber}` and storing TrainRecord or raw response as JSON).

### Parsing to TrainRecord

- Map Digitraffic `TrainResponse` + `timeTableRows` to the functional spec’s **TrainRecord**:
  - Find the **departure** row: `type === "DEPARTURE"` and `stationShortCode === from` (LPÄ for 1719, TPE for 9700). Find the **arrival** row for the destination station.
  - **Delay:** Use `differenceInMinutes` from the departure row. If `differenceInMinutes` or `actualTime` is missing (e.g. train not yet departed), treat as `delayMinutes: 0` and derive status from that, or skip the record—document the choice. If train is cancelled (top-level or departure row), use status CANCELLED per functional spec.
- **Status classification** (functional spec):
  - `cancelled` → `CANCELLED`
  - else `delayMinutes <= 0` → `ON_TIME`
  - else `delayMinutes <= 5` → `SLIGHT_DELAY`
  - else → `DELAYED`
- Implement this parsing in a dedicated function (e.g. in `api.ts` or `utils/parseTrain.ts`) and reuse it wherever API response is turned into `TrainRecord`.

### Error handling

- **Per-query errors** (network failure, 5xx): Show an appropriate message in the UI; TanStack Query retry is optional (e.g. 1–2 retries).
- **Missing data**: If the API returns an empty array or no train for a date, treat as "no data" for that date/train (skip, do not fail the whole range). Do not show a fatal error for a single missing day.
- **Partial success**: When fetching a date range, some requests may succeed while others fail. The hook should:
  1. Return all successfully fetched `TrainRecord[]` in `data`.
  2. Set `error` only if **all** requests failed; otherwise leave `error` as `null`.
  3. Optionally expose a `partialErrors?: { date: string; trainNumber: number; error: Error }[]` field so the UI can show a warning like "Data for 2 days could not be loaded" without blocking the entire result.
  4. Never write failed responses to local storage; only successful responses for past dates are persisted.

---

## Project structure

Structure (aligned with functional spec; add TanStack Query, Mantine, and storage):

```
src/
├── components/
│   ├── DateRangePicker.tsx
│   ├── SummaryCard.tsx
│   ├── Timeline.tsx
│   ├── DataTable.tsx
│   └── TabNavigation.tsx
├── hooks/
│   └── useTrainData.ts
├── utils/
│   ├── api.ts
│   ├── dateUtils.ts
│   ├── statsCalculator.ts
│   ├── trainStorage.ts        (local storage read/write for past dates; key train:{date}:{trainNumber})
│   └── parseTrain.ts          (optional; can live in api.ts)
├── types/
│   └── train.ts
├── App.tsx
└── main.tsx                   (wrap app with MantineProvider, QueryClientProvider)
```

- **`src/types/train.ts`**: `TrainRecord`, `TrainResponse`, `TimeTableRow`, status type, and `TRAINS` config. The `TrainRecord` interface must match the functional spec exactly:
  ```typescript
  interface TrainRecord {
    date: string;                 // "YYYY-MM-DD"
    trainNumber: number;
    trainType: string;
    cancelled: boolean;
    scheduledDeparture: string;   // ISO timestamp
    actualDeparture: string | null;
    scheduledArrival: string;
    actualArrival: string | null;
    delayMinutes: number;
    status: "ON_TIME" | "SLIGHT_DELAY" | "DELAYED" | "CANCELLED";
  }
  ```
- **`src/utils/api.ts`**: `fetchTrain(date, trainNumber)`; optionally, mapping from API response to `TrainRecord` here or in a separate parser.
- **`src/utils/dateUtils.ts`**: Weekdays in range, Finnish date format, conversion from UTC to Finnish time (`Europe/Helsinki`) for display; also a helper for "is today" (YYYY-MM-DD in Finnish timezone) used by storage and fetcher.
  - **`formatFinnishDate(date: string): string`** — Takes ISO date (YYYY-MM-DD), returns Finnish weekday abbreviation + day.month, e.g. `"ma 27.1."`. Weekday abbreviations: `ma` (Mon), `ti` (Tue), `ke` (Wed), `to` (Thu), `pe` (Fri).
  - **`formatFinnishTime(isoTimestamp: string): string`** — Takes ISO timestamp, returns 24h time in Finnish timezone, e.g. `"08:20"`.
- **`src/utils/trainStorage.ts`**: `getTrainFromStorage(date, trainNumber)` (returns `TrainRecord | null`, only for past dates); `setTrainInStorage(date, trainNumber, record)` (no-op when date is today); **`getNeededApiCalls(startDate, endDate)`** returns the number of (date, trainNumber) pairs that would require an API call (today or not in storage), used to enforce the max 30 API calls rule before any request. Key format: `train:{date}:{trainNumber}`. Used by the TanStack Query fetcher or hook before/after API calls.
- **`src/utils/statsCalculator.ts`**: Pure functions for summary stats. **`computeSummary(records: TrainRecord[])`** should return an object usable by SummaryCard, e.g. `{ onTimePercent, slightDelayPercent, delayedPercent, cancelledCount, averageDelay, totalCount }` where percentages use denominator `totalCount` (all records including cancelled), and `averageDelay` is the mean of `delayMinutes` over non-cancelled records only. Used by SummaryCard.
- **`src/hooks/useTrainData.ts`**: Takes date range; **before** fetching, calls `getNeededApiCalls(startDate, endDate)`; if result > 30, sets/returns error (e.g. `TOO_MANY_API_CALLS` with `needed`) and does not fetch; otherwise uses TanStack Query (e.g. `useQueries` or `queryClient.fetchQuery` with `trainQueryKey`); returns `{ data: TrainRecord[], isLoading, error }`.
- **Components**: SummaryCard, Timeline, DataTable, DateRangePicker, TabNavigation. They consume `useTrainData` (or receive `data`/`isLoading`/`error` from a parent that uses it) and use **Mantine** for layout and styling per [VISUAL-SPEC.md](VISUAL-SPEC.md).

---

## Deployment (Vercel)

- **Build**: Standard Vite build (`vite build`); output is static (e.g. `dist/`).
- **Vercel**: Connect the repo to Vercel; use default Vite preset. No environment variables required for the public Digitraffic API.
- **No server-side logic**: No API routes or serverless functions; the browser talks directly to Digitraffic.

---

## Testing

- **Framework**: Vitest + React Testing Library.
- **Utils**:
  - **`api.ts`**: Mock `fetch`; assert correct URL and that response is parsed (and that empty response yields `null` or is handled).
  - **`dateUtils.ts`**: Weekdays in range, Finnish date formatting, timezone conversion.
  - **`statsCalculator.ts`**: Given a small `TrainRecord[]`, assert correct percentages, counts, and average delay (and status classification if it lives there).
- **Components** (RTL):
  - **SummaryCard**: Given mock `TrainRecord[]` (or summary stats), assert correct labels and percentages.
  - **DataTable**: Sort order (newest first), formatted date and delay, status badges.
  - **DateRangePicker**: Min/max range, weekday-only behaviour if enforced in UI.
  - **Timeline**: Correct color per status (green/yellow/red/gray).
- **Hook** (optional): Test `useTrainData` with `QueryClientProvider` and mocked `fetchTrain` returning canned Digitraffic payloads; assert aggregated `TrainRecord[]` and loading/error states.
- **E2E**: Out of scope for this technical spec.

---

## Non-functional

- **Error handling**: Per-query errors surfaced in UI with a clear message; missing data for a single date does not break the whole range.
- **Loading UX**: Show a single loading indicator (spinner or skeleton) while any of the range queries are in flight; avoid layout shift.
- **Finnish timezone**: All user-visible times must be in `Europe/Helsinki` (e.g. via `Intl` or `dateUtils`); store and transmit UTC from the API as-is.
- **Responsiveness**: Layout works on mobile (stack summary cards, scrollable table/timeline) using Mantine’s responsive props or breakpoints; no horizontal scrolling of the page.

---

## Out of scope (technical spec)

- Backend, authentication, persistence, push notifications, real-time APIs (as in functional spec).
- Detailed UI/UX copy and pixel-perfect layout are in the functional and visual specs; this document references them for wording and visuals, implemented with Mantine.
