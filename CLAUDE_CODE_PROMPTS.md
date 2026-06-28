# Claude Code prompts — bring the app up to the new quoting rules

These prompts add the rules we worked out (documented in `QUOTE_RULES.md`) to the actual
app. Paste them into Claude Code **one at a time, in order**, and review/commit each before
moving on. Start with Prompt 0.

Key files you'll be touching:
- `src/data/services.ts` — pricing and config constants
- `src/types.ts` — type definitions
- `src/utils/quoteCalculator.ts` — all calculation logic
- `src/components/MakeupServiceForm.tsx`, `HairServiceForm.tsx` — per-day inputs
- `src/components/PriceConfirmationForm.tsx` — pricing/IVA step
- `src/components/QuoteResultForm.tsx` — on-screen + copy + PDF rendering

---

## Prompt 0 — Context

> Read `QUOTE_RULES.md` in the repo root, then read `src/utils/quoteCalculator.ts`,
> `src/data/services.ts`, and `src/types.ts`. I'm going to ask you to implement several new
> quoting rules from `QUOTE_RULES.md` that aren't in the code yet: (1) naming the travel
> destination on the travel line, (2) a multi-day overnight travel discount, (3) a minimum-
> guests-by-distance rule, (4) an optional IVA line, and (5) day labelling for pre-wedding
> event days. Don't change anything yet — just confirm you understand the current
> `calculateMakeupService`, `calculateHairService`, and `calculateAgneFlatRate` flow and
> where per-day travel lines are built (around lines 210–240, 377–407, 562–592).

---

## Prompt 1 — Name the travel destination on the travel-fee line

> In `quoteCalculator.ts`, the travel line label is hard-coded as `'Travelling fee (cars)'`
> in three places (makeup ~line 221, hair ~388, Agne ~573). Add an optional `beautyVenue`/
> location to the label so it reads `Travelling fee (cars) to <location>` when a location is
> known for that day.
>
> The per-day objects already carry `beautyVenue` (see `MakeupDayDetails`/`HairDayDetails`
> in `types.ts`). Use `day.beautyVenue` as the destination. If it's empty, keep the current
> `'Travelling fee (cars)'` with no suffix. Apply it in all three functions. Don't change
> totals — label only. Build and confirm no type errors.

---

## Prompt 2 — Multi-day overnight travel discount

> Implement the overnight travel rule from `QUOTE_RULES.md` §3a. When the bridal team stays
> over rather than driving back, only one day carries the full travel fee and adjacent days
> are billed a flat €200.
>
> Rule: within `calculateMakeupService`, `calculateHairService`, and `calculateAgneFlatRate`
> (which all iterate `weddingDates`), compute an **effective travel fee per day** before
> building the travel lines:
> - Consider only days whose own `day.travelFee > 150`.
> - Group days that are **calendar-adjacent** (consecutive dates in `weddingDates`; parse
>   the ISO date strings, a gap of exactly 1 day = adjacent).
> - Within each adjacent run, the **first day keeps its full `travelFee`**; every **later
>   day in the run is charged €200** instead.
> - Days with `travelFee <= 150`, or days not adjacent to another travel day, keep their
>   full fee.
> Use the effective fee for both the "Travelling fee (cars)" line and the 35% assistant
> travel calc. When a day is on the €200 overnight rate, append `— overnight rate` to its
> travel label (after the destination from Prompt 1).
>
> Add a constant `OVERNIGHT_TRAVEL_FEE = 200` and `OVERNIGHT_TRAVEL_THRESHOLD = 150` in
> `services.ts`. Add a unit-style check (or extend `DebugPanel.tsx`) proving: 3 adjacent
> days at €490 → 490 + 200 + 200; the same 3 days but non-adjacent → 490 + 490 + 490; a
> €120 fee stays €120 every day.

---

## Prompt 3 — Minimum guests by distance (travel-fee bands)

> Implement the minimum-guests rule from `QUOTE_RULES.md` §6a.
>
> **3a. Config** — in `services.ts`, add a structure giving each artist their minimum guest
> count for Band A and Band B, exactly per the table in §6a:
> - Make-up: all artists 3/2 **except Sara** which is 3/3.
> - Hair: Agne, Eric, Joana, Oksana, Olga H = 3/2; Andreia = 4/2; Lília = 4/3.
> Also add the band thresholds: make-up `>99 → A, >25 → B, else none`; hair
> `>99 → A, >9 → B, else none`. Add a helper `getMinimumGuests(service, artist, fullTravelFee)`
> returning the required number (0 if none). "Full travel fee" = the **maximum** `travelFee`
> across that service's days (the real round-trip fee, before the Prompt 2 overnight discount).
>
> **3b. Behaviour** in `quoteCalculator.ts`:
> - If the client **specified** guests, leave guest lines as-is and add an auto Priority
>   warning (like the deposit warnings in `generatePriorityWarnings`) with the text:
>   "For this location, due to its distance, this artist requires the minimum of N guests
>   under their care (not including the bride), or equivalent payment."
> - If guests are **not specified** for the main wedding day and a minimum applies, add a
>   Guests line on the main day for the minimum count (`N × guestUnit`) with the label
>   `Guests (minimum number of guests for this location)`, and do **not** also add the
>   Priority warning for that service. "Main wedding day" = day index 0 (the app's "Wedding
>   Day"); make this a small helper so it's easy to change later.
> Render the new label correctly on-screen, in copy/paste, and in the PDF in
> `QuoteResultForm.tsx` (it should flow through automatically since it's just a line label).

---

## Prompt 4 — Optional IVA (23%) line

> Add an optional IVA line to the totals, per `QUOTE_RULES.md`. Many quotes need "+23% IVA".
>
> - In `types.ts`, extend `GrandSummary` with optional `ivaRate?: number`, `ivaAmount?: number`,
>   and `totalInclIva?: number`; and add an app-level setting `ivaEnabled: boolean` /
>   `ivaRate: number` (default 0.23) to `AppState`.
> - Add an IVA toggle in `PriceConfirmationForm.tsx` (default off, 23% when on).
> - In `calculateGrandSummary` (quoteCalculator.ts ~line 627), when IVA is enabled compute
>   `ivaAmount = grandTotal * ivaRate` and `totalInclIva = grandTotal + ivaAmount`.
> - In `QuoteResultForm.tsx`, when IVA is enabled, render a "Subtotal (excl. IVA)",
>   "IVA (23%)", and "TOTAL (incl. IVA)" set of rows in the Grand Summary in all three
>   outputs (on-screen ~line 1852, copy HTML ~494, plain text ~643, and the jsPDF block
>   ~951). When off, behaviour is unchanged.

---

## Prompt 5 — Day labelling for pre-wedding event days

> Small clarity fix from `QUOTE_RULES.md` §7. Today the per-day header is `'Wedding Day'`
> for index 0 and `Day N` otherwise (`MakeupServiceForm.tsx`/`HairServiceForm.tsx` ~line
> 266/274). Add an optional free-text **day label** per day (e.g. "Pre-wedding event",
> "Closing dinner") that the user can set, defaulting to the current scheme. When a label is
> set, render the day as `Day N (<label>)`. Make sure the trial section stays titled
> `PRE-WEDDING` and is never confused with an event day called `Day 1 (Pre-wedding event)`.
> Carry the label through to `QuoteResultForm.tsx` day headers (on-screen, copy, and PDF).

---

## Prompt 6 — Verify end to end

> Run the build and the app. Recreate the test case from `QUOTE_RULES.md`: bride + Miguel
> (make-up) and Andreia (hair), 3 adjacent days 11–13 May 2027, travel €490 to one location,
> 1 trial each, guests unspecified, IVA on. Confirm: travel shows 490 / 200 / 200 with
> "to <location>" and "— overnight rate"; minimum guests appear on the wedding day (Miguel 3,
> Andreia 4) with the "(minimum number of guests for this location)" label; the Grand Summary
> shows subtotal €4,465, IVA €1,026.95, total €5,491.95. Fix any discrepancies.
