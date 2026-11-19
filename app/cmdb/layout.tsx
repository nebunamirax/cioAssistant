import { requireMember } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CmdbLayout({ children }: { children: React.ReactNode }) {
  await requireMember("DSI");
  return children;
}
