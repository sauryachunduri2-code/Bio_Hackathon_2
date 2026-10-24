# Layouts

Single shell in `index.html`: skip link → `header.hero` (eyebrow, h1 headline, subhead, KPI row, source line) → `main` (stack of `section.card`: chart, heatmap, detail panel, simulator, takeaways) → footer disclaimer. No nav/sidebar.

## `index.html`
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OmniBank Blindspot Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&family=Fira+Sans:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="style.css">
</head>
<body class="loading">
  <a class="skip-link" href="#main">Skip to the dashboard</a>

  <header class="hero">
    <p class="eyebrow">IMET Hackathon · Genomic Equity Track</p>
    <h1 id="headline">Loading the biobank data…</h1>
    <p id="subhead" class="subhead"></p>
    <div id="kpis" class="kpis"></div>
    <p id="source-line" class="source-line"></p>
  </header>

  <main id="main">
    <div id="error" class="error" role="alert" hidden>
      <p id="error-text"></p>
      <button id="retry-btn" class="btn" type="button">Try again</button>
    </div>

    <section class="card" aria-labelledby="compare-title">
      <h2 id="compare-title">Who is in the data vs. who is in the world</h2>
      <p class="hint">Groups are sorted from most under-sampled to most over-sampled. Click a bar, or use the heatmap cards below, to see what the gap means for patients.</p>
      <div class="chart-wrap"><canvas id="compare-chart" role="img"></canvas></div>
      <details class="data-table">
        <summary>Show the data as a table</summary>
        <div class="table-scroll"><table id="data-table"></table></div>
      </details>
    </section>

    <section class="card" aria-labelledby="heatmap-title">
      <h2 id="heatmap-title">Blindspot heatmap</h2>
      <p class="hint">Representation ratio = biobank share ÷ population share. At parity the ratio is 1×.</p>
      <div class="legend" aria-hidden="true">
        <div id="legend-bar" class="legend-bar"></div>
        <div id="legend-labels" class="legend-labels"></div>
      </div>
      <div id="heatmap" class="heatmap"></div>
    </section>

    <section id="detail" class="card detail" aria-live="polite" hidden>
      <div class="detail-head">
        <h2 id="detail-name"></h2>
        <span id="detail-status" class="pill"></span>
      </div>
      <div id="detail-stats" class="stats"></div>
      <div class="impact-grid">
        <article><h3>Clinical medicine</h3><p id="detail-clinical"></p></article>
        <article><h3>Healthcare policy</h3><p id="detail-policy"></p></article>
        <article><h3>The patient</h3><p id="detail-patient"></p></article>
      </div>
      <div class="explain">
        <button id="explain-btn" class="btn" type="button">Explain this blindspot in plain language</button>
        <p id="explain-out" class="explain-out" aria-live="polite"></p>
      </div>
      <details class="sources"><summary>Sources</summary><ul id="detail-sources"></ul></details>
    </section>

    <section class="card" aria-labelledby="sim-title">
      <h2 id="sim-title">Parity simulator</h2>
      <label for="sim-size">How many genomes are in your biobank?</label>
      <input id="sim-size" type="number" min="1" step="1" inputmode="numeric" aria-describedby="sim-help sim-error">
      <p id="sim-help" class="helper">Shows how many genomes each group would need for fair representation, without discarding any existing data.</p>
      <p id="sim-error" class="field-error" aria-live="polite"></p>
      <div id="sim-out"></div>
    </section>

    <section class="card" aria-labelledby="takeaways-title">
      <h2 id="takeaways-title">What should change</h2>
      <ol id="takeaways"></ol>
    </section>
  </main>

  <footer>
    <p>For education only. This is not medical advice.</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="config.js"></script>
  <script src="app.js"></script>
</body>
</html>
```
