export function parseListInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;|]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function joinLines(values: string[]) {
  return values.join('\n');
}