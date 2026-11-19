import { entraConfig } from "@/lib/auth/entra";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { PasswordField } from "./password-field";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const microsoftEnabled = Boolean(entraConfig());

  return (
    <section className="login-panel">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
        <span className="pilot-brand-mark"><WorkspaceIcon name="mark" className="h-5 w-5" /></span> Pilotage DSI
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Connexion</h1>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Connexion impossible. Vérifiez vos accès ou réessayez.</p>}
      {microsoftEnabled && <a className="button-primary mt-5 w-full" href="/api/auth/entra/start">Se connecter avec Microsoft 365</a>}
      <form action="/api/auth/local" method="post" className={`mt-5 space-y-4 ${microsoftEnabled ? "border-t border-slate-200 pt-5" : ""}`}>
        <PasswordField />
        <button className={`w-full ${microsoftEnabled ? "button-secondary" : "button-primary"}`} type="submit">Se connecter</button>
      </form>
    </section>
  );
}
