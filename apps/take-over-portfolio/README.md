# TAKE OVER — Portfolio Command Center

A zero-dependency single-page webapp for overseeing the TAKE OVER real-estate
portfolio (office-to-student-WG conversions). Plain HTML/CSS/JS — no build
step, no backend. All data lives in the browser's `localStorage`.

## Run

Open `index.html` directly in a browser, or serve the folder locally:

```
python3 -m http.server 8080
# then open http://localhost:8080
```

## Features

- **Tile dashboard** — every project as a tile with first-sight KPIs:
  Land, City, Street, number of units, category chips with counts,
  yearly revenue, management fee, performance fee, rent per month, EBITDA,
  occupancy, area and yield on cost. A portfolio-level KPI bar aggregates
  everything (projects, units, area, yearly revenue, EBITDA, cash flow,
  avg. rent, avg. occupancy).
- **Deep dive** — click any tile for the full project view: all fields are
  editable inline, categories can be added / renamed / re-counted / removed,
  and derived KPIs (NOI, EBITDA, EBITDA margin, cash flow after performance
  fee, yield on cost, revenue per m², revenue per unit, vacancy) recalculate
  live.
- **Add projects** — "+ Add project" opens a form for location, financials
  and initial categories.
- **Scenarios** — edit numbers freely, then **Save** to persist into the
  current scenario, or **Save as scenario** to store the current state under a
  new name. Switch, create and delete scenarios from the header. The "Base"
  scenario is seeded with six sample projects and can never be deleted.

## KPI definitions

- Units = sum of all category counts
- NOI = yearly revenue − opex
- EBITDA = NOI − management fee
- Cash flow = EBITDA − performance fee
- Yield on cost = EBITDA ÷ purchase price
- Occupancy / vacancy drive the tile badge; avg. portfolio occupancy is
  unit-weighted

## Files

- `index.html` — markup
- `styles.css` — bold light CI in the spirit of take-over.space (off-white + ink borders + hard shadows, loud accent, heavy grotesk type); accent is a single `--accent` variable
- `seed.js` — sample portfolio + pure KPI engine (`computeProject`,
  `computePortfolio`), also loadable in Node for tests
- `app.js` — rendering, editing, scenario persistence
