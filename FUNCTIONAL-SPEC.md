# Train Punctuality Tracker – Specification

## Overview

A React-based web application that tracks the punctuality of commuter trains between Lempäälä and Tampere, Finland. The application fetches historical train data from the Digitraffic API and displays statistics, visualizations, and detailed delay information for two specific daily commuter trains.

## User Story

As a daily commuter traveling between Lempäälä and Tampere, I want to track the punctuality of my regular trains over time so that I can understand how reliable my commute is and identify patterns in delays.

**Target trains:**
- **Morning train**: Lempäälä → Tampere, scheduled departure 8:20
- **Evening train**: Tampere → Lempäälä, scheduled departure 16:35

**Route for one-time background fetch:** The app performs a single GraphQL route search (see Local storage) that fetches trains whose route contains the station **Lempäälä** (by station name). The fetch uses a **reference weekday date** (today if Mon–Fri, else next Monday) so the list contains only **weekday trains**; weekend-only trains are not shown. Only trains that **stop at Lempäälä** (Digitraffic field `trainStopping` true at Lempäälä) are stored; trains that pass through Lempäälä without stopping are excluded. For each stored train, the **departure station** (Lempäälä or Tampere) is determined by which of the two has the **earlier** scheduled departure time on the route; this also defines the **direction** (Lempäälä → Tampere or Tampere → Lempäälä). Stored data includes train number, station name, scheduled departure time, and a **direction** (or equivalent) indicating which way the train runs. Both directions are stored (trains that stop at Lempäälä and depart from Lempäälä, or from Tampere toward Lempäälä). These data are used for the train selection dropdowns.

## Functional Requirements

### 1. Date Range Selection

- User can select a start date and end date for the analysis period.
- **Default range on first load:** Pre-fill with the last 14 **calendar** days (e.g. if today is 2026-01-30, default start = 2026-01-16, end = 2026-01-30). Only weekdays within that range are then used for fetching and statistics.
- **API call limit:** The app does not limit the date range by calendar days. Instead, before fetching, it **calculates how many API calls would be needed** for the selected range: for each weekday in the range (end not in future) and each train (1719, 9700), count 1 if that (date, trainNumber) is **not** satisfied from local storage (and always count 1 for today for each train). If this **needed API calls** count is **more than 30**, the app shows an error and **does not fetch**. If it is **30 or less**, the app fetches only the (date, trainNumber) pairs that actually need an API call (today or missing from storage).
- **Allowed range:** Any start/end with end not in future; the effective limit is that **needed API calls ≤ 30** (so a large range may be allowed if most data is already in local storage).
- **Weekdays only:** Only Monday–Friday are included in the analysis; weekend dates in the range are ignored.
- End date cannot be in the future.

### 1.5 Train selection (selects)

- **Outbound train:** One dropdown (select). Options = from the stored route data (see §6) those trains with direction **Lempäälä → Tampere** (only trains that stop at Lempäälä and have a departure time from Lempäälä). Options are ordered by scheduled departure time (earliest first). The user selects the outbound (morning) train to track.
- **Return train:** A second dropdown. Options = from the stored route data those trains with direction **Tampere → Lempäälä** (only trains that stop at Lempäälä, i.e. that the user can alight at Lempäälä). **Filtering:** the return-train list shows only trains whose **scheduled departure time is later** than the selected outbound train’s scheduled departure time (same day; compare using `scheduledDeparture`). Thus the return train always departs after the outbound train.
- **Data source:** Options are read from stored route data (localStorage key `train:route:weekday` (weekday trains only); typically use today’s date). Data is `RouteTrainInfo[]` (trainNumber, stationName, scheduledDeparture, direction).
- **Display format:** Each option is shown as **hh:mm (train number)**. Example: `08:20 (1719)`, `16:35 (9700)`. Time is derived from `scheduledDeparture` (ISO) in Finnish timezone, 24h format.
- **When route data is missing:** If no route data is available (e.g. first visit or fetch not yet run), use default train numbers 1719 (outbound) and 9700 (return) as today; the selects may be disabled or show "No route data" until data exists.

### 2. Summary and Timeline view

The first tab shows both summary statistics and day-by-day timelines in one scrollable panel.

**Summary cards:** Display two summary cards: the first for the **selected outbound train**, the second for the **selected return train**. Each card shows:

- **On-time percentage**: Percentage of trains with **≤1 min** delay. **Denominator:** all trains in the range for that train (including cancelled), so `onTimeCount / totalCount * 100`.
- **Slight delay percentage**: Trains with **2–5** minutes delay (same denominator).
- **Delayed percentage**: Trains with more than 5 minutes delay (same denominator).
- **Cancelled count**: Absolute number of cancelled trains.
- **Average delay**: Mean delay in minutes over **non-cancelled** trains only (cancelled trains are excluded from this average).
- **Visual bar**: Horizontal bar with segments proportional to on-time / slight delay / delayed / cancelled (same categories as above).

**Timelines:** Below the cards, a visual day-by-day representation where each day is shown as a colored cell:

| Color | Status |
|-------|--------|
| Green | On time (≤1 min delay) |
| Yellow | Slight delay (2–5 min) |
| Red | Delayed (>5 min) |
| Gray | Cancelled |

Cells should show the delay amount on hover or inside the cell. Display timelines for both the selected outbound train and the selected return train.

### 3. Detail Table View

A table showing all data points with columns:

| Column | Description |
|--------|-------------|
| Date | Finnish weekday abbreviation + day.month (e.g. "ma 27.1."). Abbreviations: ma (Mon), ti (Tue), ke (Wed), to (Thu), pe (Fri). |
| Train | Train type and number (e.g., "HL 1719", "HL 9700") |
| Scheduled | Scheduled departure time (Finnish local time, 24h) |
| Actual | Actual departure time in Finnish local time, or "-" if cancelled |
| Delay | Delay in minutes: "+N" if late, "0" or "0 min" if on time, "-" if cancelled |
| Status | Badge: On time / Slight delay / Delayed / Cancelled (use status colors per visual spec) |

- **Sortable:** At least the Date column must be sortable; others optional. **Default sort:** newest first (date descending).
- **Layout:** Either one combined table with a Train column, or two separate table sections (selected outbound train, selected return train) as in the visual spec wireframes.

### 4. Data Fetching

- When the user clicks "Fetch", the trains to fetch are the **selected outbound** and **selected return** train numbers (from the two selects). Compute **needed API calls** from the selected date range and current local storage: for each weekday in range (end not in future) and each of these two train numbers, count 1 if that (date, trainNumber) is not in storage or is today. If **needed API calls > 30**, show an error message and **do not perform any API requests**. If **needed API calls ≤ 30**, proceed to fetch only for (date, trainNumber) that require an API call (today or not in storage).
- Fetch data for each (date, trainNumber) that needs it by calling the API with the specific train number.
- Show a loading indicator during fetch.
- Handle errors gracefully (network errors, missing data).
- For dates where no data is returned, skip silently (train may not run on that date).

### 5. Local Storage (caching)

- The app may perform a one-time background fetch of today’s route trains and store them locally; no user action is required and this does not change the main "Fetch Data" flow. This fetch uses a **single** GraphQL query filtered by **station name** "Lempäälä" (trains whose route contains Lempäälä). Only trains that **stop at Lempäälä** (Digitraffic `trainStopping` true at Lempäälä) are stored; trains that pass through Lempäälä without stopping are excluded. For each stored train, the departure station (Lempäälä or Tampere asema) is derived by comparing the two DEPARTURE times and taking the **earlier** one as the train’s departure on this route; the stored record includes train number, station name, scheduled departure time, and a **direction** (or equivalent) indicating whether the train runs Lempäälä → Tampere or Tampere → Lempäälä. Both directions are stored. These data are used for the train selection dropdowns.
- **Store** fetched train data in the browser’s local storage, keyed by date and train number.
- **Do not store** data for the current date (today); today’s data is never written to local storage.
- **Use stored data** when the user requests data for a given date and train: if a valid entry exists in local storage for that date and train, use it and do not call the API.
- **Always call the API** for the current date: when the requested date is today, never read from local storage; always fetch from the Digitraffic API.
- For any other date, call the API only if there is no (or no valid) data in local storage for that date and train; after a successful API response, persist the result to local storage.

## Data Model

### Internal Train Record

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

### Status Classification Logic

```
if (cancelled) → CANCELLED
else if (delayMinutes <= 1) → ON_TIME
else if (delayMinutes <= 5) → SLIGHT_DELAY
else → DELAYED
```

### Train Configuration

```typescript
const TRAINS = {
  morning: {
    number: 1719,
    name: "Morning train",
    from: "LPÄ",
    to: "TPE",
    scheduledTime: "8:20",
    direction: "Lempäälä → Tampere"
  },
  evening: {
    number: 9700,
    name: "Evening train",
    from: "TPE",
    to: "LPÄ",
    scheduledTime: "16:35",
    direction: "Tampere → Lempäälä"
  }
};
```

The app supports **either** fixed train numbers (1719, 9700) **or** user-selected trains from the route data. When route data exists, the two selects (Outbound train, Return train) supply the train numbers used for Fetch, Summary, and Table; default selection is 1719 (outbound) and 9700 (return) when those trains appear in the options, otherwise the first option in each list. When route data is missing, defaults 1719 (outbound) and 9700 (return) are used. The one-time GraphQL route fetch (see §5) uses a single query (trains containing Lempäälä) and stores only trains that **stop at Lempäälä** (trainStopping true at Lempäälä); both directions are included. Each stored record includes a direction field derived from which departure time is earlier.

### Route data (one-time fetch)

Stored route items (e.g. `RouteTrainInfo`) include at least: **train number**, **station name** (departure station), **scheduled departure time** (ISO), and a **direction** (or equivalent) indicating which way the train runs on the Lempäälä–Tampere route (e.g. `"Lempäälä → Tampere"` or `"Tampere → Lempäälä"`, or a departure-station field from which direction can be derived). The direction is derived from which of the two DEPARTURE times (Lempäälä vs Tampere asema) is earlier.

## User interface

- **Header:** Title "🚂 Commute Punctuality", subtitle "Lempäälä ↔ Tampere" (use this exact wording).
- **Single-page:** header, date range picker, **two selects** (Outbound train, Return train) with options in format hh:mm (train number), a “Fetch” button, **tab navigation** (Summary | Table), and a content area that shows one of the two views. Data is fetched only when the user clicks Fetch (no automatic fetch on load). Footer text: "Data: Digitraffic / Fintraffic • Weekdays only".
- **Summary**: Two cards (selected outbound train, selected return train) with statistics and a proportion bar, plus day-by-day colored timelines for both trains. Headings use the selected train's departure time and number, e.g. "08:20 (1719) – Lempäälä → Tampere".
- **Table**: Sortable list of all records for the two selected trains.
- **Loading and errors**: A loading indicator while data is fetched; an error message if the API fails; an empty state if no data for the range.
- **Visual design** (layout, components, colors, responsive behaviour) is defined in [VISUAL-SPEC.md](VISUAL-SPEC.md).

## Acceptance Criteria

1. **Date selection works correctly**: Selecting a date range and clicking "Fetch" retrieves data for weekdays only within that range. The allowed range is constrained by the "needed API calls ≤ 30" rule (not by a fixed number of calendar days).

2. **API integration is correct**: The app calls the Digitraffic API with the train numbers from the two selects (or defaults 1719, 9700 when no route data) and correctly parses the departure times from the appropriate `timeTableRows` entries.

3. **Statistics are accurate**: On-time percentage is calculated as `(onTimeCount / totalCount) * 100` where `totalCount` is all trains in the range for that train (including cancelled). A train is "on time" if **delayMinutes ≤ 1**. Average delay excludes cancelled trains.

4. **Loading state is shown**: A spinner or loading text appears while data is being fetched.

5. **Errors are handled**: If the API fails or returns no data, an appropriate message is shown and the user can retry (e.g. a Retry button).

6. **Mobile responsive**: The layout adapts to smaller screens without horizontal scrolling.

7. **Times are displayed in Finnish timezone**: All times shown to the user should be in local Finnish time, not UTC.

8. **Local storage caching**: Fetched data for past dates is stored in browser local storage and reused when the same date and train is requested again (no API call). Data for the current date is never stored; the API is always called for today's trains.

9. **API call limit**: When the user selects a date range and clicks "Fetch", the app computes the number of needed API calls (using data in local storage). If that number is greater than 30, an error is shown and no API calls are made. If it is 30 or less, data is fetched only for the (date, trainNumber) pairs that are not in storage or are today.

10. **Train selection**: The user can choose the outbound and return train from the two dropdowns. Options are shown as **hh:mm (train number)**. The return-train list shows only trains that depart **later** than the selected outbound train.

## Out of scope (for initial version)

- User authentication
- Saving/exporting data
- Push notifications
- Comparison with other routes
- Weekend trains
- Real-time current train status

---

**Related specs:** API details, project structure, and example API calls are in [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md). Visual layout and components are in [VISUAL-SPEC.md](VISUAL-SPEC.md).
