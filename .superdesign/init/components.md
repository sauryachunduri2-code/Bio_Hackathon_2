# Components

No component library or framework. Vanilla HTML/CSS/JS, single page. UI primitives are plain HTML elements styled in `style.css`; dynamic pieces (KPI tiles, heatmap cells, stat tiles, tables) are built in `app.js` with an `el()` helper.

## Primitives (classes in style.css)
- `.card` section container; `.kpi` hero stat tile; `.cell` heatmap button (aria-pressed); `.stat` detail stat tile; `.pill` status tag; `.btn` primary button; `input[type=number]`; `table`; `.legend` gradient legend.

## `app.js` (renders all dynamic components)
```js
(function () {
  const cfg = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let groups = [];
  let columns = {};
  let content = { groups: {}, fallback: {} };
  let chart = null;
  let selected = null;

  // ---------- Data loading ----------

  function sheetCsvUrl() {
    const params = new URLSearchParams({ tqx: "out:csv", sheet: cfg.sheetTab });
    return `https://docs.google.com/spreadsheets/d/${cfg.sheetId}/gviz/tq?${params}`;
  }

  // Minimal RFC 4180 parser: handles quoted fields, escaped quotes and CRLF.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else field += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field); rows.push(row); row = []; field = "";
      } else field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim() !== ""));
  }

  function toPercent(value) {
    const n = parseFloat(String(value).replace(/[%,\s]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  // Sheet columns, in order: group, global population share, biobank share, status.
  function buildGroups(rows) {
    const [header, ...body] = rows;
    columns = { group: header[0], global: header[1], biobank: header[2], status: header[3] };
    return body
      .map((r) => {
        const global = toPercent(r[1]);
        const biobank = toPercent(r[2]);
        return {
          name: r[0].trim(),
          global,
          biobank,
          status: (r[3] || "").trim(),
          gap: biobank - global,
          ratio: biobank / global,
        };
      })
      .filter((g) => g.name && Number.isFinite(g.global) && Number.isFinite(g.biobank) && g.global > 0)
      .sort((a, b) => a.ratio - b.ratio);
  }

  async function load() {
    const [csvRes, contentRes] = await Promise.all([fetch(sheetCsvUrl()), fetch(cfg.contentUrl)]);
    if (!csvRes.ok) throw new Error(`Could not load the data sheet (HTTP ${csvRes.status}).`);
    groups = buildGroups(parseCsv(await csvRes.text()));
    if (!groups.length) throw new Error("The data sheet loaded but had no usable rows.");
    if (contentRes.ok) content = await contentRes.json();
  }

  // ---------- Formatting ----------

  const fmtPct = (n) => `${+n.toFixed(1)}%`;
  const fmtRatio = (r) => `${r >= 10 ? r.toFixed(0) : +r.toFixed(2)}×`;
  const fmtPts = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${+Math.abs(n).toFixed(1)} pts`;
  const fmtInt = (n) => Math.round(n).toLocaleString();
  const direction = (g) => (g.ratio < 1 ? "Under-sampled" : g.ratio > 1 ? "Over-sampled" : "At parity");

  function contentFor(name) {
    const key = name.toLowerCase().replace(/\bdescent\b/g, "").replace(/\s+/g, " ").trim();
    return content.groups[key] || content.fallback;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Diverging color around parity (ratio 1), scaled on log ratio to the most extreme group.
  function maxLogRatio() {
    return Math.max(...groups.map((g) => Math.abs(Math.log(g.ratio))));
  }

  function colorFor(ratio, alphaMax) {
    const maxLog = maxLogRatio();
    const t = maxLog ? Math.abs(Math.log(ratio)) / maxLog : 0;
    const rgb = cssVar(ratio < 1 ? "--under" : "--over");
    return `rgba(${rgb}, ${(t * alphaMax).toFixed(3)})`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------- Render ----------

  function renderHero() {
    const over = groups[groups.length - 1];
    const worst = groups[0];
    const under = groups.filter((g) => g.ratio < 1);
    const underGlobal = under.reduce((s, g) => s + g.global, 0);
    const underBio = under.reduce((s, g) => s + g.biobank, 0);

    $("headline").textContent =
      `${fmtPct(over.biobank)} of genomic data comes from people of ${over.name}, who are ${fmtPct(over.global)} of the world.`;
    $("subhead").textContent = under.length
      ? `The other ${fmtPct(underGlobal)} of humanity shares ${fmtPct(underBio)} of the data. Medicine built on that data has blindspots.`
      : "";

    const kpi = (value, label, color) => {
      const box = el("div", "kpi");
      box.style.setProperty("--kpi-color", color);
      box.append(el("div", "value", value), el("div", "label", label));
      return box;
    };
    $("kpis").replaceChildren(
      kpi(fmtRatio(over.ratio), `${over.name}: most over-sampled`, `rgb(${cssVar("--over")})`),
      kpi(fmtRatio(worst.ratio), `${worst.name}: most under-sampled`, `rgb(${cssVar("--under")})`),
      kpi(`${under.length} of ${groups.length}`, "groups below parity", cssVar("--accent")),
    );

    $("source-line").textContent =
      `Live data: ${groups.length} groups from the "${cfg.sheetTab}" sheet · loaded ${new Date().toLocaleTimeString()}`;
  }

  // Break long group names into lines so axis labels are not clipped on narrow screens.
  function wrapLabel(name, maxChars) {
    const lines = [];
    name.split(" ").forEach((word) => {
      const last = lines[lines.length - 1];
      if (last && (last + " " + word).length <= maxChars) lines[lines.length - 1] = last + " " + word;
      else lines.push(word);
    });
    return lines;
  }

  function renderChart() {
    const text = cssVar("--text");
    const narrow = window.matchMedia("(max-width: 600px)").matches;
    const maxValue = Math.max(...groups.flatMap((g) => [g.global, g.biobank]));
    const canvas = $("compare-chart");
    canvas.setAttribute("aria-label",
      `Bar chart comparing ${columns.global} and ${columns.biobank} for ${groups.length} groups. ` +
      groups.map((g) => `${g.name}: ${fmtPct(g.global)} of people, ${fmtPct(g.biobank)} of data`).join("; ") + ".");

    if (chart) chart.destroy();
    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: groups.map((g) => (narrow ? wrapLabel(g.name, 12) : g.name)),
        datasets: [
          { label: columns.global, data: groups.map((g) => g.global), backgroundColor: cssVar("--global"), borderRadius: 4 },
          { label: columns.biobank, data: groups.map((g) => g.biobank), backgroundColor: cssVar("--biobank"), borderRadius: 4 },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        animation: reduceMotion ? false : { duration: 400 },
        font: { family: "Fira Sans" },
        plugins: {
          legend: { position: "top", align: "start", labels: { color: text, font: { family: "Fira Sans", size: 14 } } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${fmtPct(c.raw)}` } },
        },
        scales: {
          x: {
            suggestedMax: Math.ceil(maxValue / 10) * 10,
            ticks: { color: text, callback: (v) => `${v}%`, font: { family: "Fira Code" }, maxTicksLimit: narrow ? 5 : 11 },
            grid: { color: cssVar("--border") },
          },
          y: { ticks: { color: text, font: { family: "Fira Sans", size: narrow ? 13 : 14 } }, grid: { display: false } },
        },
        onClick: (_e, els) => { if (els.length) select(groups[els[0].index]); },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? "pointer" : "default"; },
      },
    });
  }

  function renderDataTable() {
    const head = [columns.group, columns.global, columns.biobank, "Ratio", "Gap", columns.status];
    const thead = el("thead");
    const hr = el("tr");
    head.forEach((h, i) => {
      const th = el("th", i && i < 5 ? "num" : "", h);
      th.scope = "col";
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    const tbody = el("tbody");
    groups.forEach((g) => {
      const tr = el("tr");
      [g.name, fmtPct(g.global), fmtPct(g.biobank), fmtRatio(g.ratio), fmtPts(g.gap), g.status].forEach((v, i) =>
        tr.appendChild(el("td", i && i < 5 ? "num" : "", v)));
      tbody.appendChild(tr);
    });
    $("data-table").replaceChildren(thead, tbody);
  }

  function renderLegend() {
    const lo = groups[0].ratio;
    const hi = groups[groups.length - 1].ratio;
    const span = Math.log(hi) - Math.log(lo);
    const parityPos = span ? ((0 - Math.log(lo)) / span) * 100 : 50;
    const clamped = Math.min(100, Math.max(0, parityPos));
    $("legend-bar").style.background =
      `linear-gradient(90deg, ${colorFor(lo, 0.55)} 0%, transparent ${clamped}%, ${colorFor(hi, 0.55)} 100%)`;
    $("legend-labels").replaceChildren(
      el("span", "num", `${fmtRatio(lo)} under`),
      el("span", "num", "1× parity"),
      el("span", "num", `${fmtRatio(hi)} over`),
    );
  }

  function renderHeatmap() {
    const box = $("heatmap");
    box.replaceChildren();
    groups.forEach((g) => {
      const cell = el("button", "cell");
      cell.type = "button";
      cell.setAttribute("aria-pressed", "false");
      cell.dataset.name = g.name;
      cell.style.background = colorFor(g.ratio, 0.55);
      cell.append(
        el("div", "name", g.name),
        el("div", "ratio", fmtRatio(g.ratio)),
        el("div", "direction", direction(g)),
        el("div", "meta", `${fmtPct(g.biobank)} of data vs ${fmtPct(g.global)} of people · ${g.status}`),
      );
      cell.addEventListener("click", () => select(g));
      box.appendChild(cell);
    });
  }

  function stat(value, label) {
    const box = el("div", "stat");
    box.append(el("div", "value", value), el("div", "label", label));
    return box;
  }

  function select(g) {
    selected = g;
    const c = contentFor(g.name);
    $("detail").hidden = false;
    $("detail-name").textContent = g.name;
    $("detail-status").textContent = `${g.status} · ${direction(g)}`;
    $("detail-status").style.background = colorFor(g.ratio, 0.35);
    $("detail-stats").replaceChildren(
      stat(fmtPct(g.global), columns.global),
      stat(fmtPct(g.biobank), columns.biobank),
      stat(fmtRatio(g.ratio), "Representation vs. parity"),
      stat(fmtPts(g.gap), "Gap (biobank − population)"),
    );
    $("detail-clinical").textContent = c.clinical;
    $("detail-policy").textContent = c.policy;
    $("detail-patient").textContent = c.patient;
    $("detail-sources").replaceChildren(...(c.sources || []).map((s) => el("li", "", s)));
    $("explain-out").textContent = "";
    document.querySelectorAll(".cell").forEach((node) =>
      node.setAttribute("aria-pressed", String(node.dataset.name === g.name)));
    $("detail").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  async function explain() {
    if (!selected) return;
    const g = selected;
    const btn = $("explain-btn");
    const out = $("explain-out");
    const label = btn.textContent;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.textContent = "Asking Gemini…";
    out.textContent = "";
    try {
      const res = await fetch(cfg.explainUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group: g.name, status: g.status,
          globalShare: g.global, biobankShare: g.biobank,
          ratio: +g.ratio.toFixed(2), gap: +g.gap.toFixed(1),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.text) throw new Error(data.error || `HTTP ${res.status}`);
      out.replaceChildren(el("span", "tag", "Generated by Gemini from the live sheet numbers"), data.text);
    } catch (err) {
      // Offline fallback: build the summary from the sheet numbers and the curated text.
      const c = contentFor(g.name);
      out.replaceChildren(
        el("span", "tag", `Gemini unavailable (${err.message}). Showing the offline summary.`),
        `The ${g.name} group is ${fmtPct(g.global)} of the world but ${fmtPct(g.biobank)} of biobank genomes, ` +
        `${fmtRatio(g.ratio)} of fair representation. ${c.patient}`,
      );
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.textContent = label;
    }
  }

  function renderSimulator() {
    const input = $("sim-size");
    const out = $("sim-out");
    const raw = input.value.trim();
    const n = Number(raw);

    if (raw === "") {
      input.removeAttribute("aria-invalid");
      $("sim-error").textContent = "";
      out.replaceChildren();
      return;
    }
    if (!Number.isInteger(n) || n <= 0) {
      input.setAttribute("aria-invalid", "true");
      $("sim-error").textContent = "Enter a whole number of genomes greater than zero.";
      out.replaceChildren();
      return;
    }
    input.removeAttribute("aria-invalid");
    $("sim-error").textContent = "";

    // Parity without discarding data: grow until the most over-represented group's
    // current count equals its population share of the new total.
    const over = groups[groups.length - 1];
    const target = over.ratio > 1 ? (n * over.biobank) / over.global : n;

    const rows = groups.map((g) => {
      const now = (n * g.biobank) / 100;
      const need = (target * g.global) / 100;
      return { g, now, need, add: Math.max(0, need - now) };
    });
    const totalAdd = rows.reduce((s, r) => s + r.add, 0);

    const summary = el("p", "sim-summary",
      `Reaching parity without discarding any data takes ${fmtInt(target)} genomes, ` +
      `which means recruiting ${fmtInt(totalAdd)} more from under-sampled groups (${fmtRatio(target / n)} today's size).`);

    const table = el("table");
    const thead = el("thead");
    const hr = el("tr");
    ["Group", "Genomes today", "Needed for parity", "To recruit"].forEach((h, i) => {
      const th = el("th", i ? "num" : "", h);
      th.scope = "col";
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    const tbody = el("tbody");
    [...rows].sort((a, b) => b.add - a.add).forEach((r) => {
      const tr = el("tr");
      [r.g.name, fmtInt(r.now), fmtInt(r.need), fmtInt(r.add)].forEach((v, i) =>
        tr.appendChild(el("td", i ? "num" : "", v)));
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    const wrap = el("div", "table-scroll");
    wrap.appendChild(table);
    out.replaceChildren(summary, wrap);
  }

  function renderTakeaways() {
    const under = groups.filter((g) => g.ratio < 1);
    const worst = under.slice(0, Math.min(under.length, 3)).map((g) => `${g.name} (${fmtRatio(g.ratio)})`);
    const items = [
      worst.length && `Recruit first where the gap is worst: ${worst.join(", ")}.`,
      "Validate polygenic risk scores and variant classifications in each ancestry before using them in the clinic.",
      "Require every genomic dataset and AI model to publish its ancestry composition, as this dashboard does.",
    ].filter(Boolean);
    $("takeaways").replaceChildren(...items.map((t) => el("li", "", t)));
  }

  // ---------- Boot ----------

  async function init() {
    document.body.classList.add("loading");
    $("error").hidden = true;
    try {
      await load();
    } catch (err) {
      document.body.classList.remove("loading");
      $("headline").textContent = "OmniBank Blindspot Explorer";
      $("error-text").textContent = `${err.message} Check your connection and that the sheet is still shared publicly.`;
      $("error").hidden = false;
      return;
    }
    document.body.classList.remove("loading");
    renderHero();
    renderChart();
    renderDataTable();
    renderLegend();
    renderHeatmap();
    renderTakeaways();
    renderSimulator();
  }

  $("retry-btn").addEventListener("click", init);
  $("explain-btn").addEventListener("click", explain);
  $("sim-size").addEventListener("input", renderSimulator);
  init();
})();
```
