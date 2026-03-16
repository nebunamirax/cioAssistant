import { type ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:mb-3">{title}</h2>
      {children}
    </section>
  );
}
