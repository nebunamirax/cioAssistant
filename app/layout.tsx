import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "Assistant DSI",
  description: "Cockpit de pilotage personnel pour DSI"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-h-screen w-full p-3 sm:p-4 lg:p-5 xl:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
