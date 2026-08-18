import { config } from "@/lib/config";

/**
 * SSE abstraction for streaming AI (SLM/LLM) responses into the UI.
 * Model inference itself lives entirely on the backend.
 */
export function streamAIResponse(
  prompt: string,
  onToken: (token: string) => void,
  onDone?: () => void,
): () => void {
  const controller = new AbortController();

  fetch(`${config.apiUrl}/ai/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        onToken(decoder.decode(value));
      }
      onDone?.();
    })
    .catch(() => {
      /* stream aborted or failed */
    });

  return () => controller.abort();
}
