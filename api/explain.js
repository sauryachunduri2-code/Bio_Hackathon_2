// Vercel serverless function: turns one group's live sheet numbers into a
// plain-language explanation with Gemini. The API key stays server-side.
import { generate, requirePost } from "./_gemini.js";
import { cleanMetrics, metricText } from "./insights.js";

export default async function handler(req, res) {
  if (!requirePost(req, res)) return;

  const { group, status, globalShare, biobankShare, ratio, gap, metrics } = req.body || {};
  const sampleMetrics = metricText(cleanMetrics(metrics));
  if (!group || ![globalShare, biobankShare, ratio, gap].every(Number.isFinite)) {
    return res.status(400).json({ error: "Missing group data" });
  }

  const prompt = [
    "You are explaining a genomic-equity finding to a busy clinician and a health policymaker.",
    "Use only the numbers given below. Do not invent statistics.",
    `Group: ${String(group).slice(0, 80)}`,
    `Share of global population: ${globalShare}%`,
    `Share of biobank genomes: ${biobankShare}%`,
    `Representation ratio (biobank share / population share): ${ratio}`,
    `Gap: ${gap} percentage points`,
    `Status label: ${String(status || "").slice(0, 80)}`,
    sampleMetrics ? `Per-group means of sample-level columns: ${sampleMetrics}` : "",
    "In 3 short sentences of plain language, explain what this blindspot means for diagnosis and treatment of these patients, and one policy action that would help.",
    "Do not give medical advice to individuals.",
  ].join("\n");

  try {
    return res.status(200).json({ text: await generate(prompt) });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message });
  }
}
