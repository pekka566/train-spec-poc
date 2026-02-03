# Train Punctuality Tracker – Specification

## Overview

A React-based web application that tracks the punctuality of commuter trains between Lempäälä and Tampere, Finland. The application fetches historical train data from the Digitraffic API and displays statistics, visualizations, and detailed delay information for two specific daily commuter trains.

## User Story

As a daily commuter traveling between Lempäälä and Tampere, I want to track the punctuality of my regular trains over time so that I can understand how reliable my commute is and identify patterns in delays.

**Target trains:**
- **Morning train**: Lempäälä → Tampere, scheduled departure 8:20
- **Evening train**: Tampere → Lempäälä, scheduled departure 16:35

## Functional Requirements

### 1. Date Range Selection

- User can select a start date and end date for the analysis period.
- **Default range on first load:** Pre-fill with the last 14 **calendar** days (e.g. if today is 2026-01-30, default start = 2026-01-16, end = 2026-01-30). Only weekdays within that range are then used for fetching and statistics.
- **API call limit:** The app does not limit the date range by calendar days. Instead, before fetching, it **calculates how many API calls would be needed** for the selected range: for each weekday in the range (end not in future) and each train (1719, 9700), count 1 if that (date, trainNumber) is **not** satisfied from local storage (and always count 1 for today for each train). If this **needed API calls** count is **more than 30**, the app shows an error and **does not fetch**. If it is **30 or less**, the app fetches only the (date, trainNumber) pairs that actually need an API call (today or missing from storage).
- **Allowed range:** Any start/end with end not in future; the effective limit is that **needed API calls ≤ 30** (so a large range may be allowed if most data is already in local storage).
- **Weekdays only:** Only Monday–Friday are included in the analysis; weekend dates in the range are ignored.
- End date cannot be in the future.

### 2. Summary View

Display two summary cards (one for each train) showing:

- **On-time percentage**: Percentage of trains with ≤0 min delay. **Denominator:** all trains in the range for that train (including cancelled), so `onTimeCount / totalCount * 100`.
- **Slight delay percentage**: Trains with 1–5 minutes delay (same denominator).
- **Delayed percentage**: Trains with more than 5 minutes delay (same denominator).
- **Cancelled count**: Absolute number of cancelled trains.
- **Average delay**: Mean delay in minutes over **non-cancelled** trains only (cancelled trains are excluded from this average).
- **Visual bar**: Horizontal bar with segments proportional to on-time / slight delay / delayed / cancelled (same categories as above).

### 3. Timeline View

A visual day-by-day representation where each day is shown as a colored cell:

| Color | Status |
|-------|--------|
| Green | On time (≤0 min delay) |
| Yellow | Slight delay (1–5 min) |
| Red | Delayed (>5 min) |
| Gray | Cancelled |

Cells should show the delay amount on hover or inside the cell. Display both trains' timelines.

### 4. Detail Table View

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
- **Layout:** Either one combined table with a Train column, or two separate table sections (Morning train, Evening train) as in the visual spec wireframes.

### 5. Data Fetching

- When the user clicks "Fetch", first compute **needed API calls** from the selected date range and current local storage (as in section 1): for each weekday in range (end not in future) and each train, count 1 if that (date, trainNumber) is not in storage or is today. If **needed API calls > 30**, show an error message and **do not perform any API requests**. If **needed API calls ≤ 30**, proceed to fetch only for (date, trainNumber) that require an API call (today or not in storage).
- Fetch data for each (date, trainNumber) that needs it by calling the API with the specific train number.
- Show a loading indicator during fetch.
- Handle errors gracefully (network errors, missing data).
- For dates where no data is returned, skip silently (train may not run on that date).

### 6. Local Storage (caching)

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
else if (delayMinutes <= 0) → ON_TIME
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

## User interface

- **Header:** Title "🚂 Commute Punctuality", subtitle "Lempäälä ↔ Tampere" (use this exact wording).
- **Single-page:** header, date range picker with a “Fetch” button, **tab navigation** (Summary | Timeline | Table), and a content area that shows one of the three views. Data is fetched only when the user clicks Fetch (no automatic fetch on load). Footer text: "Data: Digitraffic / Fintraffic • Weekdays only".
- **Summary**: Two cards (morning and evening train) with statistics and a proportion bar.
- **Timeline**: Day-by-day colored cells per train.
- **Table**: Sortable list of all records.
- **Loading and errors**: A loading indicator while data is fetched; an error message if the API fails; an empty state if no data for the range.
- **Visual design** (layout, components, colors, responsive behaviour) is defined in [VISUAL-SPEC.md](VISUAL-SPEC.md).

## Acceptance Criteria

1. **Date selection works correctly**: Selecting a date range and clicking "Fetch" retrieves data for weekdays only within that range. The allowed range is constrained by the "needed API calls ≤ 30" rule (not by a fixed number of calendar days).

2. **API integration is correct**: The app calls the Digitraffic API with the correct train numbers (1719, 9700) and correctly parses the departure times from the appropriate `timeTableRows` entries.

3. **Statistics are accurate**: On-time percentage is calculated as `(onTimeCount / totalCount) * 100` where `totalCount` is all trains in the range for that train (including cancelled). A train is "on time" if `differenceInMinutes <= 0`. Average delay excludes cancelled trains.

4. **Loading state is shown**: A spinner or loading text appears while data is being fetched.

5. **Errors are handled**: If the API fails or returns no data, an appropriate message is shown and the user can retry (e.g. a Retry button).

6. **Mobile responsive**: The layout adapts to smaller screens without horizontal scrolling.

7. **Times are displayed in Finnish timezone**: All times shown to the user should be in local Finnish time, not UTC.

8. **Local storage caching**: Fetched data for past dates is stored in browser local storage and reused when the same date and train is requested again (no API call). Data for the current date is never stored; the API is always called for today's trains.

9. **API call limit**: When the user selects a date range and clicks "Fetch", the app computes the number of needed API calls (using data in local storage). If that number is greater than 30, an error is shown and no API calls are made. If it is 30 or less, data is fetched only for the (date, trainNumber) pairs that are not in storage or are today.

## Out of scope (for initial version)

- User authentication
- Saving/exporting data
- Push notifications
- Comparison with other routes
- Weekend trains
- Real-time current train status

---

**Related specs:** API details, project structure, and example API calls are in [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md). Visual layout and components are in [VISUAL-SPEC.md](VISUAL-SPEC.md).
