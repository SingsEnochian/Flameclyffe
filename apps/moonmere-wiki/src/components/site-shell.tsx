import type { ReactNode } from "react";
import { SidebarNav } from "@/components/sidebar-nav";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <SidebarNav />
      <main className="site-main">{children}</main>
    </div>
  );
}
