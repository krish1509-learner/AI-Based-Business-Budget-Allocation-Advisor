export async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }
    throw new Error('Server returned an empty response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    if (trimmed.startsWith('<')) {
      throw new Error(
        response.status >= 500
          ? 'The AI advisor service timed out or is temporarily unavailable. Please retry in a moment.'
          : 'API endpoint returned an HTML page instead of JSON. Please refresh and try again.'
      );
    }
    throw new Error('Received an invalid response format from the server.');
  }

  if (!response.ok) {
    const errObj = parsed as { error?: string };
    throw new Error(errObj?.error || `Request failed with status ${response.status}.`);
  }

  return parsed as T;
}
