# Train Punctuality Tracker – Visual Specification

This document defines the **visual design** of the application: layout, components, colors, and responsive behaviour. Functional and data requirements are in the [functional specification](FUNCTIONAL-SPEC.md); implementation details are in the [technical specification](TECHNICAL-SPEC.md). Route data (train number, station name, departure time) is fetched in the background and used for **train selection**: the user chooses an outbound and a return train via two dropdowns; those selections drive all data fetch and display.

---

## Design principles

- **Clean, modern** single-page layout; no clutter.
- **Mantine** as the UI library: use its components and theme tokens for consistency.
- **Responsive**: Primary breakpoint for "mobile" layout: **768px** (stack cards, stack or shorten date row, horizontal scroll for table/timeline). No horizontal scroll of the entire page.

---

## Visual Wireframes

### Overall Layout Structure

**Train selection (two dropdowns):**
- **Outbound train:** Label "Outbound train"; options shown as **hh:mm (train number)** (e.g. 08:20 (1719)). Options from route data: only trains that **stop at Lempäälä**, direction Lempäälä → Tampere, sorted by departure time.
- **Return train:** Label "Return train"; same format hh:mm (train number). Options from route data: only trains that **stop at Lempäälä**, direction Tampere → Lempäälä; **list is filtered** so only trains with departure time **after** the selected outbound are shown.
- **Placement:** Same row as Start date, End date, and Fetch Data, or on a second row below. Order: Start date, End date, Outbound train, Return train, Fetch Data.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                 Commute Punctuality                             │
│                  Lempäälä - Tampere                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│   │ Start date  │ │  End date   │ │ Outbound train   │ │ Return train     │ │ 🔍 Fetch Data   │
│   │ 2026-01-15  │ │ 2026-01-29  │ │ 08:20 (1719)  ▼  │ │ 16:35 (9700)  ▼  │ │                 │
│   └─────────────┘ └─────────────┘ └──────────────────┘ └──────────────────┘ └─────────────────┘
│   Outbound options: hh:mm (train number), Lempäälä → Tampere (trains that stop at Lempäälä only).
│   Return options: same format, Tampere → Lempäälä (trains that stop at Lempäälä); return list
│   filtered to trains departing after the selected outbound.
│   (App may show "too many API calls" error if range would require more than 30 API calls.)   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌────────────────┐ ┌────────────────┐                          │
│   │  📊 Summary    │ │  📋 Table      │                          │
│   └────────────────┘ └────────────────┘                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    [ CONTENT AREA ]                             │
│                                                                 │
│              (changes based on selected tab)                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         Data: Digitraffic / Fintraffic - Weekdays only          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Summary and Timeline view (default tab)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  08:20 (1719) – Lempäälä → Tampere    16:35 (9700) – Tampere → Lempäälä
│                                                                 │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │  ┌───────────┬───────────┐  │ │  ┌───────────┬───────────┐  ││
│  │  │    92%    │   1.2     │  │ │  │    87%    │   2.4     │  ││
│  │  │  On Time  │  Avg Delay│  │ │  │  On Time  │  Avg Delay│  ││
│  │  │           │   (min)   │  │ │  │           │   (min)   │  ││
│  │  ├───────────┼───────────┤  │ │  ├───────────┼───────────┤  ││
│  │  │  11 / 12  │     0     │  │ │  │  10 / 12  │     1     │  ││
│  │  │  On Time  │ Cancelled │  │ │  │  On Time  │ Cancelled │  ││
│  │  └───────────┴───────────┘  │ │  └───────────┴───────────┘  ││
│  │                             │ │                             ││
│  │  ████████████░░░░           │ │  ██████████░░░░░░           ││
│  │  🟢 On time  🟡 2-5m  🔴 >5m│ │  🟢 On time  🟡 2-5m  🔴 >5m││
│  │                             │ │                             ││
│  │  (lime-0 background)        │ │  (cyan-0 background)        ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ ┌──┐┌──┐┌──┐┌──┐ ...        │ │ ┌──┐┌──┐┌──┐┌──┐ ...        ││
│  │ Legend: 🟢 🟡 🔴 ⬜         │ │ Legend: 🟢 🟡 🔴 ⬜         ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

**Layout:** On desktop (md and up) the Summary tab uses a **single two-column SimpleGrid** (`cols={{ base: 1, md: 2 }}`, `spacing="lg"`). Each column is a Stack containing: a **section title** (`Title order={2} size="h4"`), then the SummaryCard (with `hideTitle`), then the Timeline (with `hideTitle`). This groups each train's visuals in one column. On mobile (base) columns stack (order: outbound section, then return section).

Section title: One line combining departure time and number with direction (e.g. "08:20 (1719) – Lempäälä → Tampere"). SummaryCard and Timeline use `hideTitle` prop to avoid duplicating it.
Card content: First column = selected outbound train; second column = selected return train. Replace placeholder times/numbers with the user's dropdown choices.
Card color coding:
- First (outbound) card: Light lime background (`var(--mantine-color-lime-0)`)
- Second (return) card: Light cyan background (`var(--mantine-color-cyan-0)`)
- Stats boxes: White background with `border-radius: var(--mantine-radius-sm)`
- Stats layout: 2×2 SimpleGrid showing On Time %, Avg Delay, On Time count/total, Cancelled count
- Progress bar: Mantine `Progress.Root` with 4 sections (on-time green, slight yellow, delayed red, cancelled gray)
- Legend: Shared `StatusLegend` component below progress bar

Each timeline: row of colored button cells (44×44px), sorted oldest-to-newest (left to right), wrapped in a Mantine `Group` with `wrap="wrap"`. Each cell shows:
- Delay value ("+N" or "0") and day-of-month below; "X" for cancelled
- Tooltip on hover: Finnish date + status text (e.g. "ma 27.1.: On time" or "ti 28.1.: +3 min delay")
- Shared `StatusLegend` component below cells
```

### Table View (second tab)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Outbound: 08:20 (1719) – Lempäälä → Tampere                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Date      │ Train    │ Scheduled │ Actual  │ Delay │Status ││
│  ├────────────┼──────────┼───────────┼─────────┼───────┼───────┤│
│  │  ti 28.1.  │ HL 1719  │   08:20   │  08:23  │ +3min │ 🟡    ││
│  │  ma 27.1.  │ HL 1719  │   08:20   │  08:20  │  0min │ 🟢    ││
│  │  pe 24.1.  │ HL 1719  │   08:20   │  08:21  │ +1min │ 🟢    ││
│  │  to 23.1.  │ HL 1719  │   08:20   │  08:20  │  0min │ 🟢    ││
│  │  ke 22.1.  │ HL 1719  │   08:20   │  08:20  │  0min │ 🟢    ││
│  │  ti 21.1.  │ HL 1719  │   08:20   │  08:20  │  0min │ 🟢    ││
│  │  ma 20.1.  │ HL 1719  │   08:20   │  08:28  │ +8min │ 🔴    ││
│  │  pe 17.1.  │ HL 1719  │   08:20   │  08:20  │  0min │ 🟢    ││
│  │     ...    │   ...    │    ...    │   ...   │  ...  │ ...   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Return: 16:35 (9700) – Tampere → Lempäälä                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Date      │ Train    │ Scheduled │ Actual  │ Delay │Status ││
│  ├────────────┼──────────┼───────────┼─────────┼───────┼───────┤│
│  │  ti 28.1.  │ HL 9700  │   16:35   │  16:35  │  0min │ 🟢    ││
│  │  ma 27.1.  │ HL 9700  │   16:35   │  16:36  │ +1min │ 🟢    ││
│  │  pe 24.1.  │ HL 9700  │   16:35   │  16:35  │  0min │ 🟢    ││
│  │  to 23.1.  │ HL 9700  │   16:35   │  16:35  │  0min │ 🟢    ││
│  │  ke 22.1.  │ HL 9700  │   16:35   │  16:41  │ +6min │ 🔴    ││
│  │  ti 21.1.  │ HL 9700  │   16:35   │  16:35  │  0min │ 🟢    ││
│  │  ma 20.1.  │ HL 9700  │   16:35   │  16:37  │ +2min │ 🟡    ││
│  │  pe 17.1.  │ HL 9700  │   16:35   │    -    │   -   │ ⬜    ││
│  │     ...    │   ...    │    ...    │   ...   │  ...  │ ...   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Table features:
- Two separate Card sections (each with `shadow="sm"`, `withBorder`): first = selected outbound train, second = selected return train. Each has a `Title order={2} size="h4"` header showing selected time and number (e.g. "08:20 (1719) – Lempäälä → Tampere").
- Default sort: newest first (descending by date). Date column is sortable (toggles asc/desc); shows sort indicator text "(ascending ^)" / "(descending v)". Other columns not sortable.
- Mantine `Table` with `striped` and `highlightOnHover` for readability, wrapped in `ScrollArea` for horizontal scroll on mobile.
- Status column: Mantine `Badge` with `variant="filled"` and status color (green / yellow / red / gray).
- Cancelled: Actual and Delay columns show "-".
- Delay column: text color matches the record's status color (green for ON_TIME, yellow for SLIGHT_DELAY, red for DELAYED). Format: "+Nmin" for positive delay, "0min" for on time. `fw={500}` for emphasis.
- Time format: 24h, Finnish local (e.g. 08:20). Train column: "{trainType} {trainNumber}" (e.g. "HL 1719").
```

### Mobile Layout (< 768px)

```
┌───────────────────────────┐
│                           │
│  Commute Punctuality        │
│   Lempäälä - Tampere        │
│                           │
├───────────────────────────┤
│ ┌───────────────────────┐ │
│ │ Start    │ End        │ │
│ │ 2026-01-15│ 2026-01-29│ │
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ Outbound train 08:20 (1719)▼│
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ Return train 16:35 (9700)▼│
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │     🔍 Fetch Data     │ │
│ └───────────────────────┘ │
├───────────────────────────┤
│ [📊 Summary] [📋 Table]   │
├───────────────────────────┤
│ ┌───────────────────────┐ │
│ │ ░░░ MORNING 8:20 ░░░  │ │
│ │ Lempäälä → Tampere    │ │
│ │                       │ │
│ │ ┌─────────┬─────────┐ │ │
│ │ │   92%   │  1.2    │ │ │
│ │ │ On Time │Avg Delay│ │ │
│ │ └─────────┴─────────┘ │ │
│ │ ████████████░░░░      │ │
│ └───────────────────────┘ │
│                           │
│ ┌───────────────────────┐ │
│ │ ░░░ EVENING 16:35 ░░░ │ │
│ │ Tampere → Lempäälä    │ │
│ │                       │ │
│ │ ┌─────────┬─────────┐ │ │
│ │ │   87%   │  2.4    │ │ │
│ │ │ On Time │Avg Delay│ │ │
│ │ └─────────┴─────────┘ │ │
│ │ ██████████░░░░░░      │ │
│ └───────────────────────┘ │
│                           │
├───────────────────────────┤
│ Data: Digitraffic /       │
│ Fintraffic - Weekdays only │
└───────────────────────────┘

Mobile adaptations:
- Summary tab: the two-column SimpleGrid collapses to a single column — outbound section (title + card + timeline) stacks above return section
- Date inputs on same row (flex wrap); train selects wrap below; fetch button at end
- Tab labels: Summary, Table (with icons: chart bar, table)
- Table becomes horizontally scrollable via Mantine `ScrollArea`
- Timeline cells wrap to multiple rows within each timeline card (Group with `wrap="wrap"`)
```

### Loading State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        ⟳ (spinner)                              │
│                     Fetching data...                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

A centered Mantine `Loader` (size="lg") with "Fetching data..." text below. No progress bar or day count — the spinner shows until all queries complete. The container has `role="status"` and `aria-live="polite"` for accessibility.

### Error State

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     ⚠️  Error                                   │
│                                                                 │
│           Failed to fetch data from Digitraffic API.            │
│           Please check your connection and try again.           │
│                                                                 │
│                    [ 🔄 Retry ]                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Too many API calls (validation error)

When the selected date range would require more than 30 API calls (based on what is already in local storage), two things happen:

1. **Inline error below DateRangePicker:** Red text (`role="alert"`) showing "Would require {N} API calls. Maximum is 30." The Fetch Data button is disabled.
2. **Content area alert (after clicking Fetch while over limit):** A Mantine `Alert` (color orange, variant light) with title "Too many API calls" showing the full message: "This date range would require more than 30 API calls. Please narrow the range or use already cached data." with the count below.

- **Behaviour:** No loading spinner; no API calls are made. User can change the date range and click Fetch again.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     ⚠️  Too many API calls                      │
│                                                                 │
│     This date range would require more than 30 API calls.       │
│     Please narrow the range or use already cached data.         │
│     (Would require 42 API calls. Maximum is 30.)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Initial State (before first fetch)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│     Select a date range and click "Fetch Data" to load          │
│     train data.                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Shown in the content area before the user has clicked Fetch Data. Centered dimmed text with `role="status"` and `aria-live="polite"`.

### Empty State (after fetch, no results)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     📭  No data                                 │
│                                                                 │
│        No train data found for the selected date range.         │
│        Try selecting a different period.                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Shown when fetch completes but returns zero records. Centered with inbox icon, dimmed text, `role="status"` and `aria-live="polite"`.

### No route data (train selects)

When route data is not available (e.g. first visit or route fetch has not run), the train selection dropdowns are **disabled** and show the placeholder text **"No route data"**. The app uses default train numbers (1719 outbound, 9700 return) for Fetch and all views until route data exists; then the selects are populated from `train:route:weekday` and the user can choose trains. When route data exists, default selection is 1719 (outbound) and 9700 (return) when those trains appear in the options, otherwise the first option in each list.

---

## Color scheme (Mantine)

Use these theme tokens consistently for status and train cards:

| Use | Mantine token |
| --- | -------------- |
| On time (≤1 min) | `green.5` |
| Slight delay (2–5 min) | `yellow.5` |
| Delayed (>5 min) | `red.5` |
| Cancelled | `gray.6` |
| Outbound (morning) card | Light lime background (`lime.0`) |
| Return (evening) card | Light cyan background (`cyan.0`) |

**Implementation (CSS variables):** Mantine exposes colors as CSS variables with a **hyphen** between color name and shade. In code, use `var(--mantine-color-{name}-{shade})`, e.g. `var(--mantine-color-green-5)`, `var(--mantine-color-yellow-5)`, `var(--mantine-color-red-5)`, `var(--mantine-color-gray-6)`. Using a dot (e.g. `green.5`) in the variable name will not resolve and cells will render without background color.

---

## Reference

- **Functional spec**: [FUNCTIONAL-SPEC.md](FUNCTIONAL-SPEC.md) — behaviour, data model, acceptance criteria.
- **Technical spec**: [TECHNICAL-SPEC.md](TECHNICAL-SPEC.md) — stack, API, storage, deployment.
