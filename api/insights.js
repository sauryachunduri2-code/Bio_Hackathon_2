// Vercel serverless function: AI analysis of a whole dataset (the live sheet or the user's edits).
// Returns structured findings so the page can lay them out; numbers come only from the request.
import { generate, requirePost } from "./_gemini.js";

const MAX_ROWS = 50;
const MAX_TEXT = 80;
const SECTIONS = ["findings", "clinicalRisks", "dataQuality", "recommendations"];

function cleanRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_ROWS) return null;
  const out = [];
  for (const r of rows) {
    const group = String(r?.group ?? "").trim().slice(0, MAX_TEXT);
    const globalShare = Number(r?.globalShare);
    const biobankShare = Number(r?.biobankShare);
    if (!group || !Number.isFinite(globalShare) || !Number.isFinite(biobankShare)) return null;
    if (globalShare <= 0 || biobankShare < 0) return null;
    out.push({
      group,
      globalShare,
      biobankShare,
      ratio: +(biobankShare / globalShare).toFixed(2),
      status: String(r?.status ?? "").trim().slice(0, MAX_TEXT),
    });
  }
  return out;
}

function cleanList(value) {
  return (Array.isArray(value) ? value : [])
    .filter((s) => typeof s === "string" && s.trim())
    .slice(0, 5)
    .map((s) => s.trim().slice(0, 400));
}

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const rows = cleanRows(req.body?.rows);
  if (!rows) return res.status(400).json({ error: `Send 1–${MAX_ROWS} rows with a group name and numeric shares` });
  const source = req.body?.source === "user" ? "user-provided" : "illustrative sample";

  const table = rows
    .map((r) => `- ${r.group}: ${r.globalShare}% of global population, ${r.biobankShare}% of biobank genomes, ratio ${r.ratio}×${r.status ? `, status "${r.status}"` : ""}`)
    .join("\n");

  const prompt = [
    "You are a genomic-equity analyst writing for clinicians and health policymakers.",
    `Analyze this ${source} dataset describing how ancestry groups are represented in a genomic biobank.`,
    "Representation ratio = biobank share / population share; 1× is parity, below 1× is under-sampled.",
    "",
    table,
    "",
    "Rules: use only the numbers above, never invent statistics or cite figures that are not listed;",
    "you may name well-established mechanisms (reference-panel gaps, variant misclassification, polygenic risk score transferability) without quoting numbers for them;",
    "if the shares do not sum to about 100% or a row looks implausible, say so under dataQuality.",
    "",
    "Return JSON with exactly these keys:",
    '{"headline": "one sentence, at most 25 words",',
    ' "findings": ["2-4 short sentences about the representation pattern"],',
    ' "clinicalRisks": ["2-4 short sentences on what the gaps mean for diagnosis and treatment"],',
    ' "dataQuality": ["0-3 short notes on problems or limits in this dataset"],',
    ' "recommendations": ["2-4 concrete actions for policymakers or biobank leaders"]}',
  ].join("\n");

  try {
    const text = await generate(prompt, { json: true });
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Gemini returned malformed JSON" });
    }
    const result = { headline: String(parsed.headline || "").trim().slice(0, 300) };
    for (const key of SECTIONS) result[key] = cleanList(parsed[key]);
    if (!result.headline && SECTIONS.every((k) => !result[k].length)) {
      return res.status(502).json({ error: "Gemini returned no insights" });
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message });
  }
}
