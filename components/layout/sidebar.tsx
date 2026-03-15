import Link from "next/link";

const links = [
  ["Dashboard", "/"],
  ["Actions", "/actions"],
  ["Projets", "/projects"],
  ["Contrats", "/contracts"],
  ["Prestataires", "/vendors"],
  ["Budget", "/budget"],
  ["Communications", "/communications"],
  ["Réunions", "/meetings"],
  ["Emails", "/emails"],
  ["IA / Paramètres", "/settings/ai"],
  ["Paramètres", "/settings/integrations"]
] as const;

export function Sidebar() {
  return (
    <aside className="min-h-screen w-64 border-r border-slate-200 bg-white p-4">
      <h1 className="mb-6 text-lg font-semibold">Assistant DSI</h1>
      <nav className="space-y-2">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
