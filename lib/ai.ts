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

const filledCount = (lead: any) =>
  [
    String(lead.description || "").trim().length >= 20 && !/^not provided$/i.test(String(lead.description).trim()),
    ...[lead.budget, lead.timeline, lead.industry, lead.company, lead.company_size, lead.website, lead.country, lead.job_title].map((v) => String(v ?? "").trim() !== ""),
  ].filter(Boolean).length;

const byScore = (n: number) => (n >= 80 ? "high_fit" : n >= 50 ? "medium_fit" : "low_fit");

export async function qualifyLead(lead: any) {
  const prompt = `
You are an experienced B2B sales qualification analyst.

Evaluate this lead using ONLY the information supplied. Do not invent facts.

Lead information:
Contact: ${lead.contact_name}
Email: ${lead.email}
Company: ${lead.company}
Job title: ${lead.job_title}
Industry: ${lead.industry}
Company size: ${lead.company_size}
Country: ${lead.country}
Website: ${lead.website}
Budget: ${lead.budget}
Timeline: ${lead.timeline}
Business need: ${lead.description}

IMPORTANT CONTEXT
The lead form only collects the fields above. Things the form never asks for (the decision-maker's identity, current tools,
procurement process, evaluation criteria) are EXPECTED to be unknown. Do NOT lower the score or choose needs_review because of
them; at most mention them as optional follow-up questions.

SCORING RUBRIC (total 0-100)
- Business need: clarity and fit (0-30)
- Budget stated (0-20)
- Timeline / urgency (0-20)
- Company profile: industry, size, website, country (0-20)
- Contact relevance and seniority (0-10)

CATEGORY (must be exactly one of: high_fit, medium_fit, low_fit, needs_review)
- 80-100 = high_fit, 50-79 = medium_fit, 0-49 = low_fit
- Use needs_review ONLY when the business need is missing or vague AND at least two of budget, timeline, industry and company are also empty.

Return valid JSON only, using this exact structure:
{
  "score": 0,
  "category": "medium_fit",
  "reasoning": "Short explanation",
  "missing_information": ["optional follow-up 1"],
  "recommended_next_action": "Specific next action",
  "human_review_required": false
}`;
  const out = parseJson(await chat(
    "You are a careful but fair B2B lead qualification assistant. Return valid JSON only. The category must be one of high_fit, medium_fit, low_fit, needs_review.",
    prompt, 0.2, 2000));
  const score = Math.max(0, Math.min(100, Math.round(Number(out.score) || 0)));
  let category = normalizeCategory(out.category, out.score);
  // Guard rails against over-cautious or over-optimistic answers, based on how complete the form actually is.
  const filled = filledCount(lead);
  if (category === "needs_review" && filled >= 6) category = byScore(score);
  if (filled <= 2 && (category === "high_fit" || category === "medium_fit")) category = "needs_review";
  return {
    score,
    category,
    reasoning: String(out.reasoning || "").trim(),
    missing_information: Array.isArray(out.missing_information) ? out.missing_information.map(String) : [],
    recommended_next_action: String(out.recommended_next_action || "").trim(),
    human_review_required: category === "needs_review",
  };
}

export const DECISIONS = ["prioritize_sales", "request_information", "human_review", "hold_low_fit"];

// Routing POLICY (deterministic, so results are predictable): the AI explains the decision, the rules choose the route.
export function routeFor(qual: { score: number; category: string }) {
  if (qual.category === "high_fit") return "prioritize_sales";
  if (qual.category === "medium_fit") return Number(qual.score) >= 65 ? "prioritize_sales" : "request_information";
  if (qual.category === "low_fit") return "hold_low_fit";
  return "human_review";
}

export async function decideRoute(lead: any, qual: any, memories: any[]) {
  const route = routeFor(qual);
  const basis = `Score ${qual.score} (${String(qual.category).replace(/_/g, " ")}) → ${route.replace(/_/g, " ")}`;
  const mem = memories.length
    ? memories.map((m) => `- ${m.category} (score ${m.score}), company size ${m.company_size || "n/a"}: ${m.recommended_next_action}`).join("\n")
    : "No similar historical outcomes available.";
  let reasoning = String(qual.reasoning || basis), next = String(qual.recommended_next_action || "");
  try {
    const out = parseJson(await chat("You are a concise lead routing agent. Return valid JSON only.", `
A routing policy has already chosen the route "${route}" for this lead (${basis}).
Write a 1-2 sentence explanation for a sales manager and ONE specific next action that fits this route.

Lead: ${lead.company} (${lead.industry || "industry unknown"}), need: ${lead.description}
Qualification reasoning: ${qual.reasoning}
Optional follow-ups: ${(qual.missing_information || []).join("; ") || "none"}
Similar historical outcomes (anonymised):
${mem}

Return valid JSON only: {"reasoning":"...","next_action":"..."}`, 0.2, 1200));
    reasoning = String(out.reasoning || reasoning).trim(); next = String(out.next_action || next).trim();
  } catch { /* the route does not depend on this explanation */ }
  return { decision_category: route, reasoning, next_action: next, route_basis: basis };
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
