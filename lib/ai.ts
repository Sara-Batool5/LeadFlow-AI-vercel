// Groq (OpenAI-compatible REST API). Runs server-side only — the key never reaches the browser.
export const modelName = () => process.env.GROQ_MODEL || "openai/gpt-oss-120b";

async function chat(system: string, user: string, temperature: number, maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set in the environment variables.");
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: modelName(), temperature, max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("The AI model returned an empty response.");
      return String(text);
    }
    lastErr = `Groq API error ${res.status}: ${(await res.text()).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break; // only retry rate limits / server errors
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(lastErr);
}

function parseJson(text: string) {
  const t = text.replace(/```json|```/gi, "").trim();
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("The AI response did not contain valid JSON.");
  return JSON.parse(t.slice(s, e + 1));
}

export const CATEGORIES = ["high_fit", "medium_fit", "low_fit", "needs_review"];

export function normalizeCategory(category: any, score?: any) {
  const c = String(category || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (CATEGORIES.includes(c)) return c;
  if (["high", "highfit"].includes(c)) return "high_fit";
  if (["medium", "mediumfit"].includes(c)) return "medium_fit";
  if (["low", "lowfit"].includes(c)) return "low_fit";
  const n = Number(score);
  if (Number.isFinite(n) && score !== null && score !== undefined && score !== "") return n >= 80 ? "high_fit" : n >= 50 ? "medium_fit" : "low_fit";
  return "needs_review";
}

export async function qualifyLead(lead: any) {
  const prompt = `
You are an experienced B2B sales qualification analyst.

Evaluate this lead using only the information supplied.
Do not invent facts.

Lead information:
Contact: ${lead.contact_name}
Email: ${lead.email}
Company: ${lead.company}
Industry: ${lead.industry}
Company size: ${lead.company_size}
Country: ${lead.country}
Website: ${lead.website}
Budget: ${lead.budget}
Timeline: ${lead.timeline}
Business need: ${lead.description}

Return valid JSON only, using this exact structure:

{
  "score": 0,
  "category": "needs_review",
  "reasoning": "Short explanation",
  "missing_information": ["item 1", "item 2"],
  "recommended_next_action": "Specific next action",
  "human_review_required": true
}

IMPORTANT: category MUST be exactly one of: high_fit, medium_fit, low_fit, needs_review
(lowercase, underscores, never "High" or "Needs Review").

SCORING: 80-100 high_fit, 50-79 medium_fit, 0-49 low_fit.
Use needs_review when essential information is insufficient for a reliable decision.
Do not inflate the score. Set human_review_required to true when important information is missing or the assessment is uncertain.`;
  const out = parseJson(await chat(
    "You are a careful B2B lead qualification assistant. Return valid JSON only. The category must be one of high_fit, medium_fit, low_fit, needs_review.",
    prompt, 0.2, 1500));
  const score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
  return {
    score,
    category: normalizeCategory(out.category, out.score),
    reasoning: String(out.reasoning || "").trim(),
    missing_information: Array.isArray(out.missing_information) ? out.missing_information.map(String) : [],
    recommended_next_action: String(out.recommended_next_action || "").trim(),
    human_review_required: out.human_review_required !== false,
  };
}

export const DECISIONS = ["prioritize_sales", "request_information", "human_review", "hold_low_fit"];

export async function decideRoute(lead: any, qual: any, memories: any[]) {
  const mem = memories.length
    ? memories.map((m) => `- ${m.category} (score ${m.score}), company size ${m.company_size || "n/a"}: ${m.recommended_next_action}`).join("\n")
    : "No similar historical outcomes available.";
  const prompt = `
You are the routing agent of a B2B lead desk. Choose ONE route for this lead.

Lead: ${lead.company} (${lead.industry || "industry unknown"}), need: ${lead.description}
Qualification: score ${qual.score}, category ${qual.category}
Reasoning: ${qual.reasoning}
Missing information: ${(qual.missing_information || []).join("; ") || "none"}
Similar historical outcomes (anonymised):
${mem}

Routes:
- prioritize_sales: strong fit with enough information; assign an owner and prepare a follow-up
- request_information: promising but important details are missing
- human_review: uncertain or ambiguous; a person must decide
- hold_low_fit: clearly poor fit

Return valid JSON only:
{"decision_category":"human_review","reasoning":"short explanation","next_action":"specific next action"}`;
  const out = parseJson(await chat("You are a cautious lead routing agent. Return valid JSON only.", prompt, 0.1, 1200));
  const decision = String(out.decision_category || "").trim().toLowerCase();
  return {
    decision_category: DECISIONS.includes(decision) ? decision : "human_review",
    reasoning: String(out.reasoning || "").trim(),
    next_action: String(out.next_action || "").trim(),
  };
}

export async function draftEmail(lead: any, qual: any, purpose: string, tone: string, extra: string) {
  const qualCtx = qual
    ? `Latest qualification:\nScore: ${qual.score}\nCategory: ${qual.category}\nReasoning: ${qual.reasoning}\nRecommended next action: ${qual.recommended_next_action}`
    : "No saved AI qualification result is available.";
  const prompt = `
You are a professional B2B sales communication specialist.

Write a personalized follow-up email using the lead information below.

LEAD INFORMATION
Contact name: ${lead.contact_name || "there"}
Company: ${lead.company || "their organization"}
Job title: ${lead.job_title || "Not provided"}
Industry: ${lead.industry || "Not provided"}
Website: ${lead.website || "Not provided"}
Business need: ${lead.description || "Not provided"}
Budget: ${lead.budget || "Not provided"}
Timeline: ${lead.timeline || "Not provided"}
Assigned sales owner: ${lead.assigned_owner || "the sales team"}

${qualCtx}

EMAIL PURPOSE
${purpose}

TONE
${tone}

ADDITIONAL INSTRUCTIONS
${extra || "No additional instructions."}

REQUIREMENTS
1. Write a useful, natural, professional B2B email.
2. Personalize it using the supplied information.
3. Never invent services, prices, promises, meetings, facts, or company details.
4. Do not claim that a meeting or call has already happened.
5. Do not invent a sender's name or job title.
6. Use a clear subject line.
7. Keep the email concise, usually 100-180 words.
8. Include a clear but polite next step.
9. If information is missing, do not pretend it is known.
10. Return only the subject and email body in this format:

SUBJECT: [subject line]

BODY:
[email body]`;
  const text = await chat("You write accurate, personalized, professional B2B sales emails.", prompt, 0.5, 1500);
  const sub = text.match(/SUBJECT:\s*(.*)/i);
  const body = text.match(/BODY:\s*([\s\S]*)$/i);
  return { subject: (sub?.[1] || "Follow-up").trim(), body: (body?.[1] || text).trim() };
}
