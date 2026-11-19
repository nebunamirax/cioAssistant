export function toDatetimeLocal(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : null;
}
