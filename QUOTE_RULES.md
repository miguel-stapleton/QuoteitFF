# Fresh Faced — Hair & Makeup Quoting Rules

This document captures **every rule** the Quote-it app uses to build a wedding hair &
makeup quote. Claude uses this as the single source of truth: when Miguel pastes an
enquiry email, Claude extracts the details, applies these rules, and produces a quote in
the same structure the app outputs. All prices are in **euros (€)**.

---

## 1. The shape of a quote

A quote covers one or both services — **Make-up** and/or **Hair** — for one **bride**
across **1–4 wedding/celebration days**. Each service is priced independently and gets
its own block. If both services are present, a combined **Grand Summary** is added.

Information needed to build a quote:

- Bride's name
- Service(s): make-up, hair, or both
- The artist chosen for each service (see pricing tables)
- Number of celebration days and their dates
- Per day: number of guests, travel fee, number of people in the team, number of cars,
  scheduled return details, exclusivity, touch-up hours, beauty venue
- Pre-wedding: number of trials and any trial travel fee

If something is missing from the email, ask or assume the sensible default (guests 0,
1 person/1 car, no travel fee, no scheduled return, no exclusivity, no touch-ups).

---

## 2. Pricing is per-artist

The generic defaults below exist as a fallback, but **in practice every artist has their
own price list**, which overrides the generic numbers. Always use the artist's own row.

### Generic fallback (rarely used)

| Item | Make-up | Hair |
|---|---|---|
| Trial (each) | 80 | 70 |
| Bridal (per day) | 120 | 100 |
| Guest (each) | 60 | 50 |
| Scheduled return – bride | 80 | 70 |
| Scheduled return – guest (each) | 40 | 35 |
| Touch-ups (per hour) | 50 | 45 |
| Exclusivity fee | 200 | 150 |

### Make-up artists

| Artist | Trial | Bridal | Guest | SR Bride | SR Guest | Touch-up/h | Exclusivity |
|---|---|---|---|---|---|---|---|
| Lola | 150 | 300 | 75 | 150 | 60 | 50 | 100 |
| Teresa | 150 | 300 | 75 | 150 | 60 | 50 | 100 |
| Miguel | 150 | 300 | 75 | 150 | 60 | 50 | 100 |
| Inês | 150 | 300 | 75 | 150 | 60 | 50 | 100 |
| Ana Neves | 125 | 250 | 75 | 125 | 55 | 50 | 100 |
| Ana Roma | 125 | 250 | 75 | 125 | 55 | 50 | 100 |
| Sara | 125 | 250 | 75 | 125 | 55 | 50 | 100 |
| Sofia | 100 | 200 | 75 | 100 | 50 | 50 | 100 |
| Rita | 100 | 200 | 75 | 100 | 50 | 50 | 100 |
| Filipa | 100 | 200 | 75 | 100 | 50 | 50 | 100 |

### Hair artists

| Artist | Trial | Bridal | Guest | SR Bride | SR Guest | Touch-up/h | Exclusivity |
|---|---|---|---|---|---|---|---|
| Lília | 150 | 320 | 95 | 250 | 95 | 90 | 100 |
| Andreia | 150 | 300 | 90 | 200 | 70 | 70 | 100 |
| Eric | 150 | 300 | 75 | 150 | 60 | 60 | 100 |
| Oksana | 150 | 300 | 75 | 150 | 60 | 60 | 100 |
| Olga H | 150 | 300 | 75 | 150 | 60 | 60 | 100 |
| Joana | 150 | 300 | 75 | 150 | 60 | 60 | 100 |
| **Agne** | — flat-rate model, see Section 5 — | | | | | | |

---

## 3. How a standard service is calculated

A service total = **pre-wedding (global) lines** + the sum of **per-day** lines.

### Pre-wedding / global lines (counted once, not per day)

- **Trials**: `trials × trial unit price`.
- **Trial travel fee**: a flat amount, only if a trial travel fee was charged. Tag it
  with the trial venue.

### Per-day lines (repeated for each celebration day)

For each day, in this order:

1. **Guests**: `guests × guest unit price` (omit if 0 guests).
2. **Bridal**: always exactly **1 × bridal unit price**, every single day. (Labelled
   "Bridal MU" for make-up, "Bridal H" for hair.)
3. **Scheduled return** — *only allowed when the day's travel fee is 0* and the scheduled
   return toggle is on:
   - **Bride scheduled return**: `1 × SR bride price` (only if bride SR selected).
   - **Guest scheduled return**: `SR guests × SR guest price` — **only if the bride
     scheduled return is also selected** (guests can't have SR without the bride).
4. **Travel fee** (car-based model) — *only when the day's travel fee > 0*:
   - Let `people` = total team incl. main artist (min 1), `cars` = number of cars.
   - `carCount = min(cars, people)` and `assistants = max(0, people − cars)`.
   - **Travelling fee (cars)** = `travel fee × carCount`. **Always name the destination in
     the label**, e.g. **"Travelling fee (cars) to Évora"** / **"Travelling fee (cars) to
     Arouca"**. On overnight-rate days (see 3a) append "— overnight rate", e.g.
     "Travelling fee (cars) to Évora — overnight rate".
   - **Assistant travel fee** = `0.35 × travel fee × assistants` (35% of the base travel
     fee per assistant who doesn't have their own car).
5. **Exclusivity fee**: flat exclusivity price for that day, if the client is paying for
   exclusivity.
6. **Touch-ups**: `touch-up hours × touch-up hourly rate`.

Each day has a **subtotal** = sum of that day's lines.

> Note: scheduled return and a travel fee are **mutually exclusive on the same day**. If
> the email implies both, flag it — scheduled return only applies when the artist isn't
> already being paid a travel fee to come back.

### 3a. Multi-day overnight travel rule (hotel stay)

When an event runs over more than one day, the artist doesn't drive back to Lisbon and
out again each day — they check into a hotel and stay over. So the full travel fee is only
charged once, and the in-between days are billed a reduced flat rate.

Apply this rule **only when ALL of the following are true**:

1. The per-day **travel fee is more than €150**, **and**
2. There is **more than one event day** (a **trial does not count** as an event day), **and**
3. The event days are **calendar-adjacent** (consecutive dates).

When it applies:

- **One day carries the full travel fee** (use the first event day of the adjacent run).
- **Every other adjacent day is billed a flat €200 travel fee** instead of the full fee.

When it does **not** apply (full travel fee on **every** day):

- Travel fee is **€150 or less** (no overnight benefit), **or**
- The event days are **non-adjacent** — e.g. Day 1 on 11 May and Day 2 on 13 May with a
  gap. Each separated day is a fresh round trip, so each gets the full fee.

Partial adjacency: treat each **run of consecutive days separately**. Within a run, the
first day gets the full fee and the rest get €200; a day that stands alone gets the full
fee. (Flag to Miguel if a schedule is ambiguous.)

The €200 becomes that day's travel-fee value, so the car/assistant model in step 4 runs on
€200 for those days (for a single car that's just €200).

> Edge case to flag: if the full travel fee is between €150.01 and €200, the "reduced"
> €200 day would cost more than the full fee — check with Miguel before applying.

---

## 4. Worked example (standard artist)

Bride "Maria", make-up with **Sofia**, single day. 5 guests, 1 trial, no travel,
2 hours of touch-ups.

- Pre-wedding: Trials `1 × 100 = 100`
- Wedding day:
  - Guests `5 × 75 = 375`
  - Bridal MU `1 × 200 = 200`
  - Touch-ups `2 × 50 = 100`
  - **Day subtotal = 675**
- **Total of Sofia's make-up services = 775**

---

## 5. Agne (hair) — flat-rate model

Agne does **not** use the per-unit model. She uses a flat package:

- **Base flat rate: €1,400** — includes **1 trial, the bridal hairstyle + up to 3 guests,
  and 8 hours on Day 1.**

Add-ons:

| Add-on | Price | When |
|---|---|---|
| Extra trial | 175 each | Each trial beyond the 1 included |
| Extra guest | 100 each | Each guest beyond 3 on Day 1, **and every guest on extra days** |
| Extra hours (Day 1) | 50/h | Each hour beyond the 8 included on Day 1 |
| Extra day (bride) | 250/day | Bride styling on each additional wedding day |
| Touch-ups (extra days) | 50/h | Hours on extra days (no free hours included) |
| Trial travel fee | flat | If a trial travel fee was charged (pre-wedding line) |

Travel on any day uses the same car model as standard artists: `travel fee × carCount`
plus `0.35 × travel fee × assistants`.

**Agne calculation:**

- **Day 1** = base €1,400 + extra guests beyond 3 (`(guests − 3) × 100`) + extra hours
  beyond 8 (`hours × 50`) + travel.
- **Each extra day** = €250 (bride) + all guests (`guests × 100`) + touch-up hours
  (`hours × 50`) + travel.
- **Pre-wedding** = extra trials (`(trials − 1) × 175`) + trial travel fee.

---

## 6. Deposits / "Priority" warnings

Every quote lists deposit reminders ("DUE: Priority"). These secure the booking and are
auto-generated unless a matching payment is already recorded.

- **Main artist deposit** — *always shown*. Wording:
  *"Main [MUA/HS] Deposit(s): your date with [Artist] is not secure until a deposit of
  €X has been received."*
  - Standard artists: **X = bridal unit price ÷ 2.**
  - Agne: **X = €175.**
- **Assistant deposit** — *shown only when the team has more than 1 person* (i.e. there
  are assistants). One reminder covering all assistants. Wording:
  *"Assistant [MUA/HS] Deposit(s): there are N assistant [make-up artists/hairstylists]
  described in your quote, but this artist will only be booked once a €Y deposit has been
  received."* where N = people − 1.
  - Standard artists: **Y = guest unit price.**
  - Agne: **Y = €100 per assistant.**

Labels: **MUA** for make-up, **HS** for hair.

### 6a. Minimum guests by distance (travel-fee bands)

Far locations carry a **minimum number of guests per service**, shown as a Priority
condition. It does **not** change the total — the client either brings that many guests or
pays the equivalent. The band is chosen by **that service's full travel fee to the
location** (under the overnight rule in 3a, use the **full round-trip fee**, not the €200
night rate):

- **Make-up:** fee **> €99 → Band A**; **€26–99 → Band B**; **≤ €25 → no minimum**.
- **Hair:** fee **> €99 → Band A**; **€10–99 → Band B**; **≤ €9 → no minimum**.

Minimum guests (excluding the bride):

| Artist(s) | Band A (fee > €99) | Band B (mid) |
|---|---|---|
| All make-up artists **except Sara** | 3 | 2 |
| **Sara** (make-up) | 3 | 3 |
| **Agne, Eric, Joana, Oksana, Olga H** (hair) | 3 | 2 |
| **Andreia** (hair) | 4 | 2 |
| **Lília** (hair) | 4 | 3 |

**When a guest count IS given:** show the requirement as a Priority condition line (one per
applicable service, with that artist's number):

> "For this location, due to its distance, this artist requires the minimum of **N** guests
> under their care (not including the bride), or equivalent payment."

**When the guest count is NOT specified** and a minimum applies: don't just note it — bill
it. Add a **Guests line for the minimum number** to the day's breakdown
(`N × guest unit price`), labelled **"(minimum number of guests for this location)"**, so
the summary reflects the minimum as if those guests were booked. In a multi-day event the
minimum is placed on the **main wedding day** (not every day) unless told otherwise. When
the minimum is billed this way, the separate Priority condition line is not also shown
(the labelled guest line already explains it).

---

## 7. Output structure

For each service block, in order:

1. Header: **"[Artist]'s Make-up Services"** / **"[Artist]'s Hairstyling Services"** plus
   the wedding date(s).
2. **PRE-WEDDING** section (trials, trial travel) with a pre-wedding subtotal — only if
   there are global lines.
3. One section per day, headed by the date (and beauty venue if known), listing each line
   as `Service | Calculation (qty × €unit) | Total`, ending in that day's **subtotal**.
4. **PAYMENTS – Make-up / Hairstyling**: any payments recorded (else "No payments
   recorded €0.00").
5. **TOTAL OF [Artist]'s … SERVICES** = service subtotal.
6. **DUE (Make-up) / DUE (Hairstylist)** = subtotal − payments.
7. **DUE: Priority** = the deposit warnings from Section 6.

After all service blocks:

- **Final Financial Summary per Day** — totals per date across both services, with a
  "Pre-wedding" row first if there were any pre-wedding charges.
- **Grand Summary** (only when more than one service block): **Grand Total**, **Total
  Paid**, **Total Due**.

Dates display as **DD/MM/YYYY**. Currency always shows two decimals (e.g. €200.00).
Title at the top: **"[Bride]'s Wedding — Financial Summary"**.

**Day naming vs. pre-wedding (trial):** the **PRE-WEDDING** section is only for trials and
trial travel. To avoid confusing it with an actual first event day, when the first
celebration day is itself a pre-wedding event (e.g. a welcome dinner), label that day
**"Day 1 (Pre-wedding event)"** — never just "Pre-wedding". The trial section stays
**PRE-WEDDING**; the event day stays **Day 1 (Pre-wedding event)**.

---

## 8. Validation rules & sanity flags

Flag these back to Miguel rather than silently quoting:

- **Scheduled return + travel fee on the same day** → not allowed; pick one.
- **Guest scheduled return without bride scheduled return** → not allowed.
- **At least 1 person and at least 1 car** required on any day with travel.
- **More cars than people** → warn (probably a mistake).
- **Assistants present, only 1 car, and touch-ups booked** → add a second car so
  assistants can return (travel is charged per car).
- **More than 3 trials** → unusual, double-check.
- **Trial travel fee over €200** → seems high, verify.

---

## 9. Commissions (internal only — never shown to the client)

Not part of the client quote/PDF, but the app tracks it: **20% of each artist's eligible
services** (everything **except** travel fees and assistant travel fees).
**Exempt artists** (0% commission): **Teresa, Lola, Miguel, Inês.**

---

## 10. Quick checklist for Claude when an enquiry comes in

1. Identify bride, service(s), artist(s), number of days + dates.
2. For each service, gather per-day details (guests, travel, people/cars, SR, exclusivity,
   touch-ups) and pre-wedding details (trials, trial travel).
3. Look up the artist's price row (or use Agne's flat model).
4. Compute pre-wedding lines, then each day's lines in the order of Section 3.
5. Sum to service total; subtract any payments for "Due".
6. Add deposit/priority warnings (Section 6).
7. If both services, add per-day totals + Grand Summary.
8. Run the sanity flags in Section 8 before sending.
