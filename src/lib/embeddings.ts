import "server-only";

/**
 * Bio embeddings via Voyage AI (Anthropic's recommended embeddings
 * partner — the Anthropic API itself has no embeddings endpoint).
 * voyage-3.5 at 1024 dimensions, matching clients.embedding vector(1024).
 * Returns null when the key isn't configured or the input is empty; the
 * scoring engine renormalizes around a missing semantic component.
 */

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3.5";
export const EMBEDDING_DIMENSIONS = 1024;

export async function embedText(text: string): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY;
  const input = text.trim();
  if (!key || !input) return null;

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      input: [input.slice(0, 8000)],
      input_type: "document",
      output_dimension: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const embedding = json.data[0]?.embedding;
  if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error("Voyage returned an unexpected embedding shape");
  }
  return embedding;
}
