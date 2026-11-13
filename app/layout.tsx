import type { Metadata } from "next";
import "./globals.css";
import { currentMember } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Pilotage DSI",
  description: "Projets, actions et services de la DSI"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  return (
    <html lang="fr">
      <body>
        {member ? (
          <WorkspaceShell role={member.role} name={member.name}>{children}</WorkspaceShell>
        ) : (
          <main id="main" tabIndex={-1} className="login-main">{children}</main>
        )}
      </body>
    </html>
  );
}
