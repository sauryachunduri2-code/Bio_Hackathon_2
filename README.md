# OmniBank Blindspot Explorer

**IMET Hackathon 2026 · Genomic Equity Track** (partners: MLH and Google Gemini)

An interactive dashboard that shows how unevenly the world is represented in genomic biobanks, and what those blindspots mean for clinical medicine, healthcare policy and patients.

## Features
- **Live data, no hard-coded numbers.** The page fetches the organizers' Google Sheet (`Project_OmniBank_V1`) when it loads. Every figure, the headline included, is read from the sheet or calculated from it. Edit the sheet and reload, and the page updates.
- **Fig. 1, dumbbell chart.** Each group's share of the world vs. its share of biobank genomes. Select any row to open that group's detail panel.
- **Fig. 2, representation ratio.** Biobank share ÷ population share on a log scale centered on parity (1×).
- **Impact panel.** Clinical, policy and patient consequences for each group, with sources.
- **Gemini explainer.** Sends the selected group's live numbers to Gemini and returns a plain-language summary. If Gemini is unavailable, an offline summary is shown instead.
- **Parity simulator.** Enter a biobank size to see how many genomes each group would need for fair representation.
- **Takeaways.** Built from the data: the groups with the lowest ratios are named automatically.

## Run locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```
The Gemini button uses the offline summary when run locally (there is no `/api` route). To test Gemini locally, use `vercel dev`.

## Deploy (Vercel)
1. Import this repo in Vercel. No build step is needed.
2. Add the environment variable `GEMINI_API_KEY`. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

## Files
| Path | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The dashboard |
| `config.js` | Sheet ID and endpoints |
| `content/blindspots.json` | Qualitative clinical, policy and patient text and sources (contains no numbers) |
| `api/explain.js` | Serverless Gemini proxy that keeps the API key off the client |

## Data
Organizer-provided sheet: ancestry group, global population share, biobank dataset share, status. Calculated fields: gap (biobank − population, in percentage points) and representation ratio.

*For education only. This is not medical advice.*
