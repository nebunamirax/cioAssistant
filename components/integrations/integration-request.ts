export async function integrationRequest<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, body === undefined ? undefined : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "L’opération a échoué.");
  return payload.data;
}

export type IntegrationProject = { id: string; title: string };
