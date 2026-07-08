/** Parse fetch responses safely when Next/Vercel returns HTML or plain text errors. */
export async function readJsonResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  response: Response
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 180);
    throw new Error(
      response.ok
        ? "Server returned an invalid JSON response."
        : snippet || `Request failed (${response.status}).`
    );
  }
}
