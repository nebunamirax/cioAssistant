export function claudeOrigin(value: string): URL | null {
  const address = value.trim();
  if (!/^https?:\/\/[^/?#\\\s]+\/?$/i.test(address) || !URL.canParse(address)) return null;
  const url = new URL(address);
  if (url.username || url.password || url.href !== `${url.origin}/`) return null;
  if (url.protocol === "https:") return url;
  if (url.protocol !== "http:") return null;

  const loopback = url.hostname === "localhost" || url.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(url.hostname);
  return loopback ? url : null;
}
