# Theme

## Part 1 — Token summary
- Fonts: Fira Sans (body/headings), Fira Code (numbers). Base 16px / 1.6.
- Light: bg #f8fafc, surface #fff, text #0f172a, heading #1e3a8a, muted #475569, border #dbeafe, primary #1e40af, accent #b45309, global-bar #94a3b8, biobank-bar #1e40af, under rgb(220,38,38), over rgb(30,64,175).
- Dark (prefers-color-scheme): bg #0b1120, surface #111a2e, text #e2e8f0, heading #bfdbfe, muted #94a3b8, border #1e293b, primary #60a5fa, accent #f59e0b, under rgb(248,113,113), over rgb(96,165,250).
- Spacing 4/8/12/16/24/32/48. Radius 12 (cards), 10 (cells), 8 (inputs/buttons), pill 999. No shadows. Max width 1080px. Breakpoint 600px.

## Part 2 — Raw `style.css`
```css
:root {
  --bg: #f8fafc;
  --surface: #ffffff;
  --text: #0f172a;
  --heading: #1e3a8a;
  --muted: #475569;
  --border: #dbeafe;
  --primary: #1e40af;
  --on-primary: #ffffff;
  --accent: #b45309;
  --ring: #1e40af;
  --global: #94a3b8;
  --biobank: #1e40af;
  --under: 220, 38, 38;
  --over: 30, 64, 175;
  --radius: 12px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --font-sans: "Fira Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-num: "Fira Code", ui-monospace, "SF Mono", Menlo, monospace;
  --ease: cubic-bezier(0.2, 0, 0, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0b1120;
    --surface: #111a2e;
    --text: #e2e8f0;
    --heading: #bfdbfe;
    --muted: #94a3b8;
    --border: #1e293b;
    --primary: #60a5fa;
    --on-primary: #0b1120;
    --accent: #f59e0b;
    --ring: #93c5fd;
    --global: #64748b;
    --biobank: #60a5fa;
    --under: 248, 113, 113;
    --over: 96, 165, 250;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 400 16px/1.6 var(--font-sans);
}

:focus-visible {
  outline: 3px solid var(--ring);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: var(--space-4);
  top: -48px;
  background: var(--primary);
  color: var(--on-primary);
  padding: var(--space-2) var(--space-4);
  border-radius: 8px;
  z-index: 10;
}
.skip-link:focus { top: var(--space-4); }

.num { font-family: var(--font-num); font-variant-numeric: tabular-nums; }

/* ---------- Hero ---------- */

.hero {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-7) var(--space-4) var(--space-5);
}

.eyebrow {
  margin: 0 0 var(--space-2);
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  max-width: 28ch;
  color: var(--heading);
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 700;
  line-height: 1.15;
  text-wrap: balance;
}

.subhead {
  max-width: 60ch;
  margin: var(--space-3) 0 0;
  font-size: 19px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--kpi-color, var(--primary));
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
}
.kpi .value { font: 600 26px/1.2 var(--font-num); }
.kpi .label { color: var(--muted); font-size: 14px; }

.source-line {
  margin: var(--space-4) 0 0;
  color: var(--muted);
  font-size: 14px;
}

/* ---------- Layout ---------- */

main {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 var(--space-4) var(--space-6);
  display: grid;
  gap: var(--space-4);
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
}

h2 {
  margin: 0 0 var(--space-1);
  color: var(--heading);
  font-size: 21px;
  font-weight: 600;
}

h3 {
  margin: 0 0 var(--space-2);
  color: var(--muted);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.hint {
  max-width: 70ch;
  margin: 0 0 var(--space-4);
  color: var(--muted);
  font-size: 15px;
}

/* ---------- Chart ---------- */

.chart-wrap { position: relative; height: 340px; }

.loading .chart-wrap,
.loading .heatmap {
  border-radius: 10px;
  background: linear-gradient(90deg, var(--border) 0%, var(--bg) 50%, var(--border) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
.loading .heatmap { min-height: 120px; }

@keyframes shimmer { to { background-position: -200% 0; } }

.data-table { margin-top: var(--space-4); }
.data-table summary { cursor: pointer; color: var(--primary); font-weight: 500; min-height: 44px; display: flex; align-items: center; }

/* ---------- Heatmap ---------- */

.legend { margin: 0 0 var(--space-4); }
.legend-bar {
  height: 14px;
  border-radius: 7px;
  border: 1px solid var(--border);
}
.legend-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--space-3);
}

.cell {
  min-height: 44px;
  border: 2px solid var(--border);
  border-radius: 10px;
  padding: var(--space-4);
  text-align: left;
  font: inherit;
  color: var(--text);
  cursor: pointer;
  transition: border-color 150ms var(--ease), transform 150ms var(--ease);
}
.cell:hover { border-color: var(--primary); }
.cell:active { transform: scale(0.98); }
.cell[aria-pressed="true"] { border-color: var(--text); box-shadow: 0 0 0 1px var(--text); }
.cell .name { font-weight: 600; }
.cell .ratio { font: 700 30px/1.2 var(--font-num); margin: var(--space-1) 0; }
.cell .direction { font-size: 13px; font-weight: 600; }
.cell .meta { font-size: 14px; }

/* ---------- Detail ---------- */

.detail { scroll-margin-top: var(--space-4); }

.detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.detail-head h2 { margin: 0; }

.pill {
  font-size: 14px;
  font-weight: 500;
  padding: 2px var(--space-3);
  border-radius: 999px;
  border: 1px solid var(--border);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0 var(--space-5);
}
.stat { border: 1px solid var(--border); border-radius: 10px; padding: var(--space-3); }
.stat .value { font: 600 24px/1.2 var(--font-num); }
.stat .label { font-size: 14px; color: var(--muted); }

.impact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-5);
}
.impact-grid p { margin: 0; max-width: 65ch; }

.explain {
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.btn {
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: var(--on-primary);
  font: 500 16px/1.2 var(--font-sans);
  cursor: pointer;
  transition: opacity 150ms var(--ease);
}
.btn:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: progress; }

.explain-out { white-space: pre-wrap; max-width: 70ch; margin: var(--space-3) 0 0; }
.explain-out:empty { display: none; }
.explain-out .tag { display: block; color: var(--muted); font-size: 13px; margin-bottom: var(--space-1); }

.sources { margin-top: var(--space-4); color: var(--muted); font-size: 14px; }
.sources summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }

/* ---------- Simulator ---------- */

label { display: block; margin: var(--space-3) 0 var(--space-2); font-weight: 500; }

input[type="number"] {
  width: 100%;
  max-width: 320px;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--muted);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font: 400 16px var(--font-num);
}
input[aria-invalid="true"] { border-color: rgb(var(--under)); }

.helper { margin: var(--space-2) 0 0; color: var(--muted); font-size: 14px; }
.field-error { margin: var(--space-2) 0 0; color: rgb(var(--under)); font-size: 14px; }
.field-error:empty { display: none; }

.sim-summary { margin: var(--space-4) 0 0; font-size: 17px; max-width: 70ch; }

/* ---------- Tables ---------- */

.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; margin-top: var(--space-3); font-size: 15px; }
th, td { text-align: left; padding: var(--space-2); border-bottom: 1px solid var(--border); }
th { color: var(--muted); font-weight: 600; }
td.num, th.num { text-align: right; }

/* ---------- Takeaways / errors / footer ---------- */

#takeaways { margin: 0; padding-left: var(--space-5); }
#takeaways li { margin-bottom: var(--space-2); max-width: 70ch; }

.error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  background: rgba(var(--under), 0.1);
  border: 1px solid rgba(var(--under), 0.5);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
}
.error[hidden] { display: none; }
.error p { margin: 0; flex: 1 1 280px; }

footer {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  padding: 0 var(--space-4) var(--space-6);
}

@media (max-width: 600px) {
  .card { padding: var(--space-4); }
  .chart-wrap { height: 400px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
```
