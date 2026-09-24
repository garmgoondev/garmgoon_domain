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
      // 추론 모델이 thinking에 토큰을 다 써서 본문이 비는 것을 막는다. 요약·채점에는 추론이 필요 없다.
      reasoning: { enabled: false },
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (!text) {
    const reasoning = choice?.message?.reasoning?.length || 0;
    throw new Error(
      `OpenRouter 빈 응답 (finish_reason: ${choice?.finish_reason || data.error?.message || "?"}, 추론 ${reasoning}자, 출력 토큰 ${data.usage?.completion_tokens ?? "?"}/${maxTokens}, ${data.provider || ""})`,
    );
  }
  return extractJSON(text);
}
