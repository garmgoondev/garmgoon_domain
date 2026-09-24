const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";

export function hasLLM(env) {
  return Boolean(env.OPENROUTER_API_KEY);
}

export function modelName(env) {
  return env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

function extractJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error(`JSON 파싱 실패: ${cleaned.slice(0, 120)}`);
  }
}

// OpenRouter에 JSON 응답을 요청한다. 키가 없으면 null을 반환하고 호출부가 대체 동작을 한다.
export async function chatJSON(env, { system, user, maxTokens = 1500, temperature = 0.4 }) {
  if (!hasLLM(env)) return null;
  const res = await fetch(`${env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      "HTTP-Referer": "https://garmgoon.com",
      "X-Title": "garmgoon",
    },
    body: JSON.stringify({
      model: modelName(env),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`OpenRouter 빈 응답: ${JSON.stringify(data).slice(0, 200)}`);
  return extractJSON(text);
}
