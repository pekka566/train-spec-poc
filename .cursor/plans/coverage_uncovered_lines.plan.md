---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan: Cover Uncovered Lines (Test Coverage)

## Goal

Add or extend tests so that the currently uncovered lines and branches are exercised, improving statement, branch, function, and line coverage.

## Uncovered Areas and Planned Tests

### 1. api.ts — Lines 51–54 (Branch)

**Uncovered:** `getStationCodesByDirection("Tampere → Lempäälä")` returns `{ from: "TPE", to: "LPÄ" }`. Existing tests likely only hit the "Lempäälä → Tampere" branch.

**Action:** In [src/utils/api.test.ts](src/utils/api.test.ts), add a describe block (or extend existing) for `getStationCodesByDirection`:

- Test with `"Lempäälä → Tampere"` → `{ from: "LPÄ", to: "TPE" }`.
- Test with `"Tampere → Lempäälä"` → `{ from: "TPE", to: "LPÄ" }` (covers lines 51–54).

**Import:** Export is already public; ensure the test file imports `getStationCodesByDirection` from `./api`.

---

### 2. apiGraphql.ts — Multiple Uncovered Regions

**Line 94 — `getDepartureAndDirection` returns null:**  
Called when timeTableRows have no DEPARTURE at Lempäälä and no DEPARTURE at Tampere (e.g. only ARRIVAL rows or wrong stations).

**Action:** In [src/utils/apiGraphql.integration.test.ts](src/utils/apiGraphql.integration.test.ts) (or a new unit test file for apiGraphql helpers), add a test that mocks a train with timeTableRows that have no valid departure at either station (e.g. only ARRIVAL at Lempäälä). After parsing, that train must not appear in the result (getDepartureAndDirection returns null → train skipped). Alternatively, if `getDepartureAndDirection` is not exported, test indirectly: provide a train with rows that yield no departure; assert the train is not in the fetched result.

**Lines 138, 147 — fetch error and GraphQL errors:**  

- 138: `if (!res.ok)` — fetch returns e.g. `{ ok: false, status: 500 }`.
- 147: `if (json.errors?.length)` — response has `errors: [{ message: "..." }]`.

**Action:** In the same integration test file:

- Mock `fetch` to return `{ ok: false }` (and optionally `res.status`), call `fetchRouteTodayGraphQL("2026-01-29")`, expect thrown Error with "GraphQL error".
- Mock `fetch` to return `ok: true` and `json: { errors: [{ message: "Server error" }] }`, call `fetchRouteTodayGraphQL("2026-01-29")`, expect thrown Error containing the message.

**Lines 191–198 — getRouteTodayFromStorage:**  
Branches: key missing (return null); key present but invalid JSON (catch → null); key present, valid JSON but missing `date` or `trains` (return null); valid payload (return payload).

**Action:** Add unit tests (e.g. in apiGraphql.integration.test.ts or a new apiGraphql.test.ts):

- Missing key: `localStorage.removeItem("train:route:today:2026-01-27")` → `getRouteTodayFromStorage("2026-01-27")` === null.
- Invalid JSON: `localStorage.setItem("train:route:today:2026-01-27", "not json")` → returns null.
- Invalid payload: set item to `JSON.stringify({})` or `JSON.stringify({ date: "2026-01-27" })` (no trains) → returns null.
- Valid payload: set item to `{ date: "2026-01-27", trains: [...] }` → returns that object.

**Lines 206–214 — getRouteWeekdayFromStorage:**  
Same pattern as getRouteTodayFromStorage: missing key, invalid JSON, invalid payload, valid payload.

**Action:** Same style tests for `train:route:weekday` key and `getRouteWeekdayFromStorage()`.

**Lines 224–250 — getRouteTrainsByDirection, filterReturnOptions:**  
These are pure functions; they may be covered indirectly via integration tests. If not covered:

- **getRouteTrainsByDirection:** Call with a list of `RouteTrainInfo[]` with both directions; assert outbound and return arrays are split and sorted by `scheduledDeparture`.
- **filterReturnOptions:** Call with return trains and a selected outbound departure time; assert only trains with `scheduledDeparture > selectedOutboundDeparture` are returned.

**Action:** Add direct unit tests in the same test file, importing `getRouteTrainsByDirection` and `filterReturnOptions`.

**Line 264 — runRouteFetchOnce early return:**  
When `localStorage.getItem("train:route:fetched") === today`, the function returns without fetching.

**Action:** Set `train:route:fetched` to today (use `getTodayFinnish()` with fake timers so "today" is fixed), then call `runRouteFetchOnce()`. Mock `fetch` and assert it was not called (or that the stored weekday data was not overwritten).

---

### 3. dateUtils.ts — Lines 98–109

**Uncovered:** `getDefaultDateRange()` and `isEndDateInFuture(endDate)`.

**Action:** In [src/utils/dateUtils.test.ts](src/utils/dateUtils.test.ts):

- **getDefaultDateRange:** Use fake timers (e.g. set "today" to a fixed date), call `getDefaultDateRange()`, assert `endDate` is that day and `startDate` is 13 days earlier (14 days including today).
- **isEndDateInFuture:** Call with endDate &gt; getTodayFinnish() → true; with endDate === today → false; with endDate &lt; today → false.

Import both functions in the test file if not already.

---

### 4. statsCalculator.ts — Line 55 (Branch)

**Uncovered:** In `computeSummary`, the branch `nonCancelledCount > 0 ? totalDelay / nonCancelledCount : 0` — when `nonCancelledCount === 0` (all records cancelled), `averageDelay` is 0.

**Action:** In [src/utils/statsCalculator.test.ts](src/utils/statsCalculator.test.ts), add a test: `computeSummary([createRecord({ status: "CANCELLED", cancelled: true }), createRecord({ status: "CANCELLED", cancelled: true, date: "2026-01-28" })])`. Assert `averageDelay === 0` and `totalCount === 2`, `cancelledCount === 2`. This hits the `0` branch.

---

### 5. SummaryCard.tsx — Line 74 (Branch)

**Uncovered:** The branch when `summary.totalCount === 0`: Progress.Section value is `0` (not `(summary.cancelledCount / summary.totalCount) * 100`).

**Action:** In [src/components/SummaryCard.test.tsx](src/components/SummaryCard.test.tsx), add a test that renders `SummaryCard` with a summary where `totalCount: 0` and e.g. `cancelledCount: 0`. Assert the component renders without error and (if possible) that the cancelled segment or progress is 0. This covers the ternary false branch (line 76 value 0).

---

## Implementation Order

1. **api.test.ts** — Add `getStationCodesByDirection` tests (both directions).
2. **dateUtils.test.ts** — Add `getDefaultDateRange` and `isEndDateInFuture` tests.
3. **statsCalculator.test.ts** — Add `computeSummary` with all records cancelled.
4. **SummaryCard.test.tsx** — Add test with `totalCount: 0`.
5. **apiGraphql** — Add tests for:
  - getDepartureAndDirection → null (indirect or direct),
  - fetchRouteTodayGraphQL error paths (res.ok false, json.errors),
  - getRouteTodayFromStorage (missing, invalid JSON, invalid payload, valid),
  - getRouteWeekdayFromStorage (same),
  - getRouteTrainsByDirection and filterReturnOptions (unit),
  - runRouteFetchOnce early return when already fetched today.

After implementation, run `pnpm test:coverage` and confirm uncovered line numbers are reduced or eliminated.