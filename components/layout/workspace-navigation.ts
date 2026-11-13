import type { WorkspaceIconName } from "@/components/ui/workspace-icon";

type WorkspaceLink = { label: string; href: string; icon: WorkspaceIconName; shared?: boolean };

export const primaryLinks: WorkspaceLink[] = [
  { label: "Aujourd’hui", href: "/", icon: "home" },
  { label: "Roadmap", href: "/roadmap", icon: "roadmap", shared: true },
  { label: "Projets", href: "/projects", icon: "folder" },
  { label: "Actions", href: "/actions", icon: "check", shared: true },
  { label: "Revue hebdo", href: "/weekly-review", icon: "review", shared: true },
  { label: "Assistant", href: "/assistant", icon: "sparkles" }
];

export const toolLinks: WorkspaceLink[] = [
  { label: "Stratégie", href: "/strategy", icon: "flag" },
  { label: "Équipe", href: "/team", icon: "check" },
  { label: "Services", href: "/services", icon: "folder", shared: true },
  { label: "Risques", href: "/risks", icon: "alert" },
  { label: "Décisions", href: "/decisions", icon: "decision" },
  { label: "Rapports", href: "/reports", icon: "document" },
  { label: "E-mails", href: "/emails", icon: "mail" },
  { label: "Réunions", href: "/meetings", icon: "calendar" },
  { label: "Contrats", href: "/contracts", icon: "document" },
  { label: "Prestataires", href: "/vendors", icon: "folder" },
  { label: "Budget", href: "/budget", icon: "list" },
  { label: "Communications", href: "/communications", icon: "mail" }
];

export const settingsLink: WorkspaceLink = { label: "Paramètres", href: "/settings", icon: "settings" };
export const suggestionsLink: WorkspaceLink = { label: "Suggestions à valider", href: "/ai-reviews", icon: "sparkles" };

export function workspaceLinks(links: WorkspaceLink[], role: string) {
  return role === "DSI" ? links : links.filter((link) => link.shared);
}
