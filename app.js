(function () {
  const cfg = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The dataset on the page. Starts as the sample (loaded from a public Google Sheet); the editor and CSV upload replace it.
  let liveRows = [];
  let liveColumns = {};
  let editRows = [];        // raw editor values: { name, global, biobank, status }
  let columns = {};
  let source = { kind: "live", label: "" };

  let groups = [];          // valid rows with derived gap and ratio, sorted by ratio
  let content = { groups: {}, fallback: {} };
  let selectedName = null;
  let insightsShown = false;
  let updateTimer = null;

  // ---------- CSV ----------

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

  const csvField = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

  function toPercent(value) {
    const n = parseFloat(String(value).replace(/[%,\s]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  // Sheet columns, in order: group, global population share, biobank share, status.
  function tableFromCsv(text) {
    const [header, ...body] = parseCsv(text);
    if (!header || header.length < 3) throw new Error("The CSV needs at least three columns: group, population %, biobank %.");
    return {
      columns: { group: header[0].trim(), global: header[1].trim(), biobank: header[2].trim(), status: (header[3] || "Status").trim() },
      rows: body.map((r) => ({
        name: (r[0] || "").trim(),
        global: toPercent(r[1]),
        biobank: toPercent(r[2]),
        status: (r[3] || "").trim(),
      })),
    };
  }

  const isValidRow = (r) =>
    r.name.trim() !== "" && Number.isFinite(+r.global) && Number.isFinite(+r.biobank) &&
    String(r.global).trim() !== "" && String(r.biobank).trim() !== "" && +r.global > 0 && +r.biobank >= 0;

  function deriveGroups(rows) {
    return rows
      .filter(isValidRow)
      .map((r) => {
        const global = +r.global;
        const biobank = +r.biobank;
        return { name: r.name.trim(), global, biobank, status: r.status.trim(), gap: biobank - global, ratio: biobank / global };
      })
      .sort((a, b) => a.ratio - b.ratio);
  }

  async function loadLive() {
    const [csvRes, contentRes] = await Promise.all([fetch(sheetCsvUrl()), fetch(cfg.contentUrl)]);
    if (!csvRes.ok) throw new Error(`Could not load the sample data (HTTP ${csvRes.status}).`);
    const table = tableFromCsv(await csvRes.text());
    liveRows = table.rows;
    liveColumns = table.columns;
    if (!deriveGroups(liveRows).length) throw new Error("The sample data loaded but had no usable rows.");
    if (contentRes.ok) content = await contentRes.json();
  }

  // ---------- Formatting ----------

  const fmtPct = (n) => `${+n.toFixed(1)}%`;
  const fmtRatio = (r) => `${r >= 10 ? r.toFixed(0) : +r.toFixed(2)}×`;
  const fmtPts = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${+Math.abs(n).toFixed(1)} pts`;
  const fmtInt = (n) => Math.round(n).toLocaleString();
  const tone = (g) => (g.ratio < 1 ? "under" : "over");
  const direction = (g) => (g.ratio < 1 ? "Under-sampled" : g.ratio > 1 ? "Over-sampled" : "At parity");
  const statusOf = (g) => g.status || direction(g);

  function contentFor(name) {
    const key = name.toLowerCase().replace(/\bdescent\b/g, "").replace(/\s+/g, " ").trim();
    return content.groups[key] || content.fallback;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function placed(tag, className, leftPct, text) {
    const node = el(tag, className, text);
    node.style.left = `${leftPct}%`;
    return node;
  }

  // ---------- Hero ----------

  function renderHero() {
    if (!groups.length) {
      $("headline").textContent = "Add at least one group with a population share above zero.";
      $("dek").textContent = "";
      $("figures").replaceChildren();
      return;
    }
    const over = groups[groups.length - 1];
    const worst = groups[0];
    const under = groups.filter((g) => g.ratio < 1);
    const underGlobal = under.reduce((s, g) => s + g.global, 0);
    const underBio = under.reduce((s, g) => s + g.biobank, 0);

    $("headline").textContent = over.ratio > 1
      ? `${fmtPct(over.biobank)} of genomic data comes from people of ${over.name}, who are ${fmtPct(over.global)} of the world.`
      : `No group is over-sampled here, but ${worst.name} has ${fmtRatio(worst.ratio)} of its fair share of the data.`;
    $("dek").textContent = under.length && over.ratio > 1
      ? `The other ${fmtPct(underGlobal)} of humanity shares ${fmtPct(underBio)} of the data. Medicine built on that data has blindspots.`
      : "";

    const figure = (value, label, cls) => {
      const box = el("div", `key-figure ${cls}`);
      box.append(el("div", "value", value), el("div", "label", label));
      return box;
    };
    $("figures").replaceChildren(
      figure(fmtRatio(over.ratio), `${over.name}: most over-sampled`, "over"),
      figure(fmtRatio(worst.ratio), `${worst.name}: most under-sampled`, "under"),
      figure(`${under.length} of ${groups.length}`, "groups below parity", ""),
    );
  }

  function renderSourceLines() {
    $("source-line").textContent = source.kind === "live"
      ? `Sample dataset · ${groups.length} ancestry groups · illustrative figures, not an official statistic`
      : `Your data · ${groups.length} groups${source.label ? ` from ${source.label}` : ""} · stays in your browser, not saved`;
    const line = $("data-source");
    line.textContent = source.kind === "live"
      ? "Showing the sample dataset. Edit any cell or upload a CSV to use your own."
      : `Showing your data${source.label ? ` from ${source.label}` : ""}. Reset to return to the sample.`;
    line.classList.toggle("edited", source.kind !== "live");
  }

  // ---------- Fig. 1: dumbbell of population share vs biobank share ----------

  function renderDumbbell() {
    const maxValue = Math.max(0, ...groups.flatMap((g) => [g.global, g.biobank]));
    const scaleMax = Math.ceil(maxValue / 10) * 10 || 10;
    const x = (v) => (v / scaleMax) * 100;

    const rows = groups.map((g, i) => {
      const row = rowButton(g, `${g.name}: ${fmtPct(g.global)} of people, ${fmtPct(g.biobank)} of biobank data`);
      if (i > 0 && groups[i - 1].ratio < 1 && g.ratio >= 1) row.classList.add("row-gap");
      const track = el("div", `track ${tone(g)}`);
      const lo = Math.min(g.global, g.biobank);
      const hi = Math.max(g.global, g.biobank);
      const line = placed("span", "line toned", x(lo));
      line.style.width = `${x(hi) - x(lo)}%`;
      track.append(
        line,
        placed("span", "mark pop", x(g.global)),
        placed("span", "mark toned", x(g.biobank)),
        placed("span", "val above toned", x(g.biobank), fmtPct(g.biobank)),
        placed("span", "val below", x(g.global), fmtPct(g.global)),
      );
      row.append(el("span", "row-name", g.name), track);
      return row;
    });
    $("dumbbell").replaceChildren(...rows);

    const ticks = groups.length ? [0, 1, 2, 3, 4].map((i) => (scaleMax / 4) * i) : [];
    $("dumbbell-axis").replaceChildren(...ticks.map((t) => placed("span", "", x(t), `${+t.toFixed(1)}%`)));
  }

  // ---------- Fig. 2: representation ratio on a log scale around parity ----------

  function renderRatio() {
    const logs = groups.filter((g) => g.ratio > 0).map((g) => Math.log2(g.ratio));
    const lo = Math.floor(Math.min(-1, ...logs));
    const hi = Math.ceil(Math.max(1, ...logs));
    // A biobank share of zero has no log position, so it sits at the left edge of the axis.
    const x = (r) => (r > 0 ? ((Math.log2(r) - lo) / (hi - lo)) * 100 : 0);
    const parity = x(1);

    const rows = groups.map((g) => {
      const row = rowButton(g, `${g.name}: representation ratio ${fmtRatio(g.ratio)}, ${direction(g).toLowerCase()}`);
      const name = el("span", `row-name ${tone(g)}`);
      name.append(el("span", "", g.name), el("br"), el("span", "ratio-word val toned", direction(g)));
      const track = el("div", `track ${tone(g)}`);
      const stem = placed("span", "line toned", Math.min(parity, x(g.ratio)));
      stem.style.width = `${Math.abs(x(g.ratio) - parity)}%`;
      track.append(
        placed("span", "parity", parity),
        stem,
        placed("span", "mark toned", x(g.ratio)),
        placed("span", "val above toned", x(g.ratio), fmtRatio(g.ratio)),
      );
      row.append(name, track);
      return row;
    });
    $("ratio").replaceChildren(...rows);

    // Ticks at powers of two across the data's range.
    const ticks = [];
    if (groups.length) for (let k = lo; k <= hi; k++) ticks.push(2 ** k);
    $("ratio-axis").replaceChildren(...ticks.map((t) =>
      placed("span", t === 1 ? "parity-label" : "", x(t), t === 1 ? "1× parity" : t < 1 ? `1/${1 / t}×` : `${t}×`)));
  }

  function rowButton(g, label) {
    const row = el("button", "row");
    row.type = "button";
    row.dataset.name = g.name;
    row.setAttribute("aria-pressed", String(g.name === selectedName));
    row.setAttribute("aria-label", label);
    row.addEventListener("click", () => select(g.name, true));
    return row;
  }

  function renderDataTable() {
    const head = [columns.group, columns.global, columns.biobank, "Ratio", "Gap", columns.status];
    const isNum = (i) => i > 0 && i < 5;
    const hr = el("tr");
    head.forEach((h, i) => {
      const th = el("th", isNum(i) ? "num" : "", h);
      th.scope = "col";
      hr.appendChild(th);
    });
    const thead = el("thead");
    thead.appendChild(hr);
    const tbody = el("tbody");
    groups.forEach((g) => {
      const tr = el("tr");
      [g.name, fmtPct(g.global), fmtPct(g.biobank), fmtRatio(g.ratio), fmtPts(g.gap), statusOf(g)].forEach((v, i) =>
        tr.appendChild(el("td", isNum(i) ? "num" : "", v)));
      tbody.appendChild(tr);
    });
    $("data-table").replaceChildren(thead, tbody);
  }

  // ---------- Detail ----------

  function stat(value, label, toned) {
    const box = el("div");
    box.append(el("dt", "", label), el("dd", toned ? "toned" : "", value));
    return box;
  }

  function select(name, scroll) {
    const g = groups.find((x) => x.name === name);
    const detail = $("detail");
    if (!g) { detail.hidden = true; selectedName = null; return; }
    const changed = name !== selectedName;
    selectedName = name;
    const c = contentFor(g.name);
    detail.hidden = false;
    detail.classList.remove("under", "over");
    detail.classList.add(tone(g));
    $("detail-direction").textContent = direction(g);
    $("detail-name").textContent = g.name;
    $("detail-status").textContent = statusOf(g);
    $("detail-stats").replaceChildren(
      stat(fmtPct(g.global), columns.global),
      stat(fmtPct(g.biobank), columns.biobank),
      stat(fmtRatio(g.ratio), "Ratio to parity", true),
      stat(fmtPts(g.gap), "Gap"),
    );
    $("detail-clinical").textContent = c.clinical;
    $("detail-policy").textContent = c.policy;
    $("detail-patient").textContent = c.patient;
    $("detail-sources").replaceChildren(...(c.sources || []).map((s) => el("li", "", s)));
    if (changed) $("explain-out").textContent = "";
    document.querySelectorAll(".row").forEach((node) =>
      node.setAttribute("aria-pressed", String(node.dataset.name === g.name)));
    if (scroll) detail.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  // Gemini can be slow under load; past this the page shows its calculated analysis instead.
  const AI_TIMEOUT_MS = 30000;

  async function postJson(url, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`no answer within ${AI_TIMEOUT_MS / 1000} seconds`);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function withBusy(btn, busyLabel, task) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.textContent = busyLabel;
    try {
      await task();
    } finally {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.textContent = label;
    }
  }

  function explain() {
    const g = groups.find((x) => x.name === selectedName);
    if (!g) return;
    const out = $("explain-out");
    out.textContent = "";
    return withBusy($("explain-btn"), "Asking Gemini, up to 20 seconds…", async () => {
      try {
        const data = await postJson(cfg.explainUrl, {
          group: g.name, status: statusOf(g),
          globalShare: g.global, biobankShare: g.biobank,
          ratio: +g.ratio.toFixed(2), gap: +g.gap.toFixed(1),
        });
        if (!data.text) throw new Error("Empty response");
        out.replaceChildren(el("span", "tag", "Generated by Gemini from the numbers on this page"), data.text);
      } catch (err) {
        // Offline fallback: build the summary from the page's numbers and the curated text.
        const c = contentFor(g.name);
        out.replaceChildren(
          el("span", "tag", `Gemini unavailable (${err.message}). Showing the offline summary.`),
          `The ${g.name} group is ${fmtPct(g.global)} of the world but ${fmtPct(g.biobank)} of biobank genomes, ` +
          `${fmtRatio(g.ratio)} of fair representation. ${c.patient}`,
        );
      }
    });
  }

  // ---------- AI insights for the whole dataset ----------

  // Computed analysis used when Gemini is unreachable; every statement is derived from the rows.
  function offlineInsights() {
    const over = groups[groups.length - 1];
    const worst = groups[0];
    const under = groups.filter((g) => g.ratio < 1);
    const underGlobal = under.reduce((s, g) => s + g.global, 0);
    const underBio = under.reduce((s, g) => s + g.biobank, 0);
    const sum = (k) => groups.reduce((s, g) => s + g[k], 0);
    const missing = groups.filter((g) => g.biobank === 0);

    const dataQuality = [];
    if (Math.round(sum("global")) !== 100) dataQuality.push(`Population shares add up to ${fmtPct(sum("global"))}, not 100%.`);
    if (Math.round(sum("biobank")) !== 100) dataQuality.push(`Biobank shares add up to ${fmtPct(sum("biobank"))}, not 100%.`);
    if (missing.length) dataQuality.push(`${missing.map((g) => g.name).join(", ")} ${missing.length === 1 ? "has" : "have"} no genomes in the biobank at all.`);

    return {
      headline: under.length
        ? `${under.length} of ${groups.length} groups are under-sampled; ${worst.name} has ${fmtRatio(worst.ratio)} of its fair share.`
        : "Every group in this dataset is at or above parity.",
      findings: [
        `${over.name} holds ${fmtPct(over.biobank)} of biobank genomes while being ${fmtPct(over.global)} of the population (${fmtRatio(over.ratio)}).`,
        under.length && `Under-sampled groups are ${fmtPct(underGlobal)} of the population but ${fmtPct(underBio)} of the data.`,
        under.length > 1 && `The widest gaps by ratio: ${under.slice(0, 3).map((g) => `${g.name} (${fmtRatio(g.ratio)})`).join(", ")}.`,
      ].filter(Boolean),
      clinicalRisks: under.length ? [
        `Reference databases have fewer genomes from ${under.slice(0, 3).map((g) => g.name).join(", ")}, so normal variants in these groups are more likely to be misread as harmful.`,
        "Polygenic risk scores trained mostly on the over-sampled group can be less accurate for under-sampled groups.",
      ] : [],
      dataQuality,
      recommendations: [
        under.length && `Prioritize recruitment in ${under.slice(0, 3).map((g) => g.name).join(", ")}.`,
        "Validate risk scores and variant classifications in each ancestry before clinical use.",
        "Publish the ancestry composition of every genomic dataset and model.",
      ].filter(Boolean),
    };
  }

  function renderInsights(result, tag) {
    const out = $("insights-out");
    const sections = [
      ["Findings", result.findings],
      ["Clinical risks", result.clinicalRisks],
      ["Data quality", result.dataQuality],
      ["Recommendations", result.recommendations],
    ].filter(([, items]) => items && items.length);
    const grid = el("div", "insights-grid");
    sections.forEach(([title, items]) => {
      const box = el("section");
      box.append(el("h3", "", title));
      const ul = el("ul");
      items.forEach((t) => ul.appendChild(el("li", "", t)));
      box.appendChild(ul);
      grid.appendChild(box);
    });
    out.replaceChildren(el("p", "tag", tag), el("p", "insights-headline", result.headline), grid);
    insightsShown = true;
  }

  function analyze() {
    if (!groups.length) return;
    $("insights-out").replaceChildren();
    const sourceName = source.kind === "live" ? "the sample dataset" : "your data";
    return withBusy($("insights-btn"), "Analyzing, up to 20 seconds…", async () => {
      try {
        const result = await postJson(cfg.insightsUrl, {
          source: source.kind === "live" ? "live" : "user",
          rows: groups.map((g) => ({ group: g.name, globalShare: g.global, biobankShare: g.biobank, status: g.status })),
        });
        renderInsights(result, `Generated by Gemini from ${sourceName} (${groups.length} groups)`);
      } catch (err) {
        renderInsights(offlineInsights(), `Gemini unavailable (${err.message}). Showing an analysis calculated from ${sourceName}.`);
      }
    });
  }

  function markInsightsStale() {
    if (!insightsShown) return;
    const tag = $("insights-out").querySelector(".tag");
    if (tag) tag.textContent = "The data has changed since this analysis. Run it again to update it.";
  }

  // ---------- Data editor ----------

  function renderEditor() {
    $("col-group").textContent = columns.group;
    $("col-global").textContent = columns.global;
    $("col-biobank").textContent = columns.biobank;
    $("col-status").textContent = columns.status;

    const field = (i, key, type, label) => {
      const input = el("input");
      input.type = type;
      if (type === "number") { input.step = "any"; input.min = "0"; input.inputMode = "decimal"; }
      input.value = Number.isFinite(editRows[i][key]) || typeof editRows[i][key] === "string" ? editRows[i][key] : "";
      input.dataset.index = i;
      input.dataset.key = key;
      input.setAttribute("aria-label", `${label}, row ${i + 1}`);
      const td = el("td", type === "number" ? "num" : "");
      td.appendChild(input);
      return td;
    };

    const rows = editRows.map((_, i) => {
      const tr = el("tr");
      const remove = el("button", "remove-btn", "Remove");
      remove.type = "button";
      remove.dataset.remove = i;
      remove.setAttribute("aria-label", `Remove row ${i + 1}`);
      const td = el("td");
      td.appendChild(remove);
      tr.append(
        field(i, "name", "text", columns.group),
        field(i, "global", "number", columns.global),
        field(i, "biobank", "number", columns.biobank),
        field(i, "status", "text", columns.status),
        td,
      );
      return tr;
    });
    $("editor-body").replaceChildren(...rows);
    validateEditor();
  }

  function validateEditor() {
    let invalid = 0;
    $("editor-body").querySelectorAll("tr").forEach((tr, i) => {
      const r = editRows[i];
      const blank = !r.name.trim() && String(r.global).trim() === "" && String(r.biobank).trim() === "";
      const ok = blank || isValidRow(r);
      if (!ok) invalid++;
      tr.querySelectorAll("input").forEach((input) => {
        const key = input.dataset.key;
        const bad = !blank && (
          (key === "name" && !r.name.trim()) ||
          (key === "global" && !(String(r.global).trim() !== "" && +r.global > 0)) ||
          (key === "biobank" && !(String(r.biobank).trim() !== "" && +r.biobank >= 0)));
        if (bad) input.setAttribute("aria-invalid", "true");
        else input.removeAttribute("aria-invalid");
      });
    });

    const sum = (k) => groups.reduce((s, g) => s + g[k], 0);
    const notes = [];
    if (invalid) notes.push(`${invalid} ${invalid === 1 ? "row is" : "rows are"} left out until ${invalid === 1 ? "it has" : "they have"} a name, a population share above 0 and a biobank share of 0 or more.`);
    if (groups.length) {
      const g = sum("global");
      const b = sum("biobank");
      notes.push(`Population shares add up to ${fmtPct(g)}; biobank shares add up to ${fmtPct(b)}.`);
      if (Math.round(g) !== 100 || Math.round(b) !== 100) notes.push("Shares usually add up to 100%.");
    }
    const check = $("data-check");
    check.textContent = notes.join(" ");
    check.classList.toggle("warn", invalid > 0 || (groups.length > 0 && (Math.round(sum("global")) !== 100 || Math.round(sum("biobank")) !== 100)));
  }

  function setDataset(rows, cols, src) {
    editRows = rows.map((r) => ({ ...r }));
    columns = { ...cols };
    source = src;
    renderEditor();
    applyData();
  }

  function applyData() {
    groups = deriveGroups(editRows);
    renderSourceLines();
    renderHero();
    renderDumbbell();
    renderRatio();
    renderDataTable();
    renderTakeaways();
    renderSimulator();
    validateEditor();
    select(groups.some((g) => g.name === selectedName) ? selectedName : groups[0]?.name, false);
    markInsightsStale();
  }

  function onEditorInput(e) {
    const input = e.target;
    if (!input.dataset.key) return;
    editRows[+input.dataset.index][input.dataset.key] = input.value;
    if (source.kind === "live") source = { kind: "user", label: "" };
    clearTimeout(updateTimer);
    updateTimer = setTimeout(applyData, 200);
  }

  function onEditorClick(e) {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    editRows.splice(+btn.dataset.remove, 1);
    if (source.kind === "live") source = { kind: "user", label: "" };
    renderEditor();
    applyData();
  }

  function addRow() {
    editRows.push({ name: "", global: "", biobank: "", status: "" });
    if (source.kind === "live") source = { kind: "user", label: "" };
    renderEditor();
    $("editor-body").lastElementChild.querySelector("input").focus();
  }

  function uploadCsv(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const table = tableFromCsv(String(reader.result));
        if (!deriveGroups(table.rows).length) throw new Error("No row had a group name and numeric shares.");
        setDataset(table.rows, table.columns, { kind: "user", label: file.name });
      } catch (err) {
        $("data-check").textContent = `Could not use ${file.name}: ${err.message}`;
        $("data-check").classList.add("warn");
      }
    };
    reader.readAsText(file);
  }

  function downloadCsv() {
    const lines = [[columns.group, columns.global, columns.biobank, columns.status]]
      .concat(editRows.filter(isValidRow).map((r) => [r.name.trim(), `${+r.global}%`, `${+r.biobank}%`, r.status.trim()]))
      .map((cells) => cells.map(csvField).join(","));
    const url = URL.createObjectURL(new Blob([lines.join("\n") + "\n"], { type: "text/csv" }));
    const a = el("a");
    a.href = url;
    a.download = "biobank-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Simulator & takeaways ----------

  function renderSimulator() {
    const input = $("sim-size");
    const out = $("sim-out");
    const raw = input.value.trim();
    const n = Number(raw);

    if (raw === "" || !groups.length) {
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
      `Reaching parity without discarding any data takes ${fmtInt(target)} genomes: ` +
      `${fmtInt(totalAdd)} more from under-sampled groups, ${fmtRatio(target / n)} today's size.`);

    const hr = el("tr");
    ["Group", "Today", "For parity", "To recruit"].forEach((h, i) => {
      const th = el("th", i ? "num" : "", h);
      th.scope = "col";
      hr.appendChild(th);
    });
    const thead = el("thead");
    thead.appendChild(hr);
    const tbody = el("tbody");
    [...rows].sort((a, b) => b.add - a.add).forEach((r) => {
      const tr = el("tr");
      [r.g.name, fmtInt(r.now), fmtInt(r.need), fmtInt(r.add)].forEach((v, i) =>
        tr.appendChild(el("td", i ? "num" : "", v)));
      tbody.appendChild(tr);
    });
    const table = el("table");
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
      await loadLive();
    } catch (err) {
      document.body.classList.remove("loading");
      $("headline").textContent = "OmniBank Blindspot Explorer";
      $("error-text").textContent = `${err.message} Check your connection and try again.`;
      $("error").hidden = false;
      return;
    }
    document.body.classList.remove("loading");
    liveColumns.status = liveColumns.status || "Status";
    setDataset(liveRows, liveColumns, { kind: "live", label: "" });
  }

  $("retry-btn").addEventListener("click", init);
  $("explain-btn").addEventListener("click", explain);
  $("insights-btn").addEventListener("click", analyze);
  $("sim-size").addEventListener("input", renderSimulator);
  $("editor-body").addEventListener("input", onEditorInput);
  $("editor-body").addEventListener("click", onEditorClick);
  $("add-row").addEventListener("click", addRow);
  $("csv-input").addEventListener("change", uploadCsv);
  $("download-csv").addEventListener("click", downloadCsv);
  $("reset-data").addEventListener("click", () => setDataset(liveRows, liveColumns, { kind: "live", label: "" }));
  init();
})();
