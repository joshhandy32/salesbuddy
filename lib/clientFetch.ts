// Small client-side fetch helper with a hard timeout, used by the tools so a
// slow/hanging API call surfaces a message instead of spinning forever.

export class TimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "TimeoutError";
  }
}

/**
 * Fetch JSON with a timeout (default 30s). Throws TimeoutError on timeout,
 * or Error(message) using the server's `error` field on a non-2xx response.
 */
export async function requestJSON<T = unknown>(
  method: string,
  url: string,
  body?: unknown,
  timeoutMs = 30000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let data: unknown = {};
    try {
      data = await res.json();
    } catch {
      // non-JSON response; leave data as {}
    }
    if (!res.ok) {
      const msg =
        (data as { error?: string })?.error || "Request failed. Please try again.";
      throw new Error(msg);
    }
    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Shared user-facing messages.
export const TIMEOUT_MSG =
  "This is taking longer than usual — the AI might be busy. Try again in a moment.";
