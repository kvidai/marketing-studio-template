export function parseLooseJson<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Model returned empty output");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
    if (fenced) {
      return JSON.parse(fenced) as T;
    }

    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(trimmed.slice(first, last + 1)) as T;
    }

    throw new Error("Could not find JSON object in model output");
  }
}
