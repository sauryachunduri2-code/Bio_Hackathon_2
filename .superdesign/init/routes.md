# Routes

Static site, no router.

| Path | File | Layout |
|---|---|---|
| `/` | `index.html` | itself |
| `/api/explain` (POST) | `api/explain.js` | Vercel serverless function, no UI |

## / — OmniBank Blindspot Explorer
Genomic-equity dashboard. Fetches a Google Sheet (6 ancestry groups: global population %, biobank %, status) at load; computes gap and representation ratio. Renders: headline + 3 KPI tiles; horizontal paired bar chart (Chart.js) global vs biobank; diverging-color heatmap of ratio with legend; click → detail panel (4 stats, clinical/policy/patient text, Gemini explain button, sources); parity simulator (number input → table); data-driven takeaways list.
