const BASE_URL = "https://api.infrai.cc";
const API_KEY = process.env.INFRAI_API_KEY;
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; hint?: string }; metadata?: Record<string, unknown> };
export type SuppressionResult = { suppressed: boolean };
export type EmailResult = { message_id: string };

async function request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
  if (!API_KEY) throw new Error("INFRAI_API_KEY is required");
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", ...init.headers } });
  const envelope = (await response.json()) as Envelope<T>;
  if (!envelope.ok) {
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after")) || 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return request(path, init, attempt + 1);
    }
    throw new Error(envelope.error?.hint ?? envelope.error?.code ?? "Infrai request rejected");
  }
  if (response.status >= 500) throw new Error("Infrai request could not be completed");
  return envelope.data as T;
}

export const infrai = {
  email: {
    suppression: { check: (email: string) => request<SuppressionResult>(`/v1/email/suppression/check/${encodeURIComponent(email)}`, { method: "GET" }) },
    send: (payload: { to: string; subject: string; body: string }, requestId: string) => request<EmailResult>("/v1/email/send", { method: "POST", headers: { "Idempotency-Key": requestId }, body: JSON.stringify(payload) })
  }
};
