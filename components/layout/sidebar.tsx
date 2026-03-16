"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const sections = [
  {
    label: "Pilotage",
    items: [
      ["Accueil", "/"],
      ["Actions", "/actions"],
      ["Projets", "/projects"],
      ["Contrats", "/contracts"],
      ["Prestataires", "/vendors"],
      ["Budget", "/budget"]
    ]
  },
  {
    label: "Flux",
    items: [
      ["Communications", "/communications"],
      ["Revue IA", "/ai-reviews"],
      ["Reunions", "/meetings"],
      ["Emails", "/emails"]
    ]
  },
  {
    label: "Configuration",
    items: [["Parametres", "/settings"]]
  }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/92 px-3 py-2.5 backdrop-blur md:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workbench</p>
          <p className="text-sm font-semibold text-slate-950">Assistant DSI</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          Menu
        </button>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/45 md:hidden"
        />
      ) : null}

      <aside
        id="mobile-navigation"
        className={[
          "fixed inset-y-0 left-0 z-40 w-[17.5rem] border-r border-slate-800 bg-[linear-gradient(180deg,#020617_0%,#0b1120_100%)] px-3 py-4 text-slate-100 shadow-2xl transition-transform md:sticky md:top-0 md:block md:min-h-screen md:w-[18.5rem] md:translate-x-0 md:px-4 md:py-5",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        ].join(" ")}
      >
        <div className="mb-4 rounded-2xl border border-slate-800/90 bg-slate-900/70 p-3.5 md:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 md:text-[11px]">Workbench</p>
          <h1 className="mt-1.5 text-base font-semibold md:mt-2 md:text-lg">Assistant DSI</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">Un seul point d&apos;entree pour piloter, creer et suivre.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Mode</p>
              <p className="mt-1 text-xs font-medium text-slate-200">Solo</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">UI</p>
              <p className="mt-1 text-xs font-medium text-slate-200">Workbench</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Acces</p>
              <p className="mt-1 text-xs font-medium text-slate-200">Local</p>
            </div>
          </div>
        </div>
        <nav className="space-y-4">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.label}
              </p>
              <div className="space-y-1">
                {section.items.map(([label, href]) => {
                  const isActive = href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <Link
                      key={href}
                      href={href}
                      className={[
                        "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
                      ].join(" ")}
                    >
                      <span>{label}</span>
                      <span
                        className={[
                          "h-2 w-2 rounded-full",
                          isActive ? "bg-slate-950" : "bg-slate-700"
                        ].join(" ")}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
