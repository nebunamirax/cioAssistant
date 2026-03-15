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
    <aside className="min-h-screen w-72 border-r border-slate-800 bg-slate-950 px-4 py-5 text-slate-100">
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workbench</p>
        <h1 className="mt-2 text-lg font-semibold">Assistant DSI</h1>
        <p className="mt-1 text-sm text-slate-400">Pilotage dense, édition contextuelle, moins de navigation.</p>
      </div>
      <nav className="space-y-1.5">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
