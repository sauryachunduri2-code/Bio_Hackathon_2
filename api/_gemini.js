// Shared Gemini client for the serverless functions. Files starting with "_" are not routes on Vercel.
// Env vars: GEMINI_API_KEY (required), GEMINI_MODEL (optional, tried first).

export class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Measured on this key: these answered in 3-8s while newer flash models queued for minutes.
// Tried in order; a model that is overloaded, over quota or slow hands off to the next.
const DEFAULT_CHAIN = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"];
// Stay under the page's 30s wait so a slow Gemini still ends in an answer or a clear error.
const DEADLINE_MS = 25000;
const PER_CALL_MS = 15000;

// Overload, quota and timeout errors are worth trying again on the fallback model.
const isTransient = (status, message) =>
  status === 429 || status === 503 || status === 504 || /high demand|overloaded|quota|try again|timed? ?out/i.test(message);

async function call(model, key, body, timeoutMs) {
  let r;
  try {
    r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
  } catch (err) {
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
    return { ok: false, status: timedOut ? 504 : 502, message: timedOut ? `${model} timed out` : err.message };
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, status: r.status, message: data.error?.message || `Gemini HTTP ${r.status}` };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("").trim();
  if (!text) return { ok: false, status: 502, message: "Empty response from Gemini" };
  return { ok: true, text };
}

export async function generate(prompt, { json = false } = {}) {
  // Trim: keys pasted from the clipboard often carry a trailing newline.
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new GeminiError("Gemini is not configured", 503);

  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (json) body.generationConfig = { responseMimeType: "application/json" };

  const chain = [...new Set([process.env.GEMINI_MODEL, ...DEFAULT_CHAIN].filter(Boolean))];
  const deadline = Date.now() + DEADLINE_MS;
  let result = { ok: false, status: 504, message: "Gemini did not answer in time" };
  for (const model of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 2000) break;
    result = await call(model, key, body, Math.min(PER_CALL_MS, remaining));
    if (result.ok || !isTransient(result.status, result.message)) break;
  }
  if (!result.ok) {
    throw new GeminiError(result.message, isTransient(result.status, result.message) ? 503 : 502);
  }
  return result.text;
}

export function requirePost(req, res) {
  if (req.method === "POST") return true;
  res.setHeader("Allow", "POST");
  res.status(405).json({ error: "Use POST" });
  return false;
}
