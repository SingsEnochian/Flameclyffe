import type { Metadata } from "next";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: {
    default: "The Luna Who Called Down the Moon",
    template: "%s · Moonmere Archive"
  },
  description:
    "The emerald-and-gold living wiki for The Luna Who Called Down the Moon series.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <SiteShell>
          <div id="main-content" tabIndex={-1}>{children}</div>
        </SiteShell>
      </body>
    </html>
  );
}
